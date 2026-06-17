'use strict';

// Works in Chrome (chrome.*) and Firefox (browser.*)
const api = typeof browser !== 'undefined' ? browser : chrome;

// Content scripts cannot call the downloads API directly in MV3.
// The content script sends a DOWNLOAD message here; we do the actual download.
api.runtime.onMessage.addListener((msg) => {
  if (msg.type !== 'DOWNLOAD') return;

  // Encode UTF-8 content as a base64 data URL (Blob + createObjectURL is
  // unavailable in MV3 service workers in Chrome).
  const bytes = new TextEncoder().encode(msg.content);
  const chunks = [];
  for (let i = 0; i < bytes.length; i += 0x8000) {
    chunks.push(String.fromCharCode(...bytes.subarray(i, i + 0x8000)));
  }
  const url = `data:${msg.mime};base64,${btoa(chunks.join(''))}`;

  api.downloads.download({ url, filename: msg.filename, saveAs: false });
});
