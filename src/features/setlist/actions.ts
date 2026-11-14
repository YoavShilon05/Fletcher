import { atom } from "jotai";
import { isPlayingAtom } from "@/features/live/atoms";
import { live } from "@/lib/osc/live-api";
import type { Song, SongSection } from "@/types/song";
import { currentSectionAtom, selectedSongAtom } from "./atoms";

/**
 * The beat Fletcher last sent Live's cursor to. Live reports our own moves the
 * same way it reports the user's, so the snapper reads this to tell them apart.
 */
export const cuedBeatAtom = atom<number>();

/** Move Live's start marker — where the cursor parks when playback stops — to `beat`. */
export const cueStartAtom = atom(null, (_get, set, beat: number) => {
  set(cuedBeatAtom, beat);
  live.setStartTime(beat);
});

/** Move Live's playhead and its start marker to `beat`. */
export const cueToAtom = atom(null, (_get, set, beat: number) => {
  set(cuedBeatAtom, beat);
  live.jumpTo(beat);
  live.setStartTime(beat);
});

/** Select a song from the UI and cue Live to its start. */
export const selectSongAtom = atom(null, (_get, set, song: Song) => {
  set(selectedSongAtom, song);
  set(currentSectionAtom, song.structure.at(0));
  set(cueToAtom, song.timelineLocation);
});

/**
 * Cue Live to a point of the selected song that isn't a section start (its
 * song locator, or its START). Ignored mid-playback.
 */
export const selectLocationAtom = atom(null, (get, set, beat: number) => {
  if (get(isPlayingAtom)) return;
  // Let the section follow the playhead to wherever the point sits.
  set(currentSectionAtom, undefined);
  set(cueToAtom, beat);
});

/** Select a section from the UI and cue Live to it. Ignored mid-playback. */
export const selectSectionAtom = atom(null, (get, set, section: SongSection) => {
  if (get(isPlayingAtom)) return;
  set(currentSectionAtom, section);
  set(cueToAtom, section.timelineLocation);
});
