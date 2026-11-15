import { useAtomValue, useSetAtom, useStore } from "jotai";
import { useEffect } from "react";
import { currentBeatAtom, isPlayingAtom } from "@/features/live/atoms";
import { snapSelectionAtom } from "@/features/performance/atoms";
import { clearSectionOverrideAtom, selectedSongAtom, setlistAtom } from "./atoms";
import { songAt } from "./sections";

/**
 * Keep the selected song (and section) under the playhead as it moves.
 *
 * Snap-selection mode hands the selection the other way round — the cursor
 * goes where the selection says — but only while stopped. Mid-playback there
 * is nothing to snap and the playhead is authoritative either way, so the
 * selection follows it and the explicit section pick that cued playback is
 * dropped; without that, the highlighted section would stay frozen on it for
 * the whole song.
 */
export function useFollowPlayback() {
  const store = useStore();
  const beat = useAtomValue(currentBeatAtom);
  const snapSelection = useAtomValue(snapSelectionAtom);
  const playing = useAtomValue(isPlayingAtom);
  const setSelectedSong = useSetAtom(selectedSongAtom);
  const clearSectionOverride = useSetAtom(clearSectionOverrideAtom);

  useEffect(() => {
    if (snapSelection && !playing) return;

    const song = songAt(store.get(setlistAtom), beat);
    if (song?.name !== store.get(selectedSongAtom)?.name) setSelectedSong(song);
    clearSectionOverride();
  }, [beat, snapSelection, playing, store, setSelectedSong, clearSectionOverride]);
}
