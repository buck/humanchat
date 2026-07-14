# Enhancement Ideas

## In progress

### Airmeet quoted/reply messages
When a chat message quotes an earlier message, the quoted bubble appears as a nested element inside the message container. Currently not captured.
- Need DOM inspection during a live Airmeet meeting with a visible quoted message
- Safe console snippet to run: `document.querySelector('[class*="Quote"],[class*="quote"],[class*="Reply"],[class*="reply"]')?.className`
- Once selector is found: store as `msg.quotedText` in JSON; prefix with `> ` in .txt export

## Planned

### Zoom: aria-label fallback for text extraction
`.chat-message__text-box` is stable but if it ever breaks again, `.chat-message__container[aria-label]` already contains the full message as `"Sender to Everyone, HH:MM:SS PM, <text>"`. Add it as a fallback in `extractText()` so the extension self-heals without a code push.

### Zoom: auto-open chat to prevent missed messages
Zoom closes the chat panel (and removes message DOM nodes) during webinars — messages sent while chat is closed are never seen by the MutationObserver. Options:
- Periodic sweep: every N seconds, click the chat button to open it, run `sweepExisting()`, then close
- Sticky open: intercept Zoom's close action and re-open immediately
- Least-disruptive: add a "Keep open" toggle to the HC panel that clicks the Zoom chat button whenever it gets hidden

### Microsoft Teams support
Add `adapter-teams.js` for `teams.microsoft.com` (work) and `teams.live.com` (personal).

- Teams browser uses stable `data-tid` attributes (e.g. `data-tid="messageBodyContent"`) — more resilient than Airmeet's class names
- Two Teams variants exist: classic and new Teams (2023 rewrite, same URL) — initial development will target new Teams only; classic Teams support can be added later
- Several paid extensions target Teams browser successfully, so the DOM is hookable
- Requires a live Teams browser meeting for DOM inspection (same console snippet approach as Airmeet)
- Once selectors are confirmed, the adapter should be ~30 lines given the shared core
