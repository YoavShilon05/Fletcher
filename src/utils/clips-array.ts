import {ExtraCueNames, SectionNames} from "@/interfaces/song-section.ts";

export const countClips = [
  ...Array.from({ length: 8 }, (_, i) => (i + 1).toString()),
  ...Object.values(SectionNames).map(value => value.toLowerCase()),
  ...Object.values(ExtraCueNames).map(value => value.toLowerCase())
]

// Fired from the Fletcher_Control track — these are navigation triggers, not
// spoken cues. Order matters: clip slot index must match array index.
export const controlClips = [
  "next_song",
  "prev_song",
  "next_section",
  "prev_section",
] as const
