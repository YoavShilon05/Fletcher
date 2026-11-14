import { useAtomValue, useStore } from "jotai";
import { useEffect } from "react";
import { LIVE } from "@/lib/osc/addresses";
import { live } from "@/lib/osc/live-api";
import { useOscMessage } from "@/lib/osc/useOscMessage";
import { builtCueTimesAtom, countTrackIndexAtom } from "./atoms";

/**
 * Host: track which cues are already built onto the Fletcher_Count timeline,
 * so the build buttons can show what's done. Live gives no change notification
 * for arrangement clips, so this is asked for — at startup and after a build.
 */
export function useBuiltCues() {
  const store = useStore();
  const countTrackIndex = useAtomValue(countTrackIndexAtom);

  useOscMessage(LIVE.arrangementClipTimes, ({ trackIndex, startTimes }) => {
    if (trackIndex === store.get(countTrackIndexAtom)) store.set(builtCueTimesAtom, startTimes);
  });

  useOscMessage(LIVE.arrangementClipsBuilt, ({ built }) => {
    // Nothing built almost always means the count track's session slots are
    // still empty — the samples Fletcher copies from hadn't loaded yet.
    if (built === 0) console.warn("Built no cue clips: are the Fletcher_Count slots loaded?");
  });

  useEffect(() => {
    if (countTrackIndex === -1) {
      store.set(builtCueTimesAtom, []);
      return;
    }
    live.queryArrangementClipTimes(countTrackIndex);
  }, [countTrackIndex, store]);
}
