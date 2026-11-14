import { useAtomValue, useStore } from "jotai";
import { useEffect, useRef } from "react";
import { CLIP_CONTROL_SETTLE_MS } from "@/constants";
import { cueToAtom } from "@/features/setlist/actions";
import { currentSectionAtom, selectedSongAtom, setlistAtom } from "@/features/setlist/atoms";
import { neighbourSection, neighbourSong } from "@/features/setlist/sections";
import { LIVE } from "@/lib/osc/addresses";
import { live } from "@/lib/osc/live-api";
import { useOscMessage } from "@/lib/osc/useOscMessage";
import { controlTrackIndexAtom } from "./atoms";
import { controlClips, type ControlClip } from "./clips";

/**
 * Host: treat the Fletcher_Control track's clips as buttons (e.g. mapped to
 * a MIDI foot controller) that move between songs and sections.
 */
export function useClipControls() {
  const store = useStore();
  const controlTrackIndex = useAtomValue(controlTrackIndexAtom);
  const cueTimeout = useRef<ReturnType<typeof setTimeout>>(undefined);

  const targetFor = (action: ControlClip): number | undefined => {
    const song = store.get(selectedSongAtom);
    switch (action) {
      case "next_song":
      case "prev_song":
        return neighbourSong(store.get(setlistAtom), song, action === "next_song" ? 1 : -1)
          ?.timelineLocation;
      case "next_section":
      case "prev_section": {
        if (!song) return undefined;
        const offset = action === "next_section" ? 1 : -1;
        return neighbourSection(song, store.get(currentSectionAtom), offset)?.timelineLocation;
      }
    }
  };

  useOscMessage(LIVE.clipTriggered, ({ trackIndex, clipIndex, isTriggered }) => {
    // Act on release (triggered -> not triggered), once the clip has fired.
    if (trackIndex !== controlTrackIndex || isTriggered) return;

    live.stopPlaying();
    live.stopAllClips();
    live.backToArranger();

    const action = controlClips[clipIndex];
    const target = action && targetFor(action);
    if (target === undefined) return;

    // Give Live a moment to settle the stop before moving the playhead.
    clearTimeout(cueTimeout.current);
    cueTimeout.current = setTimeout(() => {
      store.set(cueToAtom, target);
    }, CLIP_CONTROL_SETTLE_MS);
  });

  useEffect(() => () => clearTimeout(cueTimeout.current), []);

  useEffect(() => {
    if (controlTrackIndex === -1) return;
    controlClips.forEach((_, clip) => live.listenClipTriggered(controlTrackIndex, clip));
    return () => {
      controlClips.forEach((_, clip) => live.stopListeningClipTriggered(controlTrackIndex, clip));
    };
  }, [controlTrackIndex]);
}
