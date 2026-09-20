export type Fingering = readonly [boolean, boolean, boolean, boolean, boolean, boolean];
export type NoteRegister = "low" | "middle" | "high";
export type HoleState = "covered" | "open" | "half";
export type AlternateFingering = readonly [HoleState, HoleState, HoleState, HoleState, HoleState, HoleState];

export type NoteKey =
  | "low-5" | "low-6" | "low-7"
  | "middle-1" | "middle-2" | "middle-3" | "middle-4" | "middle-5" | "middle-6" | "middle-7"
  | "high-1" | "high-2" | "high-3" | "high-4" | "high-5" | "high-6";

export type FingeringDefinition = {
  pitch: string;
  register: NoteRegister;
  chineseLabel: string;
  breath: "gentle" | "firm" | "overblown";
  holes: Fingering;
  alternates?: AlternateFingering[];
};

export const fingeringMap: Record<NoteKey, FingeringDefinition> = {
  "low-5": { pitch: "5", register: "low", chineseLabel: "低音 5", breath: "gentle", holes: [true, true, true, true, true, true] },
  "low-6": { pitch: "6", register: "low", chineseLabel: "低音 6", breath: "gentle", holes: [true, true, true, true, true, false] },
  "low-7": { pitch: "7", register: "low", chineseLabel: "低音 7", breath: "gentle", holes: [true, true, true, true, false, false] },
  "middle-1": { pitch: "1", register: "middle", chineseLabel: "中音 1", breath: "firm", holes: [true, true, true, false, false, false] },
  "middle-2": { pitch: "2", register: "middle", chineseLabel: "中音 2", breath: "firm", holes: [true, true, false, false, false, false] },
  "middle-3": { pitch: "3", register: "middle", chineseLabel: "中音 3", breath: "firm", holes: [true, false, false, false, false, false] },
  "middle-4": {
    pitch: "4", register: "middle", chineseLabel: "中音 4", breath: "firm",
    holes: [false, true, true, false, false, false],
    alternates: [
      ["half", "open", "open", "open", "open", "open"],
      ["open", "covered", "covered", "covered", "open", "open"],
    ],
  },
  "middle-5": {
    pitch: "5", register: "middle", chineseLabel: "中音 5", breath: "firm",
    holes: [true, true, true, true, true, true],
    alternates: [["open", "covered", "covered", "covered", "covered", "covered"]],
  },
  "middle-6": { pitch: "6", register: "middle", chineseLabel: "中音 6", breath: "firm", holes: [true, true, true, true, true, false] },
  "middle-7": { pitch: "7", register: "middle", chineseLabel: "中音 7", breath: "firm", holes: [true, true, true, true, false, false] },
  "high-1": { pitch: "1", register: "high", chineseLabel: "高音 1", breath: "overblown", holes: [true, true, true, false, false, false] },
  "high-2": { pitch: "2", register: "high", chineseLabel: "高音 2", breath: "overblown", holes: [true, true, false, false, false, false] },
  "high-3": { pitch: "3", register: "high", chineseLabel: "高音 3", breath: "overblown", holes: [true, false, false, false, false, false] },
  "high-4": {
    pitch: "4", register: "high", chineseLabel: "高音 4", breath: "overblown",
    holes: [false, true, true, true, true, false],
    alternates: [
      ["half", "open", "open", "open", "open", "open"],
      ["open", "covered", "open", "open", "open", "open"],
      ["covered", "open", "covered", "covered", "open", "open"],
    ],
  },
  "high-5": {
    pitch: "5", register: "high", chineseLabel: "高音 5", breath: "overblown",
    holes: [false, true, true, true, true, true],
    alternates: [["open", "covered", "covered", "open", "open", "open"]],
  },
  "high-6": { pitch: "6", register: "high", chineseLabel: "高音 6", breath: "overblown", holes: [true, true, false, true, true, false] },
};
