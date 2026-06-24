
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

export interface SongSection {
  name: SectionNames;
  timelineLocation: number;
}