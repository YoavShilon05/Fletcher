import {
  CLIP_FILE_TYPE,
  CLIP_PREFIX,
  CONTROL_CLIP_LENGTH_BEATS,
  FLETCHER_CONTROL_TRACK_NAME,
  FLETCHER_COUNT_TRACK_NAME,
} from "@/constants";
import { live } from "@/lib/osc/live-api";
import { ExtraCueNames, SectionNames } from "@/types/song";

/**
 * Spoken numbers "1".."8". The count-in only uses the first CALL_CUE_COUNT, but
 * the slot layout is baked into existing Live sets — don't change its length.
 */
const COUNT_CLIP_NUMBERS = 8;
const COUNT_CLIPS = Array.from({ length: COUNT_CLIP_NUMBERS }, (_, i) => String(i + 1));

/**
 * Clip slots on the Fletcher_Count track, in slot order: the count-in numbers
 * first (slot i speaks "i + 1"), then one spoken name per section / cue.
 */
export const countClips = [
  ...COUNT_CLIPS,
  ...Object.values(SectionNames).map((name) => name.toLowerCase()),
  ...Object.values(ExtraCueNames).map((name) => name.toLowerCase()),
];

/** Slot of the spoken name of a section / cue, or -1 if there isn't one. */
export const callClipIndex = (cueName: string) => countClips.indexOf(cueName.toLowerCase());

/**
 * Clip slots on the Fletcher_Control track — navigation triggers, not spoken
 * cues. Slot index must match array index.
 */
export const controlClips = ["next_song", "prev_song", "next_section", "prev_section"] as const;
export type ControlClip = (typeof controlClips)[number];

// Awaited and sequential: OSC is fire-and-forget UDP, so issuing commands
// without awaiting lets the underlying Tauri calls complete out of order.
// Ableton also needs a scene to exist before a clip can be created in it, so
// scene creation must finish first, and each clip's create/name pair must
// land in order.
async function ensureSceneCount(existing: number, needed: number) {
  for (let i = existing; i < needed; i++) {
    await live.createScene();
  }
}

/** Load the spoken-cue samples into the count track's clip slots. */
export async function prepareCountClips(trackIndex: number, sceneCount: number) {
  await ensureSceneCount(sceneCount, countClips.length);
  for (const [index, clip] of countClips.entries()) {
    await live.loadSample(trackIndex, index, `${CLIP_PREFIX}${clip}.${CLIP_FILE_TYPE}`);
  }
}

const toTitleCase = (value: string) =>
  value
    .split("_")
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(" ");

/**
 * Create the control track's (empty, MIDI) trigger clips. They carry no
 * audio, so they're created directly instead of loaded from a sample.
 */
export async function prepareControlClips(trackIndex: number, sceneCount: number) {
  await ensureSceneCount(sceneCount, controlClips.length);
  for (const [index, clip] of controlClips.entries()) {
    await live.createClip(trackIndex, index, CONTROL_CLIP_LENGTH_BEATS);
    await live.setClipName(trackIndex, index, toTitleCase(clip));
  }
}

/** Create whichever of the two Fletcher tracks is missing (at index 0). */
export function createFletcherTracks(countTrackIndex: number, controlTrackIndex: number) {
  if (countTrackIndex === -1) {
    live.createAudioTrack(0);
    live.setTrackName(0, FLETCHER_COUNT_TRACK_NAME);
  }
  if (controlTrackIndex === -1) {
    live.createMidiTrack(0);
    live.setTrackName(0, FLETCHER_CONTROL_TRACK_NAME);
  }
}

/** Delete whichever of the two Fletcher tracks exist. */
export function deleteFletcherTracks(countTrackIndex: number, controlTrackIndex: number) {
  [countTrackIndex, controlTrackIndex]
    .filter((index) => index !== -1)
    .sort((a, b) => b - a) // highest first, so deleting one doesn't shift the other
    .forEach((index) => live.deleteTrack(index));
}
