import {useAtom, useAtomValue, useSetAtom} from "jotai";
import {currentBeatAtom, currentSectionAtom, selectedSongAtom} from "@/stores/store.ts";
import {useNextSong} from "@/hooks/useNextSong.ts";
import {useEffect} from "react";

export const useSyncPlayback = () => {

  const [selectedSong, setSelectedSong] = useAtom(selectedSongAtom)
  const setCurrentSection = useSetAtom(currentSectionAtom);
  const currentBeat = useAtomValue(currentBeatAtom)

  const nextSong = useNextSong()
  
  const trackPlayback = () => {
    if (!selectedSong) return;

    const passedSong = !!nextSong && currentBeat >=  nextSong.timelineLocation
    if (passedSong) {
      setSelectedSong(nextSong);
    } else {
      const latestSection = selectedSong.structure.filter(section => currentBeat >= section.timelineLocation).at(-1)
      if (latestSection) {
        setCurrentSection(latestSection)
      }
    }

  }

  useEffect(() => {
    trackPlayback()
  }, [currentBeat]);
}