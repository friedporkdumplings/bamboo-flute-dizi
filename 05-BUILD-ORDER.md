# Recommended Build Order

## Recommended sequence

Build the project in this order:

1. Design layout
2. HCI interaction
3. Bamboo fingering detection
4. Sheet upload
5. OCR
6. Integration
7. Polish

## Why this order matters

The highest-risk technical problem is not the UI or even OCR.

The most important technical experiment is whether the laptop camera can reliably estimate whether the six flute holes are covered.

Prove that interaction first.

Do not spend significant time on OCR until this interaction works.

## Milestone 1 — Design Prototype

Build the whole interface using fake data.

Target result:

```text
CURRENT NOTE: 6

Target
● ● ● ● ● ○

Your Fingers
● ● ● ● ○ ○

Cover hole 5
```

No real camera logic yet.

## Milestone 2 — Camera + Calibration

Get webcam access working.

Add six draggable hole markers.

The user should be able to:

1. start camera
2. position flute
3. click or drag six markers over the holes
4. confirm calibration

Store normalized coordinates.

## Milestone 3 — Hand Tracking

Add MediaPipe.

First display raw landmarks.

Then determine which finger segments overlap calibrated hole regions.

Add temporal smoothing.

At the end of this milestone, manually choose a target fingering and compare it against the camera result.

This is the first major technical proof.

## Milestone 4 — Fingering Engine

Create a clean fingering map.

Example:

```ts
{
  note: "6",
  holes: [true, true, true, true, true, false]
}
```

Make it configurable and separate from UI logic.

## Milestone 5 — Sheet Upload

Support:

- PNG
- JPG
- PDF

Display the sheet in the right panel.

Do not add OCR immediately.

## Milestone 6 — Manual Notes

Allow manual note entry:

```text
5 3 1 | 5 2 | 1
```

Parse it into the practice engine.

Now the app should work end-to-end without OCR.

This is already a valid MVP.

## Milestone 7 — OCR

Experiment with automatic recognition.

Start with only:

```text
1 2 3 4 5 6 7 0
```

Always include an OCR correction screen.

Do not make automatic recognition a blocker.

## Milestone 8 — Integration

Connect:

```text
sheet
→ notes
→ current note
→ fingering map
→ camera result
→ feedback
```

## Milestone 9 — Polish

Add:

- smoother transitions
- keyboard shortcuts
- collapsible sheet panel
- better calibration UX
- better confidence states
- optional auto advance
- current-note highlighting
- localStorage persistence

## MVP stopping point

A successful first release should allow:

1. Upload sheet.
2. Enter or extract numbered notes.
3. Start camera.
4. Calibrate six flute holes.
5. Practice note by note.
6. See target fingering.
7. See detected fingering.
8. Receive clear correction feedback.

Anything beyond this is V2.
