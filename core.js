'use strict';

const api = typeof browser !== 'undefined' ? browser : chrome;

window.HumanChat = (() => {

  // ── Config (set by adapter via init()) ───────────────────────────────────
  let cfg = {
    title: 'Human Chat',
    position: 'left',        // 'left' | 'right'
    filterBots: true,
    filenamePrefix: 'human-chat',
    meetingLabel: () => 'meeting',
  };

  function init(options) {
    Object.assign(cfg, options);
    buildUI();
  }

  // ── Bot detection ─────────────────────────────────────────────────────────

  const KNOWN_BOTS = [
    'otter', 'otterpilot', 'otter.ai',
    'fireflies', 'fireflies.ai',
    'fathom', 'krisp', 'notta',
    'tldv', 'tl;dv', 'avoma', 'fellow',
    'read.ai', 'read ai', 'meetgeek',
    'gong', 'chorus', 'clari',
    'jamie', 'meetjamie', 'tactiq',
    'grain', 'nyota', 'sembly', 'vowel',
    'airgram', 'bluedot', 'supernormal',
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
    /i'?m an ai (assistant|notetaker) helping/i,
    /helping .{1,60} take notes for this meeting/i,
    /follow along the transcript here/i,
    /^\s*🤖/,
    /^\s*📝/,
  ];

  function isBot(sender, text) {
    if (!cfg.filterBots) return false;
    const s = (sender || '').toLowerCase().trim();
    const t = text || '';
    if (KNOWN_BOTS.some(n => s.includes(n))) return true;
    if (BOT_NAME_RX.some(r => r.test(s))) return true;
    if (BOT_MSG_RX.some(r => r.test(t))) return true;
    return false;
  }

  // ── Message store ─────────────────────────────────────────────────────────

  let humanMessages = [];
  let filteredCount = 0;
  const seenKeys = new Set();

  // ── Q&A store ──────────────────────────────────────────────────────────────

  let qaItems = [];
  const seenQA = new Set();

  function recordMessage(sender, text, id, subtitle) {
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
      subtitle: subtitle || '',
      text,
    };
    humanMessages.push(msg);
    appendMsg(msg);
    setCount(humanMessages.length);
  }

  function recordQA(sender, subtitle, question) {
    if (!question || seenQA.has(question)) return;
    seenQA.add(question);
    qaItems.push({ sender: sender || '(unknown)', subtitle: subtitle || '', question });
  }

  function resetStore() {
    humanMessages = [];
    filteredCount = 0;
    seenKeys.clear();
    qaItems = [];
    seenQA.clear();
    if (msgList) msgList.innerHTML = '';
    setBadge(0);
    setCount(0);
  }

  // ── UI ────────────────────────────────────────────────────────────────────

  let panel, msgList, badge, countEl, toggleBtn, autoScrollBtn;
  let autoScrollOn = false;

  function buildUI() {
    document.getElementById('hc-panel')?.remove();
    document.getElementById('hc-toggle')?.remove();

    panel = document.createElement('div');
    panel.id = 'hc-panel';
    panel.innerHTML = `
      <div id="hc-header">
        <span id="hc-title">${esc(cfg.title)}</span>
        <span id="hc-count"></span>
        <span id="hc-badge"></span>
        <div id="hc-btns">
          ${cfg.autoscroll ? '<button id="hc-autoscroll" title="Toggle autoscroll">⬇ Auto</button>' : ''}
          <button id="hc-min" title="Minimize">−</button>
          <button id="hc-close" title="Hide">✕</button>
        </div>
      </div>
      <ul id="hc-msgs" aria-label="Captured chat messages" role="log"></ul>
      <div id="hc-footer">
        <button id="hc-save-txt">Save .txt</button>
        <button id="hc-save-json">Save .json</button>
        <button id="hc-copy">Copy</button>
        ${cfg.captureQA ? '<button id="hc-qa">Q&amp;A</button>' : ''}
      </div>
    `;

    toggleBtn = document.createElement('button');
    toggleBtn.id = 'hc-toggle';
    toggleBtn.title = `Show ${cfg.title}`;
    toggleBtn.textContent = `💬 ${cfg.title}`;
    toggleBtn.style.display = 'none';

    // Position panel and toggle on the configured side
    const side = cfg.position === 'right' ? 'right' : 'left';
    const opp  = side === 'right' ? 'left' : 'right';
    panel.style[side]     = '16px';
    panel.style[opp]      = 'auto';
    toggleBtn.style[side] = '16px';
    toggleBtn.style[opp]  = 'auto';

    document.body.append(panel, toggleBtn);

    msgList = panel.querySelector('#hc-msgs');
    badge   = panel.querySelector('#hc-badge');
    countEl = panel.querySelector('#hc-count');

    makeDraggable(panel, panel.querySelector('#hc-header'));

    if (cfg.autoscroll) {
      autoScrollBtn = panel.querySelector('#hc-autoscroll');
      autoScrollBtn.onclick = toggleAutoScroll;
      enableAutoScroll();
    }

    panel.querySelector('#hc-min').onclick       = toggleMinimize;
    panel.querySelector('#hc-close').onclick     = hidePanel;
    panel.querySelector('#hc-save-txt').onclick  = () => saveChat('txt');
    panel.querySelector('#hc-save-json').onclick = () => saveChat('json');
    panel.querySelector('#hc-copy').onclick      = copyChat;
    toggleBtn.onclick = showPanel;

    if (cfg.captureQA) {
      const qaBtn = panel.querySelector('#hc-qa');
      qaBtn.onclick = async () => {
        qaBtn.disabled = true;
        qaBtn.textContent = 'Scanning…';
        await cfg.captureQA();
        qaBtn.textContent = qaItems.length ? `Q&A (${qaItems.length})` : 'Q&A';
        qaBtn.disabled = false;
      };
    }
  }

  function appendMsg(msg) {
    if (!msgList) return;
    const li = document.createElement('li');
    li.className = 'hc-msg';
    li.innerHTML =
      `<span class="hc-time">${esc(msg.time)}</span>` +
      `<span class="hc-sender">${esc(msg.sender)}</span>` +
      (msg.subtitle ? `<span class="hc-subtitle">${esc(msg.subtitle)}</span>` : '') +
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

  function hidePanel()  { panel.style.display = 'none'; toggleBtn.style.display = ''; }
  function showPanel()  { panel.style.display = '';     toggleBtn.style.display = 'none'; }

  function esc(s) {
    return (s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function makeDraggable(el, handle) {
    handle.addEventListener('mousedown', e => {
      if (e.target.closest('button')) return;
      const r  = el.getBoundingClientRect();
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

  // ── Autoscroll toggle ─────────────────────────────────────────────────────

  function enableAutoScroll() {
    autoScrollOn = true;
    if (autoScrollBtn) {
      autoScrollBtn.textContent = '⬇ Auto';
      autoScrollBtn.classList.add('hc-autoscroll-on');
    }
    cfg.autoscroll?.start();
  }

  function disableAutoScroll() {
    autoScrollOn = false;
    if (autoScrollBtn) {
      autoScrollBtn.textContent = '⏸';
      autoScrollBtn.classList.remove('hc-autoscroll-on');
    }
    cfg.autoscroll?.stop();
  }

  function toggleAutoScroll() {
    autoScrollOn ? disableAutoScroll() : enableAutoScroll();
  }

  // ── Export ────────────────────────────────────────────────────────────────

  function buildTxt() {
    const label    = cfg.meetingLabel();
    const date     = new Date().toLocaleDateString(undefined, { dateStyle: 'full' });
    const filtered = cfg.filterBots
      ? ` · ${filteredCount} bot message${filteredCount === 1 ? '' : 's'} filtered`
      : '';
    const lines = [
      `${cfg.title} — ${label}`,
      date,
      `${humanMessages.length} message${humanMessages.length === 1 ? '' : 's'}${filtered}`,
      '─'.repeat(50),
      '',
      ...humanMessages.map(m => {
        const who = m.subtitle ? `${m.sender} (${m.subtitle})` : m.sender;
        return `[${m.time}] ${who}: ${m.text}`;
      }),
    ];

    if (qaItems.length > 0) {
      lines.push('', '─'.repeat(50));
      lines.push(`Q&A — ${qaItems.length} question${qaItems.length === 1 ? '' : 's'}`);
      lines.push('─'.repeat(50), '');
      for (const q of qaItems) {
        const who = q.subtitle ? `${q.sender} (${q.subtitle})` : q.sender;
        lines.push(`[Q] ${who}`, q.question, '');
      }
    }

    return lines.join('\n');
  }

  function buildJson() {
    const out = {
      meeting:    cfg.meetingLabel(),
      exportedAt: new Date().toISOString(),
      messages:   humanMessages,
    };
    if (cfg.filterBots) out.filteredCount = filteredCount;
    if (qaItems.length > 0) out.qa = qaItems;
    return JSON.stringify(out, null, 2);
  }

  function saveChat(fmt) {
    if (humanMessages.length === 0) return;
    const content  = fmt === 'json' ? buildJson() : buildTxt();
    const mime     = fmt === 'json' ? 'application/json' : 'text/plain';
    const label    = cfg.meetingLabel();
    const now      = new Date();
    const date     = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
    const time     = `${String(now.getHours()).padStart(2,'0')}${String(now.getMinutes()).padStart(2,'0')}`;
    const filename = `${cfg.filenamePrefix}-${label}-${date}-${time}.${fmt}`;
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

  // ── Meeting-end auto-save ─────────────────────────────────────────────────

  function watchMeetingEnd(patterns) {
    const obs = new MutationObserver(() => {
      if (patterns.some(r => r.test(document.body.innerText)) && humanMessages.length > 0) {
        saveChat('txt');
        obs.disconnect();
      }
    });
    obs.observe(document.body, { childList: true, subtree: true });
  }

  return { init, recordMessage, recordQA, resetStore, watchMeetingEnd, saveChat };

})();
