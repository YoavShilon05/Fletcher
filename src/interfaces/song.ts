import {SongSection} from "@/interfaces/song-section.ts";

export interface Song {
  name: string;
  bpm: number;
  key?: string;
  structure: SongSection[];
  timelineLocation: number
}