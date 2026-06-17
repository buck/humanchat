# Testing Human Chat for Google Meet

## Method 1: Console injection (fastest)

Tests the filter logic without needing a second participant.

1. Go to `meet.google.com` and start a new meeting (solo is fine)
2. Load the extension:
   - **Chrome**: `chrome://extensions` → Enable Developer mode → Load unpacked → select `meet-human-chat/`
   - **Firefox**: `about:debugging#/runtime/this-firefox` → Load Temporary Add-on → select any file in `meet-human-chat/`
3. The Human Chat panel should appear in the lower-left corner
4. Open DevTools (`F12`) → Console tab
5. Paste the contents of `test-inject.js` and press Enter

### What to expect

| What happens | Expected result |
|---|---|
| 4 human messages injected immediately | Appear in the panel |
| 6 bot messages (known names + content patterns) | Silently filtered; badge shows "6 filtered" |
| Doom-loop bot fires 4 more times (every 0.8s) | Badge keeps climbing |
| 3 end-of-meeting summary blasts after ~4.5s | All filtered |
| 1 final human message | Appears in panel |
| Click **Save .txt** | Downloads file containing only the 8 human messages |

### Calling chat() manually

You can also inject individual messages to probe specific cases:

```javascript
// Should appear
chat('Alice Johnson', 'Can everyone hear me?');

// Should be filtered (known bot name)
chat('Fireflies Notetaker', 'I have joined and will take notes.');

// Should be filtered (content pattern, unfamiliar name)
chat('Samantha', "I'm now taking notes for this meeting.");
```

---

## Method 2: Two-window realistic test

Tests with real Meet DOM (not injected nodes), catches layout or selector issues.

1. Start a meeting at `meet.google.com`
2. Join the same meeting link in an Incognito window (acts as a second participant)
3. From the Incognito window, open the chat panel and type bot-style messages:
   - `I'm now taking notes for this meeting.`
   - `Recording has started.`
   - A normal human message like `Hello everyone`
4. Confirm the Human Chat panel in your main window filters the bot lines and shows the human one

---

## What to check if messages don't appear in the panel

Google Meet periodically changes its DOM. If the extension stops detecting messages:

1. Open DevTools on a live meeting with chat open
2. Find a chat message element in the Elements panel
3. Check whether it still has a `data-message-id` attribute
4. If not, find the new stable attribute and update `MSG_SELECTOR` in `content.js`:

```javascript
// content.js, line ~147
const MSG_SELECTOR = '[data-message-id]';
```

Also check `extractSenderAndText()` in `content.js` if sender names or message text are
being extracted incorrectly — the comments there describe the fallback strategies.
