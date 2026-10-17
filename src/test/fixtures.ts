import type { TimeSignatureContext } from "@/features/music/time-signature";
import { SectionNames, type Song } from "@/types/song";

export const FOUR_FOUR = { numerator: 4, denominator: 4 };

export const ctx = (overrides: Partial<TimeSignatureContext> = {}): TimeSignatureContext => ({
  changes: [],
  scenes: [],
  global: FOUR_FOUR,
  ...overrides,
});

/** A song at beat 100 with a 4-beat count-in, sections at 104 / 136 / 168, ending at 200. */
export const song = (overrides: Partial<Song> = {}): Song => ({
  name: "Song A",
  tempo: 120,
  timelineLocation: 100,
  end: 200,
  structure: [
    { name: SectionNames.INTRO, timelineLocation: 104 },
    { name: SectionNames.VERSE, timelineLocation: 136 },
    { name: SectionNames.CHORUS, timelineLocation: 168 },
  ],
  extraCalls: [],
  ...overrides,
});
