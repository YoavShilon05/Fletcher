import { CALL_SECTION_PAD, COUNT_CUE_OFFSET, SECTION_CUE_OFFSET } from "@/constants";
import type { Song } from "@/types/song";
import { isCountInClip } from "./clips";
import { cueClipAt } from "./cue-calls";

/** The nudge applied to a cue, in beats, by which kind of clip it is. */
const offsetFor = (slot: number) => (isCountInClip(slot) ? COUNT_CUE_OFFSET : SECTION_CUE_OFFSET);

/** The furthest a nudge can pull a clip earlier than the beat it belongs to. */
const EARLIEST_NUDGE = Math.min(0, SECTION_CUE_OFFSET, COUNT_CUE_OFFSET);

/** Beats carry a nudge, so round off the float noise before it reaches Live. */
const roundBeat = (beat: number) => Math.round(beat * 1000) / 1000;

/** A spoken cue, resolved to a Fletcher_Count slot and the beat it sits on. */
export interface CompiledCue {
  slot: number;
  beat: number;
}

/** Every beat a song calls out, sections and extra cues alike. */
const cueLocations = (song: Song) =>
  [...song.structure, ...song.extraCalls].map((call) => call.timelineLocation);

/**
 * The first beat a song's cues can reach back to — its earliest call lands
 * CALL_SECTION_PAD beats before the thing it announces, which for an opening
 * section is before the song locator itself.
 */
const windowStart = (song: Song) =>
  Math.min(song.timelineLocation, ...cueLocations(song)) - CALL_SECTION_PAD + EARLIEST_NUDGE;

/**
 * The stretch of timeline a song's cues own, and so the stretch a rebuild is
 * allowed to wipe. It stops at the song's STOP locator, or — when there isn't
 * one — where the next song's own cues start, so building one song never eats
 * its neighbour's intro call.
 */
export function cueRange(song: Song, nextSong?: Song): { from: number; to: number } {
  const from = windowStart(song);
  const bounds = [song.end, nextSong && windowStart(nextSong)].filter(
    (bound): bound is number => bound !== undefined,
  );
  // Nothing bounds the last song of a set without a STOP: its own cues do.
  const to = bounds.length ? Math.min(...bounds) : Math.max(...cueLocations(song), from);
  return { from, to: Math.max(from, to) };
}

/**
 * Lay out a song's spoken cues on the timeline, ready to be built into the
 * arrangement. Rather than restate the timing rules, this walks the song's
 * beats through `cueClipAt` — exactly what the per-beat listener used to ask,
 * only asked all at once and ahead of time.
 */
export function compileCues(song: Song): CompiledCue[] {
  const locations = cueLocations(song);
  if (locations.length === 0) return [];

  const cues: CompiledCue[] = [];
  const first = Math.max(0, Math.ceil(windowStart(song)));
  const last = Math.floor(Math.max(...locations));

  for (let beat = first; beat <= last; beat++) {
    const slot = cueClipAt(song, beat);
    // Clamped: a nudge must never push a clip before the arrangement starts.
    if (slot !== null) cues.push({ slot, beat: roundBeat(Math.max(0, beat + offsetFor(slot))) });
  }
  return cues;
}
