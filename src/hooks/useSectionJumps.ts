import {useEffect} from "react";
import {sendOsc, useOscListener} from "@/hooks/useOsc.ts";
import {parseOscPayload} from "@/utils/parse-osc-payload.ts";
import {useAtom, useAtomValue} from "jotai";
import {currentSectionAtom, selectedSongAtom, setlistAtom} from "@/stores/store.ts";


export const useSectionJumps = () => {
  // This is definitely specific to the Arturia Keylab Essential.

  const currentSong = useAtomValue(selectedSongAtom)
  const setlist = useAtomValue(setlistAtom)
  const [currentSection, setCurrentSection] = useAtom(currentSectionAtom)

  useEffect(() => {
    sendOsc("/live/song/start_listen/beat", []);
  }, []);

  const handleMessage = (msg: { address: string; args: string[] }) => {
    if (msg.address !== "/live/song/get/beat") return;
    if (!currentSection || !currentSong || !setlist) return;

    const payload = parseOscPayload<(number | string)[]>(msg.args)
    const timelineLocation = payload[0] as number;

    if (currentSection.timelineLocation === timelineLocation) return;

    const currentSectionIndex = currentSong.structure.findIndex(section => section === currentSection)
    const goForward = timelineLocation > currentSection.timelineLocation
    if (goForward) {
      if (currentSectionIndex < currentSong.structure.length - 1) {
        sendOsc(`/live/song/jump_to_next_cue`, []);
        setCurrentSection(currentSong.structure[currentSectionIndex + 1]);
      } else {
        sendOsc(`/live/song/jump_to_prev_cue`, []);
      }
    } else {
      if (currentSectionIndex > 0) {
        sendOsc(`/live/song/jump_to_prev_cue`, []);
        setCurrentSection(currentSong.structure[currentSectionIndex - 1]);
      } else {
        sendOsc(`/live/song/jump_to_next_cue`, []);
      }
    }
  };

  useOscListener(handleMessage);

}