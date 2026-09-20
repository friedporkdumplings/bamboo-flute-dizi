# UX + HCI Specification

## Design Principle

The camera interaction is the most important part of the application.

The user is physically holding a flute while looking at their laptop, so the interface needs to communicate information very quickly.

The user should not need to read paragraphs while practicing.

Primary visual hierarchy:

1. Camera
2. Current note
3. Required fingering
4. Correct / incorrect feedback
5. Sheet music

## Main Layout

Desktop first.

Recommended split:

- Camera: 65–70%
- Sheet / controls: 30–35%

Example:

```text
--------------------------------------------------------
| bamboo.                            Practice           |
--------------------------------------------------------
|                                      |               |
|                                      | SHEET         |
|          LIVE CAMERA                 | MUSIC         |
|                                      |               |
|                                      |---------------|
|                                      | CURRENT       |
|                                      | NOTE: 5       |
|                                      | ●●●●●●        |
--------------------------------------------------------
|      YOUR FINGERS           TARGET FINGERS           |
|      ●●●○●●                 ●●●●●●                   |
|                    Fix hole 4                        |
--------------------------------------------------------
```

## Color Direction

Background: `#F5FAF6`

Cards: `#FFFFFF`

Primary: `#8FB79A`

Dark green: `#345443`

Muted: `#748078`

Borders: `#E2EBE4`

Correct: soft green

Incorrect: muted coral / red

Avoid visually aggressive warning states.

## Setup Flow

### Step 1 — Upload Song

User sees:

Upload your sheet music

[ Upload PDF / Image ]

or

[ Enter notes manually ]

After successful upload:

✓ Song loaded

### Step 2 — Camera Setup

Request webcam permission.

Show large camera view.

Overlay:

"Hold your flute horizontally inside this guide."

Display a soft flute-shaped alignment region.

### Step 3 — Flute Calibration

Do not immediately attempt advanced object recognition.

Instead:

1. User positions flute.
2. App freezes or snapshots frame.
3. User identifies first finger hole.
4. User identifies last finger hole.
5. App estimates intermediate positions.
6. User can drag markers if necessary.
7. Save calibration.

Optional better version:

Allow all six markers to be manually adjusted.

Button:

[ Confirm Hole Positions ]

## Practice Interaction

Once calibrated:

Camera remains large.

Overlay six hole positions.

Each target hole should have one of two states:

Covered: `●`

Open: `○`

Camera interpretation can appear separately:

TARGET

`● ● ● ● ● ○`

YOU

`● ● ● ○ ● ○`

Feedback:

`Cover hole 4`

## Feedback Design

Avoid paragraphs.

Good:

- ✓ Correct
- Cover hole 3
- Open hole 6
- Adjust fingers
- Camera lost flute
- Move flute into guide

Bad:

"Your current fingering configuration does not match the expected configuration."

## Current Note

Make the note large.

Example:

```text
CURRENT NOTE

5

● ● ● ● ● ●
```

The user needs to understand this at a glance.

## Controls

Essential:

- ← Previous
- Play / Pause
- Next →
- Recalibrate
- Camera On / Off
- Edit Notes

Optional later:

- speed
- loop section
- restart
- zoom music

## Sheet Music Panel

The sheet should not dominate the screen.

Allow the panel to:

- scroll
- zoom
- collapse
- expand temporarily

Highlight the current note later if technically possible.

For early MVP:

Show sheet + separate current note.

## HCI Constraints

Remember that the user's hands are occupied.

Therefore:

- large click targets
- minimal navigation
- few controls
- keyboard shortcuts later
- avoid tiny buttons
- avoid requiring repeated mouse interaction

Possible keyboard mappings:

- Left Arrow = previous note
- Right Arrow = next note
- Space = play/pause
- R = recalibrate

## Empty State

When opening app:

Learn bamboo flute visually.

Upload your music and follow the fingering guide while practicing with your camera.

[ Upload Sheet Music ]

or

[ Start with Manual Notes ]

## UX Success Criteria

A first-time user should understand within approximately 10 seconds:

- where their camera goes
- where their music goes
- what note they are playing
- which holes should be covered
- whether their fingering is correct
