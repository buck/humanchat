'use strict';

const api = typeof browser !== 'undefined' ? browser : chrome;

// ═══════════════════════════════════════════════════════════════════════════════
// NOTETAKER DETECTION
// ═══════════════════════════════════════════════════════════════════════════════

const KNOWN_BOTS = [
  'otter', 'otterpilot', 'otter.ai',
  'fireflies', 'fireflies.ai',
  'fathom',
  'krisp',
  'notta',
  'tldv', 'tl;dv',
  'avoma',
  'fellow',
  'read.ai', 'read ai',
  'meetgeek',
  'gong',
  'chorus',
  'clari',
  'jamie', 'meetjamie',
  'tactiq',
  'grain',
  'nyota',
  'sembly',
  'vowel',
  'airgram',
  'bluedot',
  'supernormal',
  'notetaker', 'note taker', 'note-taker',
];

const BOT_NAME_RX = [
  /note[\s-]?taker/i,
  /\bbot\b/i,
  /ai[\s-]?scribe/i,
  /ai[\s-]?assistant/i,
  /meeting[\s-]?recorder/i,
  /meeting[\s-]?assistant/i,
  /auto[\s-]?record/i,
  /\bscribe\b/i,
  /\brecorder\b/i,
];

const BOT_MSG_RX = [
  /i'?m (now )?taking notes/i,
  /i (have|'ve) (joined|started|begun)/i,
  /recording has (started|begun)/i,
  /this meeting is being (recorded|transcribed)/i,
  /i('ll| will) (take|be taking) notes/i,
  /joining to (take notes|record)/i,
  /here to (take notes|record|transcribe)/i,
  /^\s*🤖/,
  /^\s*📝/,
];

function isBot(sender, text) {
  const s = (sender || '').toLowerCase().trim();
  const t = text || '';
  if (KNOWN_BOTS.some(n => s.includes(n))) return true;
  if (BOT_NAME_RX.some(r => r.test(s))) return true;
  if (BOT_MSG_RX.some(r => r.test(t))) return true;
  return false;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MESSAGE STORE
// ═══════════════════════════════════════════════════════════════════════════════

let humanMessages = [];
let filteredCount = 0;
const seenKeys = new Set();

function recordMessage(sender, text, id) {
  if (!text) return;

  const key = id || `${sender}\x00${text}`;
  if (seenKeys.has(key)) return;
  seenKeys.add(key);

  if (isBot(sender, text)) {
    filteredCount++;
    setBadge(filteredCount);
    return;
  }

  const now = new Date();
  const msg = {
    time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    ts: now.toISOString(),
    sender: sender || '(unknown)',
    text,
  };
  humanMessages.push(msg);
  appendMsg(msg);
  setCount(humanMessages.length);
}

function resetStore() {
  humanMessages = [];
  filteredCount = 0;
  seenKeys.clear();
  lastSender = '';
  if (msgList) msgList.innerHTML = '';
  setBadge(0);
  setCount(0);
}

// ═══════════════════════════════════════════════════════════════════════════════
// UI
// ═══════════════════════════════════════════════════════════════════════════════

let panel, msgList, badge, countEl, toggleBtn;

function buildUI() {
  panel = document.createElement('div');
  panel.id = 'hc-panel';
  panel.innerHTML = `
    <div id="hc-header">
      <span id="hc-title">Human Chat</span>
      <span id="hc-count"></span>
      <span id="hc-badge"></span>
      <div id="hc-btns">
        <button id="hc-min" title="Minimize">−</button>
        <button id="hc-close" title="Hide">✕</button>
      </div>
    </div>
    <ul id="hc-msgs" aria-label="Human-only messages" role="log"></ul>
    <div id="hc-footer">
      <button id="hc-save-txt">Save .txt</button>
      <button id="hc-save-json">Save .json</button>
      <button id="hc-copy">Copy</button>
    </div>
  `;

  toggleBtn = document.createElement('button');
  toggleBtn.id = 'hc-toggle';
  toggleBtn.title = 'Show Human Chat';
  toggleBtn.textContent = '💬 Human Chat';
  toggleBtn.style.display = 'none';

  document.body.append(panel, toggleBtn);

  msgList  = panel.querySelector('#hc-msgs');
  badge    = panel.querySelector('#hc-badge');
  countEl  = panel.querySelector('#hc-count');

  makeDraggable(panel, panel.querySelector('#hc-header'));

  panel.querySelector('#hc-min').onclick   = toggleMinimize;
  panel.querySelector('#hc-close').onclick = hidePanel;
  panel.querySelector('#hc-save-txt').onclick  = () => saveChat('txt');
  panel.querySelector('#hc-save-json').onclick = () => saveChat('json');
  panel.querySelector('#hc-copy').onclick  = copyChat;
  toggleBtn.onclick = showPanel;
}

function appendMsg(msg) {
  if (!msgList) return;
  const li = document.createElement('li');
  li.className = 'hc-msg';
  li.innerHTML =
    `<span class="hc-time">${esc(msg.time)}</span>` +
    `<span class="hc-sender">${esc(msg.sender)}</span>` +
    `<span class="hc-text">${esc(msg.text)}</span>`;
  msgList.appendChild(li);
  msgList.scrollTop = msgList.scrollHeight;
}

function setBadge(n) {
  if (!badge) return;
  badge.textContent = n > 0 ? `${n} filtered` : '';
  badge.style.display = n > 0 ? '' : 'none';
}

function setCount(n) {
  if (!countEl) return;
  countEl.textContent = n > 0 ? `${n} msg${n === 1 ? '' : 's'}` : '';
}

let minimized = false;
function toggleMinimize() {
  minimized = !minimized;
  msgList.style.display = minimized ? 'none' : '';
  panel.querySelector('#hc-footer').style.display = minimized ? 'none' : '';
  panel.querySelector('#hc-min').textContent = minimized ? '+' : '−';
}

function hidePanel() {
  panel.style.display = 'none';
  toggleBtn.style.display = '';
}

function showPanel() {
  panel.style.display = '';
  toggleBtn.style.display = 'none';
}

function esc(s) {
  return (s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// ─── Drag support ────────────────────────────────────────────────────────────

function makeDraggable(el, handle) {
  handle.addEventListener('mousedown', e => {
    if (e.target.closest('button')) return;
    const r = el.getBoundingClientRect();
    const ox = e.clientX - r.left;
    const oy = e.clientY - r.top;

    const move = ev => {
      el.style.left   = `${ev.clientX - ox}px`;
      el.style.top    = `${ev.clientY - oy}px`;
      el.style.right  = 'auto';
      el.style.bottom = 'auto';
    };
    const up = () => {
      document.removeEventListener('mousemove', move);
      document.removeEventListener('mouseup', up);
    };
    document.addEventListener('mousemove', move);
    document.addEventListener('mouseup', up);
    e.preventDefault();
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════════════════════════════════

function meetingLabel() {
  const code = location.pathname.replace(/^\//, '').split('/')[0] || 'meeting';
  return code.replace(/[/\\:*?"<>|]/g, '-');
}

function buildTxt() {
  const date = new Date().toLocaleDateString(undefined, { dateStyle: 'full' });
  return [
    `Human Chat — ${meetingLabel()}`,
    date,
    `${humanMessages.length} message${humanMessages.length === 1 ? '' : 's'} · ${filteredCount} bot message${filteredCount === 1 ? '' : 's'} filtered`,
    '─'.repeat(50),
    '',
    ...humanMessages.map(m => `[${m.time}] ${m.sender}: ${m.text}`),
  ].join('\n');
}

function buildJson() {
  return JSON.stringify({
    meeting: meetingLabel(),
    exportedAt: new Date().toISOString(),
    filteredCount,
    messages: humanMessages,
  }, null, 2);
}

function saveChat(fmt) {
  if (humanMessages.length === 0) return;
  const content  = fmt === 'json' ? buildJson() : buildTxt();
  const mime     = fmt === 'json' ? 'application/json' : 'text/plain';
  const filename = `human-chat-${meetingLabel()}-${new Date().toISOString().slice(0, 10)}.${fmt}`;
  api.runtime.sendMessage({ type: 'DOWNLOAD', content, mime, filename });
}

async function copyChat() {
  if (humanMessages.length === 0) return;
  try {
    await navigator.clipboard.writeText(buildTxt());
    const btn = panel.querySelector('#hc-copy');
    btn.textContent = 'Copied!';
    setTimeout(() => { btn.textContent = 'Copy'; }, 2000);
  } catch { /* clipboard access denied */ }
}

// ═══════════════════════════════════════════════════════════════════════════════
// GOOGLE MEET DOM INTEGRATION
//
// Google Meet uses obfuscated, frequently-changing class names. We anchor to
// `data-message-id` (present in Meet's chat DOM since ~2023) for finding
// messages, then use a cascade of fallback strategies to extract sender/text.
//
// If Meet changes its DOM and messages stop appearing in the panel, open
// DevTools in a meeting, find a chat message element, and look for the
// attribute used to identify individual messages. Update MSG_SELECTOR below.
// ═══════════════════════════════════════════════════════════════════════════════

// Primary selector for individual chat message containers.
const MSG_SELECTOR = '[data-message-id]';

// Meet groups consecutive messages from the same sender and only shows the
// sender name on the first message in the group. We track the last seen
// sender so we can attribute nameless follow-up messages correctly.
let lastSender = '';

function extractSenderAndText(el) {
  let sender = '';
  let text   = '';

  // ── 1. dir="auto" marks user-authored content in Meet ────────────────────
  const dirAutos = Array.from(el.querySelectorAll('[dir="auto"]'));
  if (dirAutos.length > 0) {
    text = dirAutos[dirAutos.length - 1].textContent.trim();
  }

  // ── 2. role="text" marks rich-text regions ────────────────────────────────
  if (!text) {
    const roleTexts = el.querySelectorAll('[role="text"]');
    if (roleTexts.length > 0) {
      text = Array.from(roleTexts).map(e => e.textContent.trim()).join(' ').trim();
    }
  }

  // ── 3. Find sender: first short leaf <span> that isn't a timestamp ────────
  // Meet chat structure (approximate):
  //   <div data-message-id="…">
  //     <img>  (avatar, optional — only on first message in a group)
  //     <div>  (content)
  //       <div>  (header: name + time — absent on grouped follow-ups)
  //         <span>Alice</span>
  //         <span>10:32 AM</span>
  //       </div>
  //       <div>  (body)
  //         <div dir="auto">message text</div>
  //       </div>
  //     </div>
  //   </div>
  for (const span of el.querySelectorAll('span')) {
    const t = span.textContent.trim();
    const looksLikeTimestamp = /^\d{1,2}:\d{2}(\s*(AM|PM))?$/i.test(t);
    const isLeaf = span.children.length === 0;
    if (isLeaf && t && t.length < 80 && !looksLikeTimestamp) {
      sender = t;
      break;
    }
  }

  // ── 4. Fall back to last known sender (grouped messages have no name) ─────
  if (!sender) sender = lastSender;

  // ── 5. Last-resort text extraction ───────────────────────────────────────
  if (!text) {
    text = el.textContent
      .trim()
      .replace(sender, '')
      .replace(/\d{1,2}:\d{2}\s*(AM|PM)?/gi, '')
      .trim();
  }

  if (sender) lastSender = sender;
  return { sender, text };
}

// ─── Observer ────────────────────────────────────────────────────────────────

let meetObserver = null;

function handleMessageNode(el) {
  const id = el.getAttribute('data-message-id');
  const { sender, text } = extractSenderAndText(el);
  if (text) recordMessage(sender, text, id);
}

function startObserver() {
  if (meetObserver) meetObserver.disconnect();

  // Capture any messages already visible (e.g. chat was open on load)
  document.querySelectorAll(MSG_SELECTOR).forEach(handleMessageNode);

  meetObserver = new MutationObserver(mutations => {
    for (const mut of mutations) {
      for (const node of mut.addedNodes) {
        if (node.nodeType !== Node.ELEMENT_NODE) continue;
        if (node.matches?.(MSG_SELECTOR)) {
          handleMessageNode(node);
        } else {
          node.querySelectorAll?.(MSG_SELECTOR).forEach(handleMessageNode);
        }
      }
    }
  });

  meetObserver.observe(document.body, { childList: true, subtree: true });
}

// ═══════════════════════════════════════════════════════════════════════════════
// MEETING END — AUTO-SAVE
// ═══════════════════════════════════════════════════════════════════════════════

function watchMeetingEnd() {
  const patterns = [
    /you (left|have left) the (meeting|call)/i,
    /the call has ended/i,
    /call ended/i,
    /meeting has ended/i,
    /you were removed/i,
  ];

  const obs = new MutationObserver(() => {
    if (patterns.some(r => r.test(document.body.innerText)) && humanMessages.length > 0) {
      saveChat('txt');
      obs.disconnect();
    }
  });
  obs.observe(document.body, { childList: true, subtree: true });
}

// ═══════════════════════════════════════════════════════════════════════════════
// SPA NAVIGATION (Meet is a single-page app)
// ═══════════════════════════════════════════════════════════════════════════════

function onNavigate() {
  resetStore();
  startObserver();
  watchMeetingEnd();
}

const _push = history.pushState.bind(history);
history.pushState = (...args) => { _push(...args); onNavigate(); };
window.addEventListener('popstate', onNavigate);

// ═══════════════════════════════════════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════════════════════════════════════

buildUI();
startObserver();
watchMeetingEnd();
