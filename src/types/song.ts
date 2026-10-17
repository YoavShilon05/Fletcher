/** Locator name that marks where the preceding song ends. */
export const STOP_SONG = "STOP";

/** Locator names that mark a section of the current song. */
export enum SectionNames {
  INTRO = "INTRO",
  VERSE = "VERSE",
  PRE_CHORUS = "PRE_CHORUS",
  POST_CHORUS = "POST_CHORUS",
  CHORUS = "CHORUS",
  BRIDGE = "BRIDGE",
  SOLO = "SOLO",
  BUILDUP = "BUILDUP",
  INTERLUDE = "INTERLUDE",
  BREAKDOWN = "BREAKDOWN",
  OUTRO = "OUTRO",
}

/** Locator names that mark a spoken cue inside a section (not a section of its own). */
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
export type ExtraCall = CueCall<ExtraCueNames>;

/**
 * A song in the setlist, built from the Live set's locators. Songs are
 * identified by `name` — Song objects are rebuilt whenever the locators or
 * scenes change, so never compare them by reference.
 */
export interface Song {
  name: string;
  tempo: number;
  key?: string;
  structure: SongSection[];
  extraCalls: ExtraCall[];
  timelineLocation: number;
  end?: number;
}
