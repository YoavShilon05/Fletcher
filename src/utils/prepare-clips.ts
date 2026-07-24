import {sendOsc} from "@/hooks/useOsc.ts";
import {CLIP_FILE_TYPE, CLIP_PREFIX, CONTROL_CLIP_LENGTH_BEATS} from "@/constants.ts";
import {getDefaultStore} from "jotai";
import {scenesAtom} from "@/stores/store.ts";

const store = getDefaultStore();

// Awaited and sequential: sendOsc messages are fire-and-forget UDP, so issuing
// them without awaiting lets the underlying Tauri commands complete out of
// order. Ableton also needs a scene to actually exist before a clip can be
// created in it, so scene creation must fully finish before clip creation
// starts, and each clip's create/name pair must land in order.
const ensureSceneCount = async (count: number) => {
  const sceneCount = store.get(scenesAtom).length;
  for (let i = sceneCount; i < count; i++) {
    await sendOsc("/live/song/create_scene", [-1]);
  }
}

export const prepareClips = async (trackIndex: number, clips: readonly string[]) => {
  await ensureSceneCount(clips.length);

  for (const [index, clip] of clips.entries()) {
    await sendOsc("/live/clip_slot/load_sample", [trackIndex, index, `${CLIP_PREFIX}${clip}.${CLIP_FILE_TYPE}`,]);
  }
}

const toTitleCase = (value: string) =>
  value.split('_').map(word => word[0].toUpperCase() + word.slice(1)).join(' ')

// Control clips are pure MIDI triggers (no audio content), so they're created
// directly via the Live API instead of looking up a sample by name.
export const prepareControlClips = async (trackIndex: number, clips: readonly string[]) => {
  await ensureSceneCount(clips.length);

  for (const [index, clip] of clips.entries()) {
    await sendOsc("/live/clip_slot/create_clip", [trackIndex, index, CONTROL_CLIP_LENGTH_BEATS]);
    await sendOsc("/live/clip/set/name", [trackIndex, index, toTitleCase(clip)]);
  }
}
