export type ParsedNote = {
  pitch: string;
};

export type NoteParseResult =
  | { notes: ParsedNote[]; error: null }
  | { notes: []; error: string };

const ALLOWED_INPUT = /^[1-7\s,|]*$/;
const MAX_NOTES = 256;

export function parseNumberedNotes(input: string): NoteParseResult {
  const trimmed = input.trim();
  if (!trimmed) return { notes: [], error: "Enter at least one note from 1 to 7." };
  if (!ALLOWED_INPUT.test(trimmed)) {
    return { notes: [], error: "Use only notes 1–7, spaces, commas, measure bars, or line breaks." };
  }

  const pitches = [...trimmed].filter((character) => /[1-7]/.test(character));
  if (pitches.length === 0) return { notes: [], error: "Enter at least one note from 1 to 7." };
  if (pitches.length > MAX_NOTES) return { notes: [], error: `Keep the sequence under ${MAX_NOTES} notes.` };

  return { notes: pitches.map((pitch) => ({ pitch })), error: null };
}
