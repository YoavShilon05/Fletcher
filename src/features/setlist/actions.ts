import { atom } from "jotai";
import { isPlayingAtom } from "@/features/live/atoms";
import { live } from "@/lib/osc/live-api";
import type { Song, SongSection } from "@/types/song";
import { currentSectionAtom, selectedSongAtom } from "./atoms";

/** Move Live's playhead and its start marker to `beat`. */
export function cueTo(beat: number) {
  live.jumpTo(beat);
  live.setStartTime(beat);
}

/** Select a song from the UI and cue Live to its start. */
export const selectSongAtom = atom(null, (_get, set, song: Song) => {
  set(selectedSongAtom, song);
  set(currentSectionAtom, song.structure.at(0));
  cueTo(song.timelineLocation);
});

/**
 * Cue Live to a point of the selected song that isn't a section start (its
 * song locator, or its START). Ignored mid-playback.
 */
export const selectLocationAtom = atom(null, (get, set, beat: number) => {
  if (get(isPlayingAtom)) return;
  // Let the section follow the playhead to wherever the point sits.
  set(currentSectionAtom, undefined);
  cueTo(beat);
});

/** Select a section from the UI and cue Live to it. Ignored mid-playback. */
export const selectSectionAtom = atom(null, (get, set, section: SongSection) => {
  if (get(isPlayingAtom)) return;
  set(currentSectionAtom, section);
  cueTo(section.timelineLocation);
});
