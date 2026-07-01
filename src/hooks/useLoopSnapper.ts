import {usePropertyListener} from "@/hooks/usePropertyListener.ts";
import {currentSectionAtom, selectedSongAtom} from "@/stores/store.ts";
import {useAtomValue} from "jotai";
import {sendOsc} from "@/hooks/useOsc.ts";

export const useLoopSnapper = () => {

  const currentSection = useAtomValue(currentSectionAtom)
  const selectedSong = useAtomValue(selectedSongAtom)

  const handleLoopToggle = (payload: boolean[]) => {
    if (!currentSection || !selectedSong) return;

    const loopEnabled = payload[0];
    if (!loopEnabled) return;

    sendOsc("/live/song/set/loop_start", [currentSection.timelineLocation])

    const nextLocation = selectedSong.structure.find(section => section.timelineLocation > currentSection.timelineLocation)
    if (nextLocation) {
      sendOsc("/live/song/set/loop_length", [nextLocation.timelineLocation - currentSection.timelineLocation])
    }
    else {
      if (selectedSong.end) {
        sendOsc("/live/song/set/loop_length", [selectedSong.end - currentSection.timelineLocation])
      }
    }
  }

  usePropertyListener("/live/song/start_listen/loop", "/live/song/get/loop", handleLoopToggle)

}