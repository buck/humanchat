'use strict';

// ── Platform config ───────────────────────────────────────────────────────────

let autoScrollTimer = null;

HumanChat.init({
  title:         'Airmeet Chat',
  position:      'right',
  filterBots:    true,
  filenamePrefix: 'airmeet-chat',
  meetingLabel:  () =>
    location.pathname.replace(/^\/+/, '').replace(/[/\\:*?"<>|]/g, '-') || 'meeting',
  autoscroll:    { start: startAutoScroll, stop: stopAutoScroll },
  captureQA,
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

function sweepExisting() {
  document.querySelectorAll(MSG_SELECTOR).forEach(handleElement);
}

function startObserver() {
  sweepExisting();
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

  // Airmeet's SPA renders chat after document_idle fires, so the initial
  // sweep above often finds nothing. Retry at increasing delays to catch
  // messages that appeared after the observer started but before any
  // mutation event triggered (e.g. static/ended meeting views).
  setTimeout(sweepExisting, 1000);
  setTimeout(sweepExisting, 3000);
  setTimeout(sweepExisting, 8000);
}

// ── Q&A Capture ───────────────────────────────────────────────────────────────
//
// On demand: clicks the Q&A tab, scrolls the full list to surface virtualized
// cards, harvests unique questions, then switches back to Chat.

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

async function captureQA() {
  const qaTab   = document.querySelector('[data-title="Q&A"]');
  const chatTab = document.querySelector('[data-title="Chat"]');
  if (!qaTab) return;

  qaTab.click();
  await delay(400);

  const scroller = findQAScroller();
  if (!scroller) { chatTab?.click(); return; }

  scroller.scrollTop = 0;
  await delay(400);

  // Step through the list so virtualized rows render at each position.
  let prevTop = -1;
  while (scroller.scrollTop !== prevTop) {
    sweepQACards(scroller);
    prevTop = scroller.scrollTop;
    scroller.scrollTop += Math.max(scroller.clientHeight * 0.75, 100);
    await delay(400);
  }
  sweepQACards(scroller);  // final pass at bottom

  chatTab?.click();
}

function findQAScroller() {
  // Airmeet uses a class with a stable readable prefix for its scroll containers.
  // After switching to Q&A the chat list is hidden (offsetHeight === 0).
  for (const el of document.querySelectorAll('[class*="ScrollbarList"]')) {
    if (el.offsetHeight > 0) return el;
  }
  // Fallback: walk up from the Q&A tab looking for an overflowing ancestor.
  let p = document.querySelector('[data-title="Q&A"]')?.parentElement;
  while (p && p !== document.body) {
    const ov = getComputedStyle(p).overflowY;
    if ((ov === 'auto' || ov === 'scroll') && p.scrollHeight > p.clientHeight && p.offsetHeight > 0)
      return p;
    p = p.parentElement;
  }
  return null;
}

function sweepQACards(scroller) {
  for (const card of findQACards(scroller)) {
    const parsed = parseQACard(card);
    if (parsed) HumanChat.recordQA(parsed.sender, parsed.subtitle, parsed.question, parsed.votes);
  }
}

// Walk down from the scroller until we find a container level where every
// visible child is exactly one Q&A card.  Each card has exactly one
// "Mark as" button in its subtree, which is a reliable structural marker.
function findQACards(root) {
  const countMark = el => (el.textContent.match(/Mark as/gi) || []).length;
  let el = root;
  for (let depth = 0; depth < 8; depth++) {
    const visible = [...el.children].filter(c => c.offsetHeight > 0);
    if (visible.length >= 1 && visible.every(c => countMark(c) === 1)) return visible;
    if (visible.length === 1) { el = visible[0]; continue; }
    break;
  }
  return [];
}

function parseQACard(el) {
  const raw = el.textContent || '';
  const clean = raw
    .replace(/Mark as (?:Un)?answered/gi, '')
    .replace(/(?:Un)?answered/gi, '')   // also removes concatenated "GarzaAnswered" etc.
    .replace(/[ \t]+/g, ' ')
    .trim();

  // No trailing \b: question text often runs directly into "ago" with no space.
  const agoM = clean.match(/\b(?:(?:an?\s+)|(?:\d+\s+))(?:second|minute|hour)s?\s+ago/i);
  if (!agoM) return null;

  const split    = clean.indexOf(agoM[0]);
  let   question = clean.slice(split + agoM[0].length)
    .replace(/^[\s*·]+/, '')           // strip leading **, ·, whitespace
    .trim();
  const votesM  = question.match(/\s+(\d+)\s*$/);
  const votes   = votesM ? parseInt(votesM[1], 10) : 0;
  question = question.replace(/\s+\d+\s*$/, '').trim();
  if (!question || question.length < 5) return null;

  const before = clean.slice(0, split).replace(/[·\s]+$/, '').trim();
  const parts  = before.split('·').map(s => s.trim()).filter(Boolean);
  return {
    sender:   parts[0] || '(unknown)',
    subtitle: parts.slice(1).join(' · '),
    question,
    votes,
  };
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
