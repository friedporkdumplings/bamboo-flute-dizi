# Bamboo Flute Fingering Detection

## Goal

Determine whether the user's fingers are covering the six playable finger holes required for the current note.

Do NOT begin by training a custom flute-recognition model.

The first version should use:

Camera  
+  
User calibration  
+  
MediaPipe hand landmarks  
+  
Spatial comparison

## Core Pipeline

Camera Frame  
↓  
Flute Calibration  
↓  
Six Hole Coordinates  
↓  
Hand Landmark Detection  
↓  
Finger / Hole Distance Calculation  
↓  
Detected Hole State  
↓  
Compare Against Target Fingering

## Step 1 — Camera

Use:

```ts
navigator.mediaDevices.getUserMedia()
```

Display the stream using a video element.

Place a canvas directly above the video.

Canvas handles:

- flute guide
- hole markers
- finger debug points
- correct/incorrect state

## Step 2 — Calibration

Start simple.

Ask the user to place the flute roughly horizontally.

Option A:

User clicks all six holes.

Option B:

User clicks the first and sixth hole.

Interpolate holes 2–5.

Option C:

Computer vision estimates positions, user corrects them.

For the MVP, Option A is safest.

Store:

```ts
interface HolePosition {
  id: number;
  x: number;
  y: number;
}
```

Hole coordinates should be normalized:

0–1 instead of fixed pixel coordinates.

Example:

```ts
{
  id: 1,
  x: 0.31,
  y: 0.51
}
```

This prevents coordinate problems if the video size changes.

## Step 3 — MediaPipe Hands

Use MediaPipe Hand Landmarker.

Detect both hands.

Important landmarks may include:

- fingertips
- distal joints
- middle joints

Do not assume the fingertip itself always sits directly over the hole.

A flute player may cover a hole using part of the finger pad.

Therefore consider a coverage zone around multiple finger landmarks.

## Step 4 — Hole Coverage

Each calibrated hole has:

- center coordinate
- radius / tolerance

Example:

```ts
interface FluteHole {
  id: number;
  x: number;
  y: number;
  radius: number;
}
```

For each hand landmark:

```text
distance = sqrt(
  (fingerX - holeX)^2 +
  (fingerY - holeY)^2
)
```

If:

```text
distance < threshold
```

then the hole may be covered.

## Better Detection

A single fingertip threshold may be unstable.

Improve by using:

- fingertip
- DIP joint
- finger segment
- confidence over several frames

Possible logic:

```text
holeCovered = fingerSegmentIntersectsHoleArea
```

Instead of:

```text
holeCovered = fingertipNearHole
```

## Temporal Smoothing

Camera predictions will flicker.

Store recent states.

Example:

```text
last 5 frames:

covered
covered
open
covered
covered

Output:

covered
```

Use a majority or confidence system.

## Detection State

Each hole should return:

- `covered`
- `open`
- `uncertain`

Example:

```ts
type HoleState =
  | "covered"
  | "open"
  | "uncertain";
```

## Fingering Configuration

Keep target fingerings separate from detection.

Example:

```ts
type Fingering = {
  note: string;
  holes: [
    boolean,
    boolean,
    boolean,
    boolean,
    boolean,
    boolean
  ];
};
```

Example only:

```ts
{
  note: "5",
  holes: [true, true, true, true, true, true]
}
```

Never permanently embed these mappings inside React components.

Store them in:

```text
/lib/fingeringMap.ts
```

## Comparison

target:

```text
[true, true, true, true, true, false]
```

detected:

```text
[true, true, false, true, true, false]
```

difference:

```text
hole 3
```

UI:

```text
Cover hole 3
```

## Debug Mode

Create an optional developer/debug mode.

Show:

- MediaPipe landmarks
- hole coordinates
- detection radius
- current distances
- confidence values
- detected flute orientation

This is extremely useful during development.

Do not show these by default in the polished UI.

## Future Flute Detection

Later versions may detect:

- flute body edges
- circular dark holes
- flute orientation
- six-hole sequence

Possible techniques:

OpenCV:
- grayscale
- contrast
- Hough circle detection
- contour detection
- line detection

or custom object detection model.

Do not make these dependencies for V1.

## Success Criteria

The fingering module succeeds if:

1. User calibrates six holes.
2. MediaPipe sees their hands.
3. App determines approximate hole coverage.
4. State does not flicker excessively.
5. App identifies incorrect hole positions.
6. Detection works independently of sheet music.
