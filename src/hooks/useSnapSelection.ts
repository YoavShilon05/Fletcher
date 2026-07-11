import {sendOsc} from "@/hooks/useOsc.ts";
import {useAtomValue} from "jotai";
import {
  currentBeatAtom,
  currentlyPlayingAtom,
  currentSectionAtom,
  selectedSongAtom,
  setlistAtom,
  snapSelectionAtom
} from "@/stores/store.ts";
import {SongSection} from "@/interfaces/song-section.ts";
import {useEffect, useRef} from "react";
import {SNAP_THRESHOLD} from "@/constants.ts";

//todo if I can find a way to capture midi messages I can remove this and life will be beautiful.
export const useSnapSelection = () => {
  const currentSong = useAtomValue(selectedSongAtom)
  const setlist = useAtomValue(setlistAtom)
  const currentSection = useAtomValue(currentSectionAtom)
  const snapSelection = useAtomValue(snapSelectionAtom)
  const isPlaying = useAtomValue(currentlyPlayingAtom)
  const currentBeat = useAtomValue(currentBeatAtom)

  const lastBeat = useRef<number | undefined>(undefined)

  const snapToTimeline = () => {
    if (!currentSection || !currentSong || !setlist) return;

    if (currentSection.timelineLocation === currentBeat) return;

    const currentSectionIndex = currentSong.structure.findIndex(section => section === currentSection)
    const goForward = currentBeat > currentSection.timelineLocation
    let nextSection: SongSection = currentSection;
    if (goForward) {
      if (currentSectionIndex < currentSong.structure.length - 1) {
        nextSection = currentSong.structure[currentSectionIndex + 1];
      } else {
      }
    } else {
      if (currentSectionIndex > 0) {
        nextSection = currentSong.structure[currentSectionIndex - 1];
      } else {
      }
    }

    sendOsc(`/live/song/jump_to`, [nextSection.timelineLocation]);
    sendOsc(`/live/song/set/start_time`, [nextSection.timelineLocation]);
  };

  useEffect(() => {

    const distance = Math.abs(currentBeat - (lastBeat.current ?? currentBeat))
    lastBeat.current = currentBeat;

    if (distance > SNAP_THRESHOLD) return;
    if (!snapSelection || isPlaying) return;

    snapToTimeline()
  }, [currentBeat]);

}