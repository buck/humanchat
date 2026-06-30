'use strict';

// ── Platform config ───────────────────────────────────────────────────────────

HumanChat.init({
  title:          'Human Chat',
  position:       'right',
  filterBots:     true,
  filenamePrefix: 'human-chat-zoom',
  meetingLabel: () => {
    const m = location.pathname.match(/\/wc\/(\d+)/);
    return m ? m[1] : 'zoom-meeting';
  },
});

// ── Zoom DOM parsing ──────────────────────────────────────────────────────────
//
// Zoom renders chat inside a same-origin iframe (#webclient). Each message is
// a .chat-item-container. Sender is in .chat-item__sender[data-name]. Text
// lives in ._rtfEditor_1n3rs_1 paragraphs; emoji are <img data-emoji="…">.

const MSG_SELECTOR = '.chat-item-container';

function extractText(el) {
  const editor = el.querySelector('._rtfEditor_1n3rs_1');
  if (!editor) return '';
  return [...editor.querySelectorAll('p')].map(p =>
    [...p.childNodes].map(n =>
      n.nodeName === 'IMG' ? (n.dataset.emoji || '') : n.textContent
    ).join('')
  ).join('\n').trim();
}

function handleMessageNode(el) {
  const id     = el.id || el.getAttribute('data-id') || '';
  const sender = el.querySelector('.chat-item__sender')?.dataset.name || '';
  const text   = extractText(el);
  if (text) HumanChat.recordMessage(sender, text, id);
}

// ── Observer ──────────────────────────────────────────────────────────────────

let zoomObserver = null;

function startObserver(doc) {
  if (zoomObserver) zoomObserver.disconnect();
  doc.querySelectorAll(MSG_SELECTOR).forEach(handleMessageNode);
  zoomObserver = new MutationObserver(mutations => {
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
  zoomObserver.observe(doc.body, { childList: true, subtree: true });
}

// ── Wait for iframe ───────────────────────────────────────────────────────────
//
// Zoom loads meeting content into #webclient (same origin). We wait for the
// iframe to exist and its document to be ready before starting the observer.

function tryStartInIframe(iframe) {
  try {
    const doc = iframe.contentDocument || iframe.contentWindow.document;
    if (doc && doc.body && doc.body.children.length > 0) {
      startObserver(doc);
      return;
    }
  } catch (_) { /* cross-origin guard */ }
  setTimeout(() => tryStartInIframe(iframe), 500);
}

function waitForIframe() {
  const iframe = document.querySelector('#webclient');
  if (!iframe) {
    setTimeout(waitForIframe, 1000);
    return;
  }
  iframe.addEventListener('load', () => tryStartInIframe(iframe));
  tryStartInIframe(iframe);
}

// ── Meeting-end patterns ──────────────────────────────────────────────────────

const END_PATTERNS = [
  /you (left|have left) the (meeting|call)/i,
  /the meeting has ended/i,
  /meeting ended/i,
  /this meeting has been ended/i,
];

// ── Init ──────────────────────────────────────────────────────────────────────

waitForIframe();
HumanChat.watchMeetingEnd(END_PATTERNS);
