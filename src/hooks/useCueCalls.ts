import {useAtomValue} from "jotai";
import {
  currentBeatAtom,
  currentlyPlayingAtom,
  selectedSongAtom,
} from "@/stores/store.ts";
import {sendOsc} from "@/hooks/useOsc.ts";
import {useEffect} from "react";
import {CALL_CUE_COUNT, CALL_SECTION_PAD} from "@/constants.ts";
import {clips} from "@/utils/clips-array.ts";

export const useCueCalls = () => {

  const selectedSong = useAtomValue(selectedSongAtom)
  const isPlaying = useAtomValue(currentlyPlayingAtom)
  const currentBeat = useAtomValue(currentBeatAtom)

  const cueCall = () => {
    const nextSection = selectedSong!.structure.find(section => section.timelineLocation > currentBeat)
    if (!nextSection || nextSection.timelineLocation - currentBeat > CALL_SECTION_PAD) return;

    const distance = nextSection.timelineLocation - currentBeat;
    console.log("distance to next section", distance, "next section", nextSection.name)
    if ((CALL_SECTION_PAD - distance) < 1) {
      const clipIndex = clips.findIndex(clip => clip === nextSection.name.toLowerCase());
      sendOsc("/live/clip_slot/fire", [0, clipIndex]);
    } else {
      if (Number.isInteger(distance) && distance <= CALL_CUE_COUNT + 1 && distance > 1) {
        const clipIndex = CALL_CUE_COUNT + 1 - distance;
        sendOsc("/live/clip_slot/fire", [0, clipIndex]);
      }
    }
  }

  useEffect(() => {
    if (!isPlaying || !selectedSong) return;
    cueCall()
  }, [currentBeat]);

}