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
  captureQA,
});

// ── Zoom DOM parsing ──────────────────────────────────────────────────────────
//
// Zoom renders chat inside a same-origin iframe (#webclient). Each message is
// a .chat-item-container. Sender is in .chat-item__sender[data-name]. Text
// lives in .chat-message__text-box; emoji are <img data-emoji="…">.

const MSG_SELECTOR = '.chat-item-container';

const downloadedIds = new Set();

function extractText(el) {
  const box = el.querySelector('[class*="text-box"]');
  if (box) {
    return [...box.childNodes].map(n =>
      n.nodeName === 'IMG' ? (n.dataset.emoji || '') : n.textContent
    ).join('').trim();
  }
  const fileItem = el.querySelector('.chat-file-item[title]');
  if (fileItem) {
    const name = fileItem.title;
    const ariaLabel = el.querySelector('[class*="chat-message__container"], [class*="chat-msg-container"]')?.getAttribute('aria-label') || '';
    const sizeMatch = ariaLabel.match(/,\s*([\d.]+\s*(?:KB|MB|GB|B))\s*,/i);
    const size = sizeMatch ? ` (${sizeMatch[1]})` : '';
    return `[file] ${name}${size}`;
  }
  return '';
}

function handleMessageNode(el) {
  const id     = el.id || el.getAttribute('data-id') || '';
  const sender = el.querySelector('.chat-item__sender')?.dataset.name || '';
  const text   = extractText(el);
  if (text) HumanChat.recordMessage(sender, text, id);

  const fileItem = el.querySelector('.chat-file-item');
  if (fileItem && id && !downloadedIds.has(id)) {
    downloadedIds.add(id);
    fileItem.click();
  }
}

// ── Q&A Capture ───────────────────────────────────────────────────────────────
//
// Zoom renders Q&A inside the same #webclient iframe as chat. The list is
// virtualized (ReactVirtualized), so we must scroll it to surface all cards.
// The panel auto-closes after user inactivity, so we re-open it if needed.

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

async function captureQA() {
  const doc = document.querySelector('#webclient')?.contentDocument;
  if (!doc) return;

  // Open the Q&A panel if not already visible.
  let container = doc.querySelector('.q-a-container');
  if (!container || container.offsetHeight === 0) {
    const btn = doc.querySelector('[class*="q-a-entry-button-container"]');
    if (!btn) return;
    btn.click();
    await delay(500);
    container = doc.querySelector('.q-a-container');
    if (!container || container.offsetHeight === 0) return;
  }

  const scroller = doc.querySelector('.q-a-container__tab-content-wrapper');
  if (!scroller) return;

  scroller.scrollTop = 0;
  await delay(300);

  let prevTop = -1;
  while (scroller.scrollTop !== prevTop) {
    // If Zoom auto-closed the panel mid-scan, reopen and find scroller again.
    if (container.offsetHeight === 0) {
      const btn = doc.querySelector('[class*="q-a-entry-button-container"]');
      if (btn) { btn.click(); await delay(500); }
      break;
    }
    sweepQACards(doc);
    prevTop = scroller.scrollTop;
    scroller.scrollTop += Math.max(scroller.clientHeight * 0.75, 100);
    await delay(300);
  }
  sweepQACards(doc);
}

function sweepQACards(doc) {
  const cards = doc.querySelectorAll('li.q-a-question');
  cards.forEach(function(card) {
    const parsed = parseQACard(card);
    if (parsed) HumanChat.recordQA(parsed.sender, '', parsed.question, 0);
  });
}

function parseQACard(el) {
  const sender   = (el.querySelector('.q-a-question__q-owner-name') || {}).textContent || '';
  const question = (el.querySelector('.q-a-question__question-content') || {}).textContent || '';
  if (!sender.trim() || !question.trim()) return null;
  return { sender: sender.trim(), question: question.trim() };
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
