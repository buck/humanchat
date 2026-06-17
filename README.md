# Human Chat

A Chrome/Firefox extension that gives you a clean, human-only chat panel during Google Meet and Airmeet meetings. AI notetaker bots are filtered out in real-time so you only see messages from actual people.

## Features

- **Bot filtering** — automatically suppresses messages from Otter, Fireflies, Fathom, Gong, and 20+ other AI notetakers
- **Live panel** — draggable, minimizable overlay that sits alongside the meeting UI
- **Export** — save the chat as `.txt` or `.json`, or copy it to the clipboard with one click
- **Auto-save** — saves a `.txt` transcript automatically when the meeting ends
- **Multi-platform** — works on Google Meet and Airmeet from a single install

## Installation

1. Clone or download this repo
2. Open Chrome and go to `chrome://extensions`
3. Enable **Developer mode** (toggle in the top-right corner)
4. Click **Load unpacked** and select the folder containing `manifest.json`

The panel will appear automatically the next time you join a Google Meet or Airmeet meeting.

## Usage

- The panel appears in the lower-left (Meet) or lower-right (Airmeet) corner of the meeting page
- **−** minimizes the panel; **✕** hides it entirely (click the **💬** pill to bring it back)
- The panel is draggable — grab the header bar to reposition it
- **Save .txt** / **Save .json** download the full chat transcript
- **Copy** copies the transcript as plain text to your clipboard
- The badge in the header shows how many bot messages were filtered

## Supported platforms

| Platform | URL | Panel position |
|---|---|---|
| Google Meet | `meet.google.com` | Lower-left |
| Airmeet | `*.airmeet.com` | Lower-right |

## Known bot list

The extension filters messages from senders matching these tools (by name or message pattern): Otter / OtterPilot, Fireflies, Fathom, Krisp, Notta, tl;dv, Avoma, Fellow, Read.ai, MeetGeek, Gong, Chorus, Clari, Jamie, Tactiq, Grain, Nyota, Sembly, Vowel, Airgram, Bluedot, Supernormal, and generic patterns like "notetaker", "AI scribe", "meeting recorder".

## File structure

```
manifest.json       Extension manifest (MV3)
background.js       Service worker — handles file downloads
core.js             Shared UI, bot filter, message store, and export logic
adapter-meet.js     Google Meet DOM adapter
adapter-airmeet.js  Airmeet DOM adapter
styles.css          Panel styles
```
