import {CueCall, ExtraCueNames, SongSection} from "@/interfaces/song-section.ts";

export interface Song {
  name: string;
  bpm: number;
  key?: string;
  structure: SongSection[];
  extraCalls: CueCall<ExtraCueNames>[];
  timelineLocation: number;
  end?: number;
}