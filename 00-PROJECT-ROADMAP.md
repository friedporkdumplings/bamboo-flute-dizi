# Bamboo Flute Visual Tutor

## Project Goal

Build a desktop-first web application that helps beginners learn Chinese bamboo flute (dizi) without needing to understand Chinese sheet music.

The user should eventually be able to:

1. Upload sheet music.
2. Convert numbered notation into a sequence of notes.
3. Turn on their laptop camera.
4. Hold their bamboo flute in front of the camera.
5. See the six main finger holes mapped on screen.
6. See which holes should be covered for the current note.
7. Receive visual feedback about whether their fingers are positioned correctly.
8. Move through the song note by note.

The final interaction should feel like:

> Upload song → calibrate flute → practice visually.

## Core Stack

### Frontend
- Next.js
- React
- TypeScript
- Tailwind CSS

### Camera / CV
- Browser `getUserMedia`
- MediaPipe Hand Landmarker
- HTML Canvas overlay
- Optional OpenCV.js

### Sheet Music
- PDF.js
- image uploads
- OCR layer added later

### Storage
- localStorage for MVP

### Deployment
- Vercel
- GitHub repository

## Build Strategy

The project must be built in separate stages.

Do not attempt OCR, hand tracking, flute recognition, and application integration simultaneously.

Each stage should work independently before moving forward.

## Phase 1 — UX / Interface

Goal:

Build the entire visual interface using mocked data.

No computer vision.
No OCR.

The app should already feel usable even though the underlying intelligence is fake.

Deliverables:

- app shell
- light sage design system
- large camera panel
- sheet music panel
- current note display
- six-hole diagram
- previous/next controls
- calibration UI
- fake correct/incorrect state
- responsive desktop layout

Exit requirement:

The user can click through a fake song and understand exactly how the finished product will work.

## Phase 2 — Camera + HCI

Goal:

Make interaction with the physical flute work.

Deliverables:

- webcam access
- camera preview
- flute alignment guide
- calibration flow
- six hole coordinates
- MediaPipe hand detection
- hand landmarks displayed for debugging
- mapping between fingers and flute holes
- target vs detected fingering comparison

Do not attempt automatic flute recognition initially.

Use user-assisted calibration.

Exit requirement:

Given a manually selected target fingering, the system can estimate whether the user is covering the correct holes.

## Phase 3 — Sheet Music Upload + OCR

Goal:

Turn uploaded sheet music into usable numbered notes.

Deliverables:

- JPG upload
- PNG upload
- PDF upload
- sheet viewer
- manual note sequence input
- note parser
- basic OCR experimentation
- OCR correction interface
- parsed note sequence

Initial OCR target:

Recognize:

1 2 3 4 5 6 7

Later support:

- octave dots
- rests
- measure lines
- durations
- slurs

Exit requirement:

An uploaded sheet can produce a usable note sequence, even if the user needs to correct OCR mistakes manually.

## Phase 4 — Integration

Goal:

Connect the sheet music system with the camera practice system.

Flow:

Uploaded Sheet  
↓  
Parsed Notes  
↓  
Current Note  
↓  
Fingering Mapping  
↓  
Target Hole Pattern  
↓  
Camera Detection  
↓  
User Hole Pattern  
↓  
Comparison  
↓  
Feedback

Exit requirement:

A user can upload a song and practice through it note by note using the webcam.

## Phase 5 — Polish

Possible later improvements:

- automatic flute detection
- stronger hole detection
- octave interpretation
- rhythm support
- automatic note progression
- audio pitch detection
- song saving
- practice history
- multiple fingering systems
- Chinese/English translations
- mobile/tablet support

## MVP Definition

The MVP does NOT require:

- perfect OCR
- automatic flute recognition
- pitch detection
- rhythm detection
- automatic song timing
- accounts
- cloud storage

The MVP DOES require:

- attractive UI
- camera
- calibration
- hand tracking
- six-hole fingering comparison
- uploaded sheet display
- manual or partially automatic note extraction
- current-note navigation
- integration between notes and fingering guidance
