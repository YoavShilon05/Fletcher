import { CALL_CUE_COUNT, CALL_SECTION_PAD } from "@/constants";
import type { CueCall, Song } from "@/types/song";
import { callClipIndex } from "./clips";

/** The section or extra cue that comes next after `beat`, whichever is sooner. */
function nextCallAfter(song: Song, beat: number): CueCall<string> | undefined {
  const nextSection = song.structure.find((s) => s.timelineLocation > beat);
  const nextExtra = song.extraCalls.find((c) => c.timelineLocation > beat);
  if (!nextSection || !nextExtra) return nextSection ?? nextExtra;
  return nextSection.timelineLocation < nextExtra.timelineLocation ? nextSection : nextExtra;
}

/**
 * Which Fletcher_Count clip to fire on `beat`, if any. Leading up to each
 * section / cue, Fletcher calls its name CALL_SECTION_PAD beats ahead, then
 * counts in "1, 2, … CALL_CUE_COUNT" on the beats right before it.
 */
export function cueClipAt(song: Song, beat: number): number | null {
  const nextCall = nextCallAfter(song, beat);
  if (!nextCall) return null;

  const distance = nextCall.timelineLocation - beat;
  if (distance > CALL_SECTION_PAD) return null;

  if (distance > CALL_SECTION_PAD - 1) {
    const slot = callClipIndex(nextCall.name);
    return slot === -1 ? null : slot;
  }

  if (Number.isInteger(distance) && distance > 0 && distance <= CALL_CUE_COUNT) {
    // The count lands on the CALL_CUE_COUNT beats immediately before the cue:
    // distance CALL_CUE_COUNT → "1", … distance 1 → "CALL_CUE_COUNT", so the
    // last number is spoken on the beat before the downbeat, as a count-in is.
    return CALL_CUE_COUNT - distance;
  }

  return null;
}
