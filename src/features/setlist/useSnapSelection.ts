import { useStore } from "jotai";
import { useEffect } from "react";
import { currentBeatAtom, isPlayingAtom } from "@/features/live/atoms";
import { snapSelectionAtom } from "@/features/performance/atoms";
import { cuedBeatAtom, cueToAtom } from "./actions";
import { currentSectionAtom, selectedSongAtom, setlistAtom } from "./atoms";
import { sectionAt, snapPoints, snapTarget, songAt } from "./sections";

/**
 * Host, snap-selection mode: while stopped, every move of Live's cursor lands
 * on a snap point — a section start, a song's START, or a song locator (see
 * `snapPoints`). It lands on the point it moved into, or on the neighbouring
 * one when the move stayed between the same two points, so a nudge still
 * advances by one. Snapping spans the whole set, and the landing spot drives
 * the song and section selection, since playback-follow is off in this mode.
 */
export function useSnapSelection() {
  const store = useStore();

  useEffect(() => {
    let previousBeat = store.get(currentBeatAtom);

    return store.sub(currentBeatAtom, () => {
      const beat = store.get(currentBeatAtom);
      const fromBeat = previousBeat;
      previousBeat = beat;

      if (!store.get(snapSelectionAtom) || store.get(isPlayingAtom)) return;

      // Fletcher's own cues come back as cursor moves too — only the user's
      // moves are worth snapping.
      const cued = store.get(cuedBeatAtom);
      if (cued !== undefined && Math.floor(cued) === beat) return;

      const setlist = store.get(setlistAtom);
      const target = snapTarget(snapPoints(setlist), fromBeat, beat);
      if (target === undefined || target === beat) return;

      store.set(cueToAtom, target);
      // Song first: a section pick is keyed by the song it belongs to.
      const song = songAt(setlist, target);
      store.set(selectedSongAtom, song);
      store.set(currentSectionAtom, sectionAt(song, target));
    });
  }, [store]);
}
