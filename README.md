# Human Chat

A Chrome/Firefox extension that gives you a clean, human-only chat panel during online meetings. AI notetaker bots are filtered out in real-time so you only see messages from actual people.

> **Browser-based meetings only.** This is a browser extension, so it only works when you join a meeting in your web browser. If you launch Zoom from the desktop app, the extension never runs and no chat will be captured — you must use [Zoom in the browser](https://app.zoom.us) instead.

## Features

- **Sender context** — captures each person's title or company (when set in their profile) alongside their name, included in all exports
- **Bot filtering** — automatically suppresses messages from Otter, Fireflies, Fathom, Gong, and 20+ other AI notetakers
- **Live panel** — draggable, minimizable overlay that sits alongside the meeting UI
- **Export** — save the chat as `.txt` or `.json`, or copy it to the clipboard with one click
- **Auto-save** — saves a `.txt` transcript automatically when the meeting ends
- **Q&A capture** — on Airmeet, a "Q&A" button sweeps the Q&A panel and appends all questions to your export
- **Multi-platform** — works on Google Meet, Airmeet, and Zoom web from a single install

## Installation

1. Clone or download this repo
2. Open Chrome and go to `chrome://extensions`
3. Enable **Developer mode** (toggle in the top-right corner)
4. Click **Load unpacked** and select the folder containing `manifest.json`

The panel will appear automatically the next time you join a supported meeting in your browser.

## Usage

- The panel appears in the lower-left (Meet, Zoom) or lower-right (Airmeet) corner of the meeting page
- **−** minimizes the panel; **✕** hides it entirely (click the **💬** pill to bring it back)
- The panel is draggable — grab the header bar to reposition it
- **Save .txt** / **Save .json** download the full chat transcript
- **Copy** copies the transcript as plain text to your clipboard
- **Q&A** (Airmeet only) — sweeps the Q&A panel and saves all questions; click it any time during the session; questions are deduplicated so you can click it multiple times safely
- The badge in the header shows how many bot messages were filtered

## Supported platforms

| Platform | URL | Notes |
|---|---|---|
| Google Meet | `meet.google.com` | Panel lower-left |
| Airmeet | `*.airmeet.com` | Panel lower-right; includes Q&A capture |
| Zoom | `app.zoom.us` | Must use Zoom in the browser, not the desktop app |

## Joining a meeting late

If you join after chat messages have already been sent, you can scroll back through the platform's native chat panel. The extension's MutationObserver will pick up every message that enters the DOM as you scroll, and they'll appear in the Human Chat panel — fully filtered, just like live messages.

**Caveat:** messages recovered by scrolling back will appear in the panel in the order they were captured (i.e. the order you scrolled through them), not necessarily in the order they were originally sent. If you scroll around non-linearly the saved transcript may be out of chronological sequence.

## Timestamps

Saved transcripts include a timestamp for each message in the format `[10:32 AM] Sender: text`, but this reflects the time the extension captured the message, not the original send time from the platform. For messages received in real-time the difference is negligible. For messages recovered by scrolling back after a late join, all those entries will show roughly the same capture time rather than their original send times — the platform's timestamps exist in the chat DOM but are not currently extracted.

## Known bot list

The extension filters messages from senders matching these tools (by name or message pattern): Otter / OtterPilot, Fireflies, Fathom, Krisp, Notta, tl;dv, Avoma, Fellow, Read.ai, MeetGeek, Gong, Chorus, Clari, Jamie, Tactiq, Grain, Nyota, Sembly, Vowel, Airgram, Bluedot, Supernormal, and generic patterns like "notetaker", "AI scribe", "meeting recorder".

## Something not working?

See [DEBUGGING.md](DEBUGGING.md) for a step-by-step guide on how to collect diagnostic information and file a bug report.

## File structure

```
manifest.json       Extension manifest (MV3)
background.js       Service worker — handles file downloads
core.js             Shared UI, bot filter, message store, and export logic
adapter-meet.js     Google Meet DOM adapter
adapter-airmeet.js  Airmeet DOM adapter (chat + Q&A)
adapter-zoom.js     Zoom web DOM adapter
styles.css          Panel styles
```
