import { atom } from "jotai";
import { globalTempoAtom, tempoChangesAtom } from "@/features/live/atoms";
import { setlistAtom } from "@/features/setlist/atoms";
import type { Song } from "@/types/song";
import type { TempoChangeEvent } from "@/types/tempo";

/** Everything needed to know the tempo at any point in the set. */
export interface TempoContext {
  /** The set's tempo envelope, sorted by time. */
  changes: TempoChangeEvent[];
  /** For a song's beat range. Scene tempo is already folded into `Song.tempo`. */
  setlist: Song[];
  /** The set's tempo, for when there is no song. */
  global: number;
}

export const tempoContextAtom = atom<TempoContext>((get) => ({
  changes: get(tempoChangesAtom),
  setlist: get(setlistAtom),
  global: get(globalTempoAtom),
}));

/**
 * The beats a song occupies: its locator up to its STOP, else up to the next
 * song. The upper bound is exclusive, so a breakpoint pinning the next song
 * doesn't count as automation in this one.
 */
function songRange(ctx: TempoContext, song: Song): [from: number, to: number] {
  const index = ctx.setlist.findIndex((other) => other.name === song.name);
  const next = index === -1 ? undefined : ctx.setlist[index + 1];
  return [song.timelineLocation, song.end ?? next?.timelineLocation ?? Infinity];
}

/**
 * Does Live's tempo envelope do anything inside this song? Only breakpoints
 * from the song locator onwards count: the baseline point Live keeps at the
 * beginning of time isn't automation, it's the set's starting tempo.
 *
 * This is the switch between the two ways a song's tempo can be driven —
 * Fletcher writing the scene tempo, or Live playing its envelope. Automating
 * one song therefore costs nothing anywhere else in the set: see `useSyncTempo`.
 */
export function hasTempoAutomation(ctx: TempoContext, song: Song): boolean {
  const [from, to] = songRange(ctx, song);
  return ctx.changes.some((change) => change.time >= from && change.time < to);
}

/**
 * Tempo in effect at `beat`.
 *
 * A song with automation in range is driven by Live's envelope, so the envelope
 * wins — including a breakpoint sitting before the song, whose value Live holds
 * until the next one. Every other song is driven from its scene tempo, which
 * `buildSetlist` has already resolved into `Song.tempo`.
 */
export function tempoAt(ctx: TempoContext, song?: Song, beat?: number): number {
  if (song && beat !== undefined && hasTempoAutomation(ctx, song)) {
    const held = ctx.changes.findLast((change) => change.time <= beat);
    if (held) return held.tempo;
  }
  return song?.tempo ?? ctx.global;
}
