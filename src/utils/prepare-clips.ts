import {sendOsc} from "@/hooks/useOsc.ts";
import {CLIP_FILE_TYPE, CLIP_PREFIX} from "@/constants.ts";
import {clips} from "@/utils/clips-array.ts";


export const prepareClips = (trackIndex: number) => {

  //todo: add scenes if necessary in advance.

  for (const [index, clip] of clips.entries()) {
    sendOsc("/live/clip_slot/load_sample", [trackIndex, index, `${CLIP_PREFIX}${clip}.${CLIP_FILE_TYPE}`,]);
  }
}