'use strict';

// ── Platform config ───────────────────────────────────────────────────────────

HumanChat.init({
  title:         'Airmeet Chat',
  position:      'right',
  filterBots:    true,
  filenamePrefix: 'airmeet-chat',
  meetingLabel:  () =>
    location.pathname.replace(/^\/+/, '').replace(/[/\\:*?"<>|]/g, '-') || 'meeting',
});

// ── Airmeet DOM parsing ───────────────────────────────────────────────────────
//
// Airmeet marks each message with class "message-content" and an aria-label
// of the form: "Message by {Name}. {text}"

const MSG_SELECTOR = '.message-content[aria-label]';

function parseMessage(el) {
  const label  = el.getAttribute('aria-label') || '';
  const prefix = 'Message by ';
  if (!label.startsWith(prefix)) return null;
  const rest   = label.slice(prefix.length);
  const dotIdx = rest.indexOf('. ');
  if (dotIdx === -1) return { sender: rest.trim(), text: '' };
  return {
    sender: rest.slice(0, dotIdx).trim(),
    text:   rest.slice(dotIdx + 2).trim(),
  };
}

function handleElement(el) {
  const parsed = parseMessage(el);
  if (parsed && parsed.text) HumanChat.recordMessage(parsed.sender, parsed.text);
}

// ── Observer ──────────────────────────────────────────────────────────────────

let observer = null;

function startObserver() {
  document.querySelectorAll(MSG_SELECTOR).forEach(handleElement);
  if (observer) observer.disconnect();
  observer = new MutationObserver(mutations => {
    for (const mut of mutations) {
      for (const node of mut.addedNodes) {
        if (node.nodeType !== Node.ELEMENT_NODE) continue;
        if (node.matches?.(MSG_SELECTOR))
          handleElement(node);
        else
          node.querySelectorAll?.(MSG_SELECTOR).forEach(handleElement);
      }
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

// ── Init ──────────────────────────────────────────────────────────────────────

startObserver();
