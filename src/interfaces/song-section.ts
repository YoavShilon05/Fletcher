
export const STOP_SONG = "STOP" as const;

export enum SectionNames {
  INTRO = "INTRO",
  VERSE = "VERSE",
  PRE_CHORUS = "PRE_CHORUS",
  CHORUS = "CHORUS",
  BRIDGE = "BRIDGE",
  SOLO = "SOLO",
  BREAKDOWN = "BREAKDOWN",
  OUTRO = "OUTRO"
}

export enum ExtraCueNames {
  BREAK = "BREAK",
  IMPROV = "IMPROV",
  UNISON = "UNISON",
  FADE = "FADE",
  DOUBLE_TIME = "DOUBLE_TIME",
  HALF_TIME = "HALF_TIME",
}

export interface CueCall<T extends string> {
  name: T;
  timelineLocation: number;
}

export type SongSection = CueCall<SectionNames>;