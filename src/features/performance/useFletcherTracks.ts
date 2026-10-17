import { useAtomValue, useStore } from "jotai";
import { useEffect } from "react";
import { scenesAtom } from "@/features/live/atoms";
import { controlTrackIndexAtom, countTrackIndexAtom } from "./atoms";
import { prepareControlClips, prepareCountClips } from "./clips";

/**
 * Host: whenever a Fletcher track appears (created by us, by hand, or already
 * in the set), make sure its clip slots are filled.
 */
export function useFletcherTracks() {
  const store = useStore();
  const countTrackIndex = useAtomValue(countTrackIndexAtom);
  const controlTrackIndex = useAtomValue(controlTrackIndexAtom);

  useEffect(() => {
    if (countTrackIndex !== -1) prepareCountClips(countTrackIndex, store.get(scenesAtom).length);
  }, [countTrackIndex, store]);

  useEffect(() => {
    if (controlTrackIndex !== -1)
      prepareControlClips(controlTrackIndex, store.get(scenesAtom).length);
  }, [controlTrackIndex, store]);
}
