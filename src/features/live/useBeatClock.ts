import { useAtomValue, useStore } from "jotai";
import { useCallback, useEffect, useRef } from "react";
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
 * While playing, walk the playhead forward in steps of 1/`subdivision` of a
 * quarter note, handing `onStep` the beat each step lands on. Driven from the
 * wall-clock playback anchor instead of Live's (UDP, jittery) beat messages,
 * and each tick is scheduled for the exact moment the next step arrives.
 */
export function usePlayheadSteps(subdivision: number, onStep: (beat: number) => void) {
  const store = useStore();
  const anchor = useAtomValue(playbackAnchorAtom);
  const tempoChanges = useAtomValue(tempoChangesAtom);

  // Held in a ref so an unstable handler doesn't restart the clock: a fresh
  // effect re-fires the step the playhead is already sitting on.
  const step = useRef(onStep);
  useEffect(() => {
    step.current = onStep;
  }, [onStep]);

  useEffect(() => {
    if (!anchor || anchor.tempo <= 0) return;

    let lastStep: number | null = null;
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
      const steps = Math.floor(beatFloat * subdivision);

      if (steps !== lastStep) {
        lastStep = steps;
        step.current(steps / subdivision);
      }

      // Every tick re-derives the position from the wall clock, so a wait that
      // straddles a tempo change is corrected by the tick it lands on.
      const msUntilNextStep = (((steps + 1) / subdivision - beatFloat) * MS_PER_MINUTE) / tempo;
      timeout = setTimeout(tick, Math.max(msUntilNextStep, 1));
    };

    tick();
    return () => clearTimeout(timeout);
  }, [anchor, subdivision, tempoChanges, store]);
}

/** Advances `currentBeatAtom`, the app's integer quarter-note playhead. */
export function useBeatClock() {
  const store = useStore();
  const setBeat = useCallback((beat: number) => store.set(currentBeatAtom, beat), [store]);
  usePlayheadSteps(1, setBeat);
}
