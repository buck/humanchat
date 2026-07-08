'use strict';

// ── Platform config ───────────────────────────────────────────────────────────

HumanChat.init({
  title:         'Airmeet Chat',
  position:      'right',
  filterBots:    true,
  filenamePrefix: 'airmeet-chat',
  meetingLabel:  () =>
    location.pathname.replace(/^\/+/, '').replace(/[/\\:*?"<>|]/g, '-') || 'meeting',
  autoscroll:    { start: startAutoScroll, stop: stopAutoScroll },
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
  const sender = dotIdx === -1 ? rest.trim() : rest.slice(0, dotIdx).trim();
  const text   = dotIdx === -1 ? '' : rest.slice(dotIdx + 2).trim();

  // Subtitle lives in .feed-item-header as extra <p> elements between name (first) and timestamp (last).
  // When no subtitle: 2 paragraphs. When subtitle present: 3+.
  let subtitle = '';
  const header = el.closest('.feed-item-container')?.querySelector('.feed-item-header');
  if (header) {
    const ps = [...header.querySelectorAll('p')];
    if (ps.length > 2) {
      subtitle = ps.slice(1, -1)
        .map(p => p.textContent.trim())
        .filter(s => s && !/^[·•|\-–—]+$/.test(s))
        .join(' · ');
    }
  }

  return { sender, text, subtitle };
}

function handleElement(el) {
  const parsed = parseMessage(el);
  if (parsed && parsed.text) HumanChat.recordMessage(parsed.sender, parsed.text, undefined, parsed.subtitle);
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

// ── Autoscroll ────────────────────────────────────────────────────────────────

function findChatScroller() {
  const msg = document.querySelector(MSG_SELECTOR);
  if (!msg) return null;
  let el = msg.parentElement;
  while (el && el !== document.body) {
    const ov = getComputedStyle(el).overflowY;
    if ((ov === 'auto' || ov === 'scroll') && el.scrollHeight > el.clientHeight) return el;
    el = el.parentElement;
  }
  return null;
}

let autoScrollTimer = null;

function startAutoScroll() {
  if (autoScrollTimer) return;
  autoScrollTimer = setInterval(() => {
    const el = findChatScroller();
    if (el && el.scrollTop + el.clientHeight < el.scrollHeight - 5) {
      el.scrollTop = el.scrollHeight;
    }
  }, 500);
}

function stopAutoScroll() {
  clearInterval(autoScrollTimer);
  autoScrollTimer = null;
}

// ── Init ──────────────────────────────────────────────────────────────────────

startObserver();
