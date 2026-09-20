# Practice System Integration

## Goal

Connect:

Sheet Music  
+  
Fingering Mapping  
+  
Camera Fingering Detection

into one practice experience.

## Final Data Flow

### Upload

Sheet Image / PDF  
↓  
OCR / Manual Input  
↓  
MusicNote[]

### Practice Engine

MusicNote[currentIndex]  
↓  
note.pitch  
↓  
Fingering Map  
↓  
Target Fingering

### Camera

Webcam  
↓  
Hand Detection  
↓  
Hole Detection  
↓  
Detected Fingering

### Comparison

Target Fingering  
vs  
Detected Fingering  
↓  
Feedback

## Main Application State

Example:

```ts
interface PracticeState {
  notes: MusicNote[];
  currentNoteIndex: number;

  targetFingering: Fingering | null;
  detectedFingering: DetectedFingering | null;

  fluteCalibration: FluteCalibration | null;

  cameraEnabled: boolean;
  playing: boolean;
}
```

## Current Note Logic

```text
currentNote =
notes[currentNoteIndex]

targetFingering =
fingeringMap[currentNote.pitch]
```

Display both.

## Next Note

When user presses:

```text
Next →
```

```text
currentNoteIndex += 1
```

Update:

- current note
- target fingering
- highlighted music location
- camera comparison

## Previous Note

Previous:

```text
currentNoteIndex -= 1
```

Ensure index never falls below 0.

## Fingering Comparison

Function:

```ts
compareFingering(
  target,
  detected
)
```

Return:

```ts
{
  correct: false,
  errors: [
    {
      hole: 4,
      expected: "covered",
      detected: "open"
    }
  ]
}
```

## Feedback Generation

Translate differences into human language.

Examples:

Target:

```text
● ● ● ● ● ○
```

Detected:

```text
● ● ● ○ ● ○
```

Feedback:

```text
Cover hole 4
```

## Auto Advance

Later option:

If target fingering has been correctly held for a minimum amount of time:

```text
800ms
```

automatically advance to next note.

This should be OPTIONAL.

Beginners may prefer manual progression.

## Practice UI

Main screen:

LEFT 70%

Large camera

- video
- flute guide
- six hole overlay
- hand tracking result

RIGHT 30%

Sheet Music

Current Note

```text
5
```

Target:

```text
● ● ● ● ● ●
```

Your Fingers:

```text
● ● ● ○ ● ●
```

```text
Fix hole 4
```

```text
← Previous      Next →
```

## Application Modes

Possible state machine:

```text
UPLOAD
↓
SETUP
↓
CALIBRATION
↓
PRACTICE
↓
COMPLETE
```

## Upload State

User selects sheet or enters notes.

## Setup State

Sheet successfully parsed.

Show:

```text
Song ready

[ Set Up Camera ]
```

## Calibration State

User positions flute.

Configure six holes.

Save calibration.

## Practice State

Current note navigation begins.

## Complete State

Simple:

```text
Song complete ✓

[ Practice Again ]
```

No complex analytics needed for MVP.

## Error States

Camera permission denied:

```text
Camera access is needed for live fingering feedback.

[ Try Again ]
```

Flute calibration missing:

```text
Calibrate your flute before starting practice.

[ Calibrate ]
```

Hands not detected:

```text
Move your hands into the camera view.
```

Sheet OCR failed:

```text
We couldn't confidently read this sheet.

[ Edit Notes Manually ]
```

## Integration Development Order

Do not connect everything at once.

Step 1:
Use fake notes + fake camera result.

Step 2:
Use real notes + fake camera result.

Step 3:
Use real notes + real target fingering.

Step 4:
Use real camera detection + manually selected target.

Step 5:
Connect current note to target fingering.

Step 6:
Connect target fingering to camera comparison.

Step 7:
Add uploaded sheet.

Step 8:
Add OCR output.

At every stage, keep the app functioning.

## Integration Success Criteria

The project is MVP-complete when:

1. User uploads a sheet.
2. Notes are manually entered or OCR extracted.
3. User calibrates six flute holes.
4. User begins practice.
5. App shows current note.
6. App shows required fingering.
7. Camera estimates actual fingering.
8. App identifies mismatches.
9. User progresses through the song.
