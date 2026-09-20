# Bamboo Flute Visual Tutor

A desktop-first visual practice interface for beginner dizi players.

## Current milestone

The camera setup now includes a personal two-pose hand map. Players first cover all six holes, then lift the six playing fingers into their natural resting position. The tracker binds each hole to the matching index, middle, or ring finger and learns the distance between covered and resting poses, so raised fingers are not mistaken for played notes. Thumbs and pinkies are intentionally excluded from note detection.

Local PNG, JPG, JPEG, and PDF sheet upload includes in-panel previews and PDF page navigation. MediaPipe Hand Landmarker provides two-hand landmark visualization and five-frame temporal smoothing. Camera video, calibration data, and uploaded sheets remain local to the browser.

Manual numbered-note entry accepts notes 1–7 separated by spaces, commas, measure bars, or line breaks. Applying the sequence immediately updates the current note, target fingering, progress, and previous/next navigation, completing the non-OCR MVP path.

The note sequence remains mocked. Manual note entry and OCR are intentionally reserved for later milestones.

## Run locally

```bash
npm install
npm run dev
```

Then open `http://localhost:3000`.
