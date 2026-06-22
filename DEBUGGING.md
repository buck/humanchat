# Debugging Guide

The extension works by reading the chat DOM in your browser. When a platform (Airmeet, Google Meet) updates its UI, class names or element structure can change and the extension stops capturing messages.

If messages aren't appearing in the panel, this guide walks you through collecting the information needed to file a useful bug report — no programming knowledge required, just the ability to copy and paste.

---

## Step 1 — Check the basics

- Is the Human Chat panel visible? (Look for the **💬** pill in the corner — click it if the panel is hidden.)
- Are you on a supported URL? The extension only activates on `meet.google.com` and `*.airmeet.com`.
- Try refreshing the page and rejoining the meeting.

If messages still aren't appearing after that, continue to Step 2.

---

## Step 2 — Open the browser console

1. Right-click anywhere on the meeting page
2. Click **Inspect** (or **Inspect Element**)
3. Click the **Console** tab at the top of the panel that opens

You should see a blinking cursor at the bottom. That's where you'll paste the snippets below.

> **Note:** Some browsers show a warning about pasting code. If you see one, type `allow pasting` and press Enter, then paste the snippet.

---

## Step 3 — Run the diagnostic snippets

Paste each snippet, press **Enter**, and copy the output. You'll include this in your bug report.

### Snippet A — Check if the extension is loaded

```javascript
console.log(typeof window.HumanChat !== 'undefined' ? '✅ HumanChat loaded' : '❌ HumanChat not found');
```

Expected output: `✅ HumanChat loaded`

If it says `❌ HumanChat not found`, the extension isn't running on this page. Check that it's enabled in your browser's extension settings.

---

### Snippet B — Find the chat message element (Airmeet)

```javascript
const msg = document.querySelector('.message-content[aria-label]');
console.log(msg ? '✅ Found message element' : '❌ No .message-content[aria-label] found');
if (msg) console.log('aria-label:', msg.getAttribute('aria-label').slice(0, 100));
```

Expected output: `✅ Found message element` followed by the beginning of a message.

If it says `❌`, the chat panel may not be open, or Airmeet has changed its DOM structure. Try opening the native chat panel first, then run the snippet again.

---

### Snippet C — Check the message structure (Airmeet)

Only run this if Snippet B found a message element.

```javascript
const msg = document.querySelector('.message-content[aria-label]');
let el = msg;
for (let i = 0; i < 7; i++) el = el?.parentElement;
if (el) {
  console.log('container class:', el.className);
  [...el.children].forEach((child, i) =>
    console.log(i, child.tagName, child.className, child.textContent.slice(0, 80))
  );
}
```

Copy the full output — this is the most useful thing for diagnosing a broken selector.

---

### Snippet D — Find the chat message element (Google Meet)

```javascript
const msgs = document.querySelectorAll('[data-message-id]');
console.log(`Found ${msgs.length} message element(s)`);
if (msgs.length > 0) console.log('First element classes:', msgs[0].className);
```

---

## Step 4 — File a bug report

Go to **[https://github.com/buck/humanchat/issues](https://github.com/buck/humanchat/issues)** and click **New issue**.

Please include:

- Which platform broke (Airmeet or Google Meet)
- Your browser name and version (e.g. Chrome 125, Firefox 127)
- The output from **Snippet A** and whichever of B/C/D applies
- Roughly when it stopped working (after a browser update? after a platform update? always?)

You don't need to understand what the output means — just paste it in. That's enough to diagnose the problem and ship a fix.
