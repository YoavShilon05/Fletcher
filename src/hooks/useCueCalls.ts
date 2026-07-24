import {useAtomValue} from "jotai";
import {
  currentBeatAtom,
  currentlyPlayingAtom,
  selectedSongAtom,
  shotCallingAtom,
} from "@/stores/store.ts";
import {sendOsc} from "@/hooks/useOsc.ts";
import {useEffect} from "react";
import {CALL_CUE_COUNT, CALL_SECTION_PAD} from "@/constants.ts";
import {clips} from "@/utils/clips-array.ts";

export const useCueCalls = () => {

  const selectedSong = useAtomValue(selectedSongAtom)
  const isPlaying = useAtomValue(currentlyPlayingAtom)
  const currentBeat = useAtomValue(currentBeatAtom)
  const shotCalling = useAtomValue(shotCallingAtom)

  const cueCall = () => {
    const nextSection = selectedSong!.structure.find(section => section.timelineLocation > currentBeat)
    const nextExtraCall = selectedSong!.extraCalls.find(call => call.timelineLocation > currentBeat)

    const nextCall = nextSection && nextExtraCall ? (nextSection.timelineLocation < nextExtraCall.timelineLocation ? nextSection : nextExtraCall) : (nextSection || nextExtraCall);

    if (!nextCall || nextCall.timelineLocation - currentBeat > CALL_SECTION_PAD) return;

    const distance = nextCall.timelineLocation - currentBeat;
    if ((CALL_SECTION_PAD - distance) < 1) {
      const clipIndex = clips.findIndex(clip => clip === nextCall.name.toLowerCase());
      sendOsc("/live/clip_slot/fire", [0, clipIndex]);
    } else {
      if (Number.isInteger(distance) && distance <= CALL_CUE_COUNT + 1 && distance > 1) {
        const clipIndex = CALL_CUE_COUNT + 1 - distance;
        sendOsc("/live/clip_slot/fire", [0, clipIndex]);
      }
    }
  }

  useEffect(() => {
    if (!isPlaying || !selectedSong || !shotCalling) return;
    cueCall()
  }, [currentBeat]);

}