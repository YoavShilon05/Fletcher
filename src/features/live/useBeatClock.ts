import { useAtomValue, useStore } from "jotai";
import { useEffect } from "react";
import { PLAYBACK_LOOKAHEAD_MS } from "@/constants";
import type { PlaybackAnchor } from "@/lib/osc/addresses";
import type { TempoChangeEvent } from "@/types/tempo";
import {
  currentBeatAtom,
  delayFromMothershipAtom,
  playbackAnchorAtom,
  tempoChangesAtom,
} from "./atoms";

const MS_PER_MINUTE = 60_000;

/**
 * Collapse breakpoints sharing a beat down to the last one.
 *
 * An instant tempo switch is two points at the same beat — the outgoing value
 * and the incoming one — and from that beat onwards it's the second that plays.
 * Expects `changes` sorted by time, as the .als reader leaves them.
 */
function steps(changes: TempoChangeEvent[]): TempoChangeEvent[] {
  const collapsed: TempoChangeEvent[] = [];
  for (const change of changes) {
    if (collapsed.at(-1)?.time === change.time) collapsed[collapsed.length - 1] = change;
    else collapsed.push(change);
  }
  return collapsed;
}

/**
 * Where the playhead is `elapsedMs` after `anchor`, and the tempo it is running
 * at there.
 *
 * The anchor's tempo is Live's own reading at the moment it stamped the anchor,
 * so it holds until the envelope's next breakpoint; from there the envelope
 * takes over, one constant-tempo segment per breakpoint. Live interpolates its
 * tempo envelope linearly between points, so a clean switch wants two points
 * close together — the one before it holding the old tempo — and a long ramp
 * will read as a step at its far end.
 */
export function beatAfter(
  changes: TempoChangeEvent[],
  anchor: PlaybackAnchor,
  elapsedMs: number,
): { beat: number; tempo: number } {
  let beat = anchor.startBeat;
  let tempo = anchor.tempo;
  let remainingMs = elapsedMs;

  for (const change of steps(changes)) {
    // Strictly before, so a step landing exactly on `beat` still takes effect.
    if (change.time < beat) continue;
    const msToChange = ((change.time - beat) * MS_PER_MINUTE) / tempo;
    if (msToChange > remainingMs) break;
    remainingMs -= msToChange;
    beat = change.time;
    tempo = change.tempo;
  }

  return { beat: beat + (remainingMs * tempo) / MS_PER_MINUTE, tempo };
}

/**
 * While playing, advance `currentBeatAtom` from the wall-clock playback anchor
 * instead of waiting on Live's (UDP, jittery) beat messages. Each tick is
 * scheduled for the exact moment the next beat lands.
 */
export function useBeatClock() {
  const store = useStore();
  const anchor = useAtomValue(playbackAnchorAtom);
  const tempoChanges = useAtomValue(tempoChangesAtom);

  useEffect(() => {
    if (!anchor || anchor.tempo <= 0) return;

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
      const { beat: beatFloat, tempo } = beatAfter(tempoChanges, anchor, elapsedMs);
      const beat = Math.floor(beatFloat);

      if (beat !== lastBeat) {
        lastBeat = beat;
        store.set(currentBeatAtom, beat);
      }

      // Every tick re-derives the position from the wall clock, so a wait that
      // straddles a tempo change is corrected by the tick it lands on.
      const msUntilNextBeat = ((beat + 1 - beatFloat) * MS_PER_MINUTE) / tempo;
      timeout = setTimeout(tick, Math.max(msUntilNextBeat, 1));
    };

    tick();
    return () => clearTimeout(timeout);
  }, [anchor, tempoChanges, store]);
}
