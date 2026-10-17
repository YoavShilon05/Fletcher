import { useStore } from "jotai";
import { useEffect } from "react";
import { currentBeatAtom, isPlayingAtom } from "@/features/live/atoms";
import { snapSelectionAtom } from "@/features/performance/atoms";
import { live } from "@/lib/osc/live-api";
import { currentSectionAtom, pickedSectionAtom, selectedSongAtom } from "./atoms";
import { neighbourSection, sectionAt } from "./sections";

/**
 * Host, snap-selection mode: while stopped, any scrub of the playhead jumps to
 * the start of the neighbouring section in the direction it moved.
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

      const song = store.get(selectedSongAtom);
      if (!song) return;

      // Where we were before this move: the section last snapped to / picked,
      // else whatever was under the playhead.
      const from = store.get(pickedSectionAtom) ?? sectionAt(song, fromBeat);
      // Landing exactly on it is our own snap (or a click) echoing back.
      if (!from || from.timelineLocation === beat) return;

      const target = neighbourSection(song, from, beat > fromBeat ? 1 : -1) ?? from;
      live.jumpBy(target.timelineLocation - beat);
      live.setStartTime(target.timelineLocation);
      store.set(currentSectionAtom, target);
    });
  }, [store]);
}
