import {sendOsc} from "@/hooks/useOsc.ts";
import {CLIP_FILE_TYPE, CLIP_PREFIX, CONTROL_CLIP_LENGTH_BEATS} from "@/constants.ts";
import {getDefaultStore} from "jotai";
import {scenesAtom} from "@/stores/store.ts";

const store = getDefaultStore();

const ensureSceneCount = (count: number) => {
  const sceneCount = store.get(scenesAtom).length;
  for (let i = sceneCount; i < count; i++) {
    sendOsc("/live/song/create_scene", [-1]);
  }
}

export const prepareClips = (trackIndex: number, clips: readonly string[]) => {
  ensureSceneCount(clips.length);

  for (const [index, clip] of clips.entries()) {
    sendOsc("/live/clip_slot/load_sample", [trackIndex, index, `${CLIP_PREFIX}${clip}.${CLIP_FILE_TYPE}`,]);
  }
}

const toTitleCase = (value: string) =>
  value.split('_').map(word => word[0].toUpperCase() + word.slice(1)).join(' ')

// Control clips are pure MIDI triggers (no audio content), so they're created
// directly via the Live API instead of looking up a sample by name.
export const prepareControlClips = (trackIndex: number, clips: readonly string[]) => {
  ensureSceneCount(clips.length);

  for (const [index, clip] of clips.entries()) {
    sendOsc("/live/clip_slot/create_clip", [trackIndex, index, CONTROL_CLIP_LENGTH_BEATS]);
    sendOsc("/live/clip/set/name", [trackIndex, index, toTitleCase(clip)]);
  }
}
