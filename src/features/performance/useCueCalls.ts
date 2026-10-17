import { useStore } from "jotai";
import { useEffect } from "react";
import { currentBeatAtom, isPlayingAtom } from "@/features/live/atoms";
import { selectedSongAtom } from "@/features/setlist/atoms";
import { live } from "@/lib/osc/live-api";
import { countTrackIndexAtom, shotCallingAtom } from "./atoms";
import { cueClipAt } from "./cue-calls";

/** Host: on every beat of playback, fire the spoken cue that's due (if any). */
export function useCueCalls() {
  const store = useStore();

  // Subscribed outside React so the per-beat check doesn't re-render anything.
  useEffect(
    () =>
      store.sub(currentBeatAtom, () => {
        if (!store.get(isPlayingAtom) || !store.get(shotCallingAtom)) return;

        const song = store.get(selectedSongAtom);
        const track = store.get(countTrackIndexAtom);
        if (!song || track === -1) return;

        const clip = cueClipAt(song, store.get(currentBeatAtom));
        if (clip !== null) live.fireClip(track, clip);
      }),
    [store],
  );
}
