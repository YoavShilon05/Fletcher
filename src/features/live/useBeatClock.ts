import { useAtomValue, useStore } from "jotai";
import { useEffect } from "react";
import { PLAYBACK_LOOKAHEAD_MS } from "@/constants";
import { currentBeatAtom, delayFromMothershipAtom, playbackAnchorAtom } from "./atoms";

const MS_PER_MINUTE = 60_000;

/**
 * While playing, advance `currentBeatAtom` from the wall-clock playback anchor
 * instead of waiting on Live's (UDP, jittery) beat messages. Each tick is
 * scheduled for the exact moment the next beat lands.
 */
export function useBeatClock() {
  const store = useStore();
  const anchor = useAtomValue(playbackAnchorAtom);

  useEffect(() => {
    if (!anchor || anchor.tempo <= 0) return;

    const beatsPerMs = anchor.tempo / MS_PER_MINUTE;
    let lastBeat: number | null = null;
    let timeout: ReturnType<typeof setTimeout>;

    const tick = () => {
      // Read the follower clock offset fresh on every tick — it's re-measured
      // by each heartbeat while the song plays.
      const elapsedMs =
        Date.now() -
        anchor.startTimeMs +
        PLAYBACK_LOOKAHEAD_MS -
        store.get(delayFromMothershipAtom);
      const beatFloat = anchor.startBeat + elapsedMs * beatsPerMs;
      const beat = Math.floor(beatFloat);

      if (beat !== lastBeat) {
        lastBeat = beat;
        store.set(currentBeatAtom, beat);
      }

      const msUntilNextBeat = (beat + 1 - beatFloat) / beatsPerMs;
      timeout = setTimeout(tick, Math.max(msUntilNextBeat, 1));
    };

    tick();
    return () => clearTimeout(timeout);
  }, [anchor, store]);
}
