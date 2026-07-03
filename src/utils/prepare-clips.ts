import {sendOsc} from "@/hooks/useOsc.ts";
import {CLIP_FILE_TYPE, CLIP_PREFIX} from "@/constants.ts";
import {clips} from "@/utils/clips-array.ts";
import {getDefaultStore} from "jotai";
import {scenesAtom} from "@/stores/store.ts";

const store = getDefaultStore();

export const prepareClips = (trackIndex: number) => {

  const clipCount = clips.length;
  const sceneCount = store.get(scenesAtom).length;

  if (clipCount > sceneCount) {
    for (let i = sceneCount; i < clipCount; i++) {
      sendOsc("/live/song/create_scene", [-1]);
    }
  }

  for (const [index, clip] of clips.entries()) {
    sendOsc("/live/clip_slot/load_sample", [trackIndex, index, `${CLIP_PREFIX}${clip}.${CLIP_FILE_TYPE}`,]);
  }
}