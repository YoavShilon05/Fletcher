import { atom } from "jotai";
import type { Scene } from "@/types/scene";
import type { Song } from "@/types/song";
import type { TimeSignature, TimeSignatureChangeEvent } from "@/types/time-signature";
import {
  globalTimeSignatureAtom,
  scenesAtom,
  timeSignatureChangesAtom,
} from "@/features/live/atoms";

/** Everything needed to know the time signature at any point in the set. */
export interface TimeSignatureContext {
  /** Time-signature automation, sorted by time. */
  changes: TimeSignatureChangeEvent[];
  scenes: Scene[];
  global: TimeSignature;
}

export const timeSignatureContextAtom = atom<TimeSignatureContext>((get) => ({
  changes: get(timeSignatureChangesAtom),
  scenes: get(scenesAtom),
  global: get(globalTimeSignatureAtom),
}));

/**
 * Time signature in effect at `beat`. Precedence: the latest automation
 * change inside the song, then the song's scene, then the set's global one.
 */
export function timeSignatureAt(
  ctx: TimeSignatureContext,
  song?: Song,
  beat?: number,
): TimeSignature {
  if (song && beat !== undefined) {
    const lastChange = ctx.changes.findLast(
      (change) => change.time >= song.timelineLocation && change.time <= beat,
    );
    if (lastChange) return lastChange.timeSignature;
  }

  if (song) {
    const scene = ctx.scenes.find((s) => s.name === song.name);
    if (scene) return scene.timeSignature;
  }

  return ctx.global;
}
