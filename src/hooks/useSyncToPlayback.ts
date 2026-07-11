import {useAtom, useAtomValue} from "jotai";
import {
  currentBeatAtom,
  currentSectionAtom,
  selectedSongAtom,
  setlistAtom,
} from "@/stores/store.ts";
import {useEffect} from "react";

export const useSyncToPlayback = () => {

  const [selectedSong, setSelectedSong] = useAtom(selectedSongAtom)
  const [currentSection, setCurrentSection] = useAtom(currentSectionAtom);
  const currentBeat = useAtomValue(currentBeatAtom)
  const setlist = useAtomValue(setlistAtom)

  // const nextSong = useNextSong()
  
  const trackPlayback = () => {
    if (!setlist) return;

    const currentSong = setlist.findLast(song => song.timelineLocation <= currentBeat)
    if ((currentSong !== selectedSong)) {
      setSelectedSong(currentSong);
    }

    if (!currentSong) return;

    const latestSection = (currentSong.end && currentBeat > currentSong.end) ?
      undefined :
      (currentSong ?? selectedSong)?.structure.findLast(section => currentBeat >= section.timelineLocation);

    if (latestSection !== currentSection) {
      setCurrentSection(latestSection)
    }

  }

  useEffect(() => {
    trackPlayback()
  }, [currentBeat]);
}