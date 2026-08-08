import {Song} from "@/interfaces/song.ts";

export const getChartStart = (song: Song) =>
  song.structure.at(0)?.timelineLocation ?? song.timelineLocation;
