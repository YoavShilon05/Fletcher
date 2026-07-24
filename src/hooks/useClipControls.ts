import {useAtomValue} from "jotai";
import {useEffect} from "react";
import {OscMessage} from "osc";
import {sendOsc, useOscListener} from "@/hooks/useOsc.ts";
import {parseOscPayload} from "@/utils/parse-osc-payload.ts";
import {controlClips} from "@/utils/clips-array.ts";
import {
  currentSectionAtom,
  fletcherControlTrackIndexAtom,
  selectedSongAtom,
  setlistAtom,
} from "@/stores/store.ts";

export const useClipControls = () => {

  const controlTrackIndex = useAtomValue(fletcherControlTrackIndexAtom)
  const setlist = useAtomValue(setlistAtom)
  const selectedSong = useAtomValue(selectedSongAtom)
  const currentSection = useAtomValue(currentSectionAtom)

  const cueTo = (timelineLocation: number) => {
    setTimeout(() => {
      sendOsc("/live/song/set/start_time", [timelineLocation])
      sendOsc("/live/song/jump_to", [timelineLocation])
    }, 100)
    // if (snapSelection) {
      // setCurrentBeat(timelineLocation)
    // }

  }

  const goToSong = (offset: 1 | -1) => {
    if (!setlist || !selectedSong) return;
    const currentIndex = setlist.findIndex(song => song === selectedSong)
    const target = setlist[currentIndex + offset]
    if (!target) return;
    console.log("JUMPIN OT SONG", target.name)

    cueTo(target.timelineLocation)
  }

  const goToSection = (offset: 1 | -1) => {
    if (!selectedSong || !currentSection) return;
    const currentIndex = selectedSong.structure.findIndex(section => section === currentSection)
    const target = selectedSong.structure[currentIndex + offset]
    if (!target) return;

    cueTo(target.timelineLocation)
  }

  const actions: Record<typeof controlClips[number], () => void> = {
    next_song: () => goToSong(1),
    prev_song: () => goToSong(-1),
    next_section: () => goToSection(1),
    prev_section: () => goToSection(-1),
  }

  const handleMessage = (msg: OscMessage) => {
    if (msg.address !== "/live/clip_slot/get/is_triggered") return;
    const [trackIndex, clipIndex, isTriggered] = parseOscPayload<[number, number, boolean]>(msg.args)
    if (trackIndex !== controlTrackIndex || isTriggered) return;

    sendOsc("/live/song/stop_playing", [])
    sendOsc("/live/song/stop_all_clips", [])
    sendOsc("/live/song/set/back_to_arranger", [0])
    actions[controlClips[clipIndex]]?.()
  }

  useOscListener(handleMessage);

  useEffect(() => {
    if (controlTrackIndex === -1) return;

    controlClips.forEach((_, clipIndex) => {
      sendOsc("/live/clip_slot/start_listen/is_triggered", [controlTrackIndex, clipIndex])
    })

    return () => {
      controlClips.forEach((_, clipIndex) => {
        sendOsc("/live/clip_slot/stop_listen/is_triggered", [controlTrackIndex, clipIndex])
      })
    }
  }, [controlTrackIndex]);

}
