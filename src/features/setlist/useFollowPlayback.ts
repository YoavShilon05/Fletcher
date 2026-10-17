import { useAtomValue, useSetAtom, useStore } from "jotai";
import { useEffect } from "react";
import { currentBeatAtom } from "@/features/live/atoms";
import { snapSelectionAtom } from "@/features/performance/atoms";
import { clearSectionOverrideAtom, selectedSongAtom, setlistAtom } from "./atoms";
import { songAt } from "./sections";

/**
 * Keep the selected song (and section) under the playhead as it moves. Off in
 * snap-selection mode, where the selection drives the playhead instead.
 */
export function useFollowPlayback() {
  const store = useStore();
  const beat = useAtomValue(currentBeatAtom);
  const snapSelection = useAtomValue(snapSelectionAtom);
  const setSelectedSong = useSetAtom(selectedSongAtom);
  const clearSectionOverride = useSetAtom(clearSectionOverrideAtom);

  useEffect(() => {
    if (snapSelection) return;

    const song = songAt(store.get(setlistAtom), beat);
    if (song?.name !== store.get(selectedSongAtom)?.name) setSelectedSong(song);
    clearSectionOverride();
  }, [beat, snapSelection, store, setSelectedSong, clearSectionOverride]);
}
