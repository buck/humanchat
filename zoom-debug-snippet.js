// Zoom chat diagnostic snippet
// Paste into Chrome DevTools Console on app.zoom.us while in a meeting.
// Tells you whether the extension selectors are working and what text it would capture.

(() => {
  const doc = document.querySelector('#webclient')?.contentDocument;
  if (!doc) return console.warn('No #webclient iframe found — are you on app.zoom.us in a meeting?');

  const items = doc.querySelectorAll('.chat-item-container');
  console.log(`${items.length} .chat-item-container elements found`);
  if (!items.length) return console.warn('No chat items — is the Zoom chat panel open?');

  const item = items[0];
  const sender = item.querySelector('.chat-item__sender')?.dataset.name;
  const textEl = item.querySelector('[class*="text-box"], [class*="text-content"]');
  console.log('sender el class:', item.querySelector('.chat-item__sender')?.className);
  console.log('sender:', sender);
  console.log('text el class:', textEl?.className);
  console.log('text:', textEl?.textContent?.slice(0, 120));

  if (!textEl) {
    console.warn('Text element not found — Zoom may have changed class names. Descendant classes:');
    console.log([...item.querySelectorAll('*')].map(e => e.className).filter(c => c && typeof c === 'string'));
  }
})();
