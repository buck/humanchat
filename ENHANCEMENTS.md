# Enhancement Ideas

## In progress

### Airmeet quoted/reply messages
When a chat message quotes an earlier message, the quoted bubble appears as a nested element inside the message container. Currently not captured.
- Need DOM inspection during a live Airmeet meeting with a visible quoted message
- Safe console snippet to run: `document.querySelector('[class*="Quote"],[class*="quote"],[class*="Reply"],[class*="reply"]')?.className`
- Once selector is found: store as `msg.quotedText` in JSON; prefix with `> ` in .txt export

## Planned

### Microsoft Teams support
Add `adapter-teams.js` for `teams.microsoft.com` (work) and `teams.live.com` (personal).

- Teams browser uses stable `data-tid` attributes (e.g. `data-tid="messageBodyContent"`) — more resilient than Airmeet's class names
- Two Teams variants exist: classic and new Teams (2023 rewrite, same URL) — need to confirm which is in use during inspection
- Several paid extensions target Teams browser successfully, so the DOM is hookable
- Requires a live Teams browser meeting for DOM inspection (same console snippet approach as Airmeet)
- Once selectors are confirmed, the adapter should be ~30 lines given the shared core
