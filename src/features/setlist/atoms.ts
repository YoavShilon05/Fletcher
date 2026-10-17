import { atom } from "jotai";
import type { Song, SongSection } from "@/types/song";
import { currentBeatAtom, globalTempoAtom, locatorsAtom, scenesAtom } from "@/features/live/atoms";
import { buildSetlist } from "./build-setlist";
import { sectionAt } from "./sections";

/** The setlist, rebuilt whenever the locators, scenes or set tempo change. */
export const setlistAtom = atom((get) =>
  buildSetlist(get(locatorsAtom), get(scenesAtom), get(globalTempoAtom)),
);

/** Selection is stored by name, so it survives the setlist being rebuilt. */
const selectedSongNameAtom = atom<string>();

/** The selected song — the first one until something is picked. */
export const selectedSongAtom = atom(
  (get): Song | undefined => {
    const setlist = get(setlistAtom);
    const name = get(selectedSongNameAtom);
    return setlist.find((song) => song.name === name) ?? setlist[0];
  },
  (_get, set, song: Song | undefined) => set(selectedSongNameAtom, song?.name),
);

export const selectedSongIndexAtom = atom((get) => {
  const selected = get(selectedSongAtom);
  return get(setlistAtom).findIndex((song) => song.name === selected?.name);
});

/** The song after the selected one; undefined when the selected one is the last. */
export const nextSongAtom = atom((get): Song | undefined => {
  const index = get(selectedSongIndexAtom);
  return index === -1 ? undefined : get(setlistAtom)[index + 1];
});

/**
 * A section picked explicitly (clicked, snapped to, or cued), which wins over
 * the playhead until playback-follow clears it. Stored by song name + location
 * rather than by object for the same reason as the song selection.
 */
const sectionOverrideAtom = atom<{ songName: string; location: number } | null>(null);

/** The explicitly picked section of the selected song, if any. */
export const pickedSectionAtom = atom((get): SongSection | undefined => {
  const song = get(selectedSongAtom);
  const override = get(sectionOverrideAtom);
  if (!song || override?.songName !== song.name) return undefined;
  return song.structure.find((s) => s.timelineLocation === override.location);
});

/** The active section: the explicit pick if there is one, else the one under the playhead. */
export const currentSectionAtom = atom(
  (get): SongSection | undefined =>
    get(pickedSectionAtom) ?? sectionAt(get(selectedSongAtom), get(currentBeatAtom)),
  (get, set, section: SongSection | undefined) => {
    const song = get(selectedSongAtom);
    set(
      sectionOverrideAtom,
      song && section ? { songName: song.name, location: section.timelineLocation } : null,
    );
  },
);

/** Drop any explicit section pick, so the section follows the playhead again. */
export const clearSectionOverrideAtom = atom(null, (_get, set) => set(sectionOverrideAtom, null));
