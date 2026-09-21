# Bamboo Flute Visual Tutor

A desktop-first visual practice interface for beginner dizi players.

## Current milestone

The camera setup now includes a personal staged hand map. Players save left-covered, right-covered, left-resting, and right-resting poses one at a time, leaving the other hand free to press the capture button. The tracker binds each hole to the matching index, middle, or ring finger and learns the distance between covered and resting poses, so raised fingers are not mistaken for played notes. Thumbs and pinkies are intentionally excluded from note detection.

The flute outline can be resized, rotated, repositioned, and adjusted for thickness before saving. During practice, stable palm anchors from the mapped hands translate, rotate, and scale the saved flute outline and hole coordinates as the player moves.

Local PNG, JPG, JPEG, and PDF sheet upload includes in-panel previews and PDF page navigation. MediaPipe Hand Landmarker provides two-hand landmark visualization and five-frame temporal smoothing. Camera video, calibration data, and uploaded sheets remain local to the browser.

Manual numbered-note entry accepts notes 1–7 separated by spaces, commas, measure bars, or line breaks. Applying the sequence immediately updates the current note, target fingering, progress, and previous/next navigation, completing the non-OCR MVP path.

The note sequence remains mocked. Manual note entry and OCR are intentionally reserved for later milestones.

## Run locally

```bash
npm install
npm run dev
```

Then open `http://localhost:3000`.
