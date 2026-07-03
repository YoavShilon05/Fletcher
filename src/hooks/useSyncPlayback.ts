import {useAtom, useAtomValue} from "jotai";
import {currentBeatAtom, currentSectionAtom, selectedSongAtom, setlistAtom} from "@/stores/store.ts";
import {useEffect} from "react";

export const useSyncPlayback = () => {

  const [selectedSong, setSelectedSong] = useAtom(selectedSongAtom)
  const [currentSection, setCurrentSection] = useAtom(currentSectionAtom);
  const currentBeat = useAtomValue(currentBeatAtom)
  const setlist = useAtomValue(setlistAtom)

  // const nextSong = useNextSong()
  
  const trackPlayback = () => {
    if (!setlist) return;

    const currentSong = setlist.findLast(song => song.timelineLocation < currentBeat)
    if ((currentSong !== selectedSong)) {
      setSelectedSong(currentSong);
    }

    const latestSection = (currentSong ?? selectedSong)?.structure.findLast(section => currentBeat >= section.timelineLocation)
    if (latestSection !== currentSection) {
      setCurrentSection(latestSection)
    }


  }

  useEffect(() => {
    trackPlayback()
  }, [currentBeat]);
}