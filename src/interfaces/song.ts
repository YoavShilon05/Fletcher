import {CueCall, ExtraCueNames, SongSection} from "@/interfaces/song-section.ts";

export interface Song {
  name: string;
  tempo: number;
  key?: string;
  structure: SongSection[];
  extraCalls: CueCall<ExtraCueNames>[];
  timelineLocation: number;
  end?: number;
}