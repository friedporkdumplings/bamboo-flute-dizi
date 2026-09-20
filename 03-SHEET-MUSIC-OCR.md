# Sheet Music Upload + OCR

## Goal

Convert Chinese jianpu / numbered sheet music into a sequence of playable notes.

Example:

```text
5 3 1 | 5 2 | 1
```

becomes:

```ts
[
  "5",
  "3",
  "1",
  "5",
  "2",
  "1"
]
```

The user can then navigate through these notes.

## Critical Product Decision

Do NOT require perfect OCR for the MVP.

The sheet music upload feature should work even if OCR fails.

Always provide:

- Manual Note Entry
- OCR Correction

## Upload

Support:

- PNG
- JPG
- JPEG
- PDF

On upload:

1. Validate file.
2. Show preview.
3. For PDF, render pages using PDF.js.
4. Store current document in local application state.

## Manual Mode

Before OCR exists, support:

Enter notes:

```text
5 3 1 | 5 2 | 1
```

Parse:

- spaces
- commas
- measure bars
- line breaks

Output standardized note sequence.

## Note Model

Example:

```ts
interface MusicNote {
  id: string;
  pitch: string;
  octave?: number;
  duration?: number;
  sourceBoundingBox?: BoundingBox;
}
```

Initially:

`pitch` is enough.

Example:

```ts
{
  id: "note-15",
  pitch: "5"
}
```

## OCR Stage 1

Initial recognition target:

```text
1
2
3
4
5
6
7
0
```

Potential meaning:

`0 = rest`

Ignore lyrics.

Ignore Chinese characters.

Ignore complex notation.

## OCR Pipeline

Uploaded Image  
↓  
Preprocessing  
↓  
Identify notation region  
↓  
OCR  
↓  
Filter numerical notation  
↓  
Sequence parser  
↓  
User correction  
↓  
MusicNote[]

## Image Preprocessing

Possible preprocessing:

- grayscale
- contrast increase
- thresholding
- crop whitespace
- deskew
- remove lyric-heavy lower areas if possible

Do not over-engineer preprocessing before testing basic OCR.

## Important Jianpu Difficulty

Numbers alone are not enough for full interpretation.

Jianpu can contain:

- dots above notes
- dots below notes
- lines underneath notes
- rests
- ties
- bar lines
- slurs

Therefore build OCR progressively.

## Stage 1 OCR

Recognize only note number.

Example:

```text
5 3 1 5 2
```

## Stage 2 OCR

Detect octave markers.

Example:

dot above 5 = higher octave

dot below 5 = lower octave

Data:

```ts
{
  pitch: "5",
  octave: 1
}
```

## Stage 3 OCR

Recognize rhythm information.

Only attempt after note recognition works reliably.

## Correction UI

OCR must never silently assume it is correct.

After OCR:

Detected notes:

```text
5 3 1 5 2 1 1
```

Allow editing directly:

```text
[ 5 ][ 3 ][ 1 ][ 5 ][ 2 ][ 1 ][ 1 ]
```

Possible interactions:

- click number to change
- delete note
- insert note
- reorder
- manual text edit

Button:

```text
[ Use These Notes ]
```

## Sheet Display

Right panel shows original music.

Later:

Store `sourceBoundingBox` from OCR.

When current note changes:

highlight the matching region on the sheet.

This is a later enhancement.

## OCR Technology Evaluation

Test multiple approaches before committing.

Possible options:

- browser OCR
- Tesseract.js
- server-side OCR
- vision model
- specialized music notation recognition

Because jianpu is visually specialized, generic OCR may not be sufficiently reliable.

The product should remain functional with manual correction.

## Success Criteria

OCR module succeeds when:

1. User uploads a sheet.
2. User sees the sheet.
3. System produces a probable note sequence.
4. User can correct mistakes easily.
5. Final output becomes `MusicNote[]`.
6. Practice system can consume `MusicNote[]`.
