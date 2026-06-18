'use strict';

// ── Platform config ───────────────────────────────────────────────────────────

HumanChat.init({
  title:         'Human Chat',
  position:      'left',
  filterBots:    true,
  filenamePrefix: 'human-chat',
  meetingLabel:  () => {
    const code = location.pathname.replace(/^\//, '').split('/')[0] || 'meeting';
    return code.replace(/[/\\:*?"<>|]/g, '-');
  },
});

// ── Google Meet DOM parsing ───────────────────────────────────────────────────
//
// Meet uses obfuscated, frequently-changing class names. We anchor to
// `data-message-id` for individual messages, then use a cascade of fallback
// strategies to extract sender and text.
//
// Meet groups consecutive messages from the same sender and only shows the
// sender name on the first in the group — lastSender carries it forward.

const MSG_SELECTOR = '[data-message-id]';
let lastSender = '';

function extractSenderAndText(el) {
  let sender = '';
  let text   = '';

  // Text lives in div[jsname="dTKtvb"] in current Meet DOM
  const textEl = el.querySelector('[jsname="dTKtvb"]');
  if (textEl) text = textEl.textContent.trim();

  // Fallbacks for older/alternate Meet DOM
  if (!text) {
    const dirAutos = Array.from(el.querySelectorAll('[dir="auto"]'));
    if (dirAutos.length > 0) text = dirAutos[dirAutos.length - 1].textContent.trim();
  }
  if (!text) {
    const roleTexts = el.querySelectorAll('[role="text"]');
    if (roleTexts.length > 0)
      text = Array.from(roleTexts).map(e => e.textContent.trim()).join(' ').trim();
  }

  // Sender lives in the group header outside [data-message-id].
  // Structure: [data-message-id] → messages container → group root
  // Group root contains: [sender div][jsname="biJjHb" timestamp div]
  const groupRoot = el.parentElement?.parentElement;
  if (groupRoot) {
    const timestamp = groupRoot.querySelector('[jsname="biJjHb"]');
    if (timestamp?.previousElementSibling) {
      sender = timestamp.previousElementSibling.textContent.trim();
    }
  }

  // Fallback: leaf <span> (older Meet DOM)
  if (!sender) {
    for (const span of el.querySelectorAll('span')) {
      const t = span.textContent.trim();
      if (span.children.length === 0 && t && t.length < 80 &&
          !/^\d{1,2}:\d{2}(\s*(AM|PM))?$/i.test(t)) {
        sender = t;
        break;
      }
    }
  }

  if (!sender) sender = lastSender;

  if (!text) {
    text = el.textContent.trim()
      .replace(sender, '')
      .replace(/\d{1,2}:\d{2}\s*(AM|PM)?/gi, '')
      .trim();
  }

  if (sender) lastSender = sender;
  return { sender, text };
}

function handleMessageNode(el) {
  const id = el.getAttribute('data-message-id');
  const { sender, text } = extractSenderAndText(el);
  if (text) HumanChat.recordMessage(sender, text, id);
}

// ── Observer ──────────────────────────────────────────────────────────────────

let meetObserver = null;

function startObserver() {
  if (meetObserver) meetObserver.disconnect();
  document.querySelectorAll(MSG_SELECTOR).forEach(handleMessageNode);
  meetObserver = new MutationObserver(mutations => {
    for (const mut of mutations) {
      for (const node of mut.addedNodes) {
        if (node.nodeType !== Node.ELEMENT_NODE) continue;
        if (node.matches?.(MSG_SELECTOR))
          handleMessageNode(node);
        else
          node.querySelectorAll?.(MSG_SELECTOR).forEach(handleMessageNode);
      }
    }
  });
  meetObserver.observe(document.body, { childList: true, subtree: true });
}

// ── Meeting-end patterns ──────────────────────────────────────────────────────

const END_PATTERNS = [
  /you (left|have left) the (meeting|call)/i,
  /the call has ended/i,
  /call ended/i,
  /meeting has ended/i,
  /you were removed/i,
];

// ── SPA navigation (Meet is a single-page app) ────────────────────────────────

function onNavigate() {
  lastSender = '';
  HumanChat.resetStore();
  startObserver();
  HumanChat.watchMeetingEnd(END_PATTERNS);
}

const _push = history.pushState.bind(history);
history.pushState = (...args) => { _push(...args); onNavigate(); };
window.addEventListener('popstate', onNavigate);

// ── Init ──────────────────────────────────────────────────────────────────────

startObserver();
HumanChat.watchMeetingEnd(END_PATTERNS);
