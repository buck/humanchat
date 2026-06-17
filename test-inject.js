// Human Chat – test injection script
// Paste into DevTools console on any meet.google.com page.
// Each call adds a fake chat message to the DOM exactly as Meet would,
// triggering the extension's MutationObserver.

let _seq = 0;

function chat(sender, text) {
  const id = `test-msg-${++_seq}-${Date.now()}`;
  const el = document.createElement('div');
  el.setAttribute('data-message-id', id);

  // Mirrors the structure the extension's extractor expects:
  //   a leaf <span> for the sender name
  //   a <div dir="auto"> for the message body
  el.innerHTML = `
    <span>${sender}</span>
    <div dir="auto">${text}</div>
  `;

  document.body.appendChild(el);
  console.log(`[test] injected → ${sender}: ${text}`);
}

// ── Run the test suite ──────────────────────────────────────────────────────
// Paste the block below, or call chat() individually to try specific cases.

(function runTests() {
  // Human messages — should appear in the panel
  chat('Alice Johnson',   'Can everyone hear me?');
  chat('Bob Smith',       'Yes, loud and clear!');
  chat('Alice Johnson',   'Great. Let's get started.');
  chat('Carol Lee',       'I'll share my screen in a moment.');

  // Known bot names — should be silently filtered
  chat('Fireflies Notetaker',  'I have joined the meeting and will be taking notes.');
  chat('Otter.ai',             'Recording has started. I am taking notes.');
  chat('Fathom',               'I\'m now taking notes for this meeting.');
  chat('Krisp Notetaker',      'Hi everyone, joining to record this session.');

  // Bot-pattern messages from unfamiliar names — should also be filtered
  chat('Meeting Recorder Bot', 'Here to transcribe your meeting. I\'m taking notes.');
  chat('AI Scribe',            'Recording has begun. I will summarize at the end.');

  // Human messages resume — should appear
  chat('Bob Smith',  'Does anyone have questions about the Q2 numbers?');
  chat('Carol Lee',  'I have one — can you break down the APAC figures?');
  chat('Alice Johnson', 'Sure, pulling that up now.');

  // Doom-loop simulation: same bot spamming every "minute"
  let loopCount = 0;
  const loop = setInterval(() => {
    chat('Otter.ai', 'I am still taking notes for this meeting.');
    if (++loopCount >= 4) clearInterval(loop);
  }, 800); // 800ms instead of 60s so you don't have to wait

  // End-of-meeting summary blast (should be filtered)
  setTimeout(() => {
    chat('Fireflies Summary', 'SUMMARY: Today\'s meeting covered Q2 results. Action items: ...');
    chat('Otter.ai',          'Summary: Here is what was discussed... [1200 words]');
    chat('Fathom',            'Your meeting notes are ready. Summary: ...');

    // One last human message after the blasts
    chat('Bob Smith', 'Alright, talk next week everyone.');

    console.log('[test] all messages injected — check the Human Chat panel');
  }, 4500);
})();
