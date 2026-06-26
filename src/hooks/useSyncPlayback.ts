import {usePropertyListener} from "@/hooks/usePropertyListener.ts";
import {useAtom, useAtomValue, useSetAtom} from "jotai";
import {currentSectionAtom, selectedSongAtom, setlistAtom} from "@/stores/store.ts";
import {useMemo} from "react";

export const useSyncPlayback = () => {

  const setlist = useAtomValue(setlistAtom);
  const [selectedSong, setSelectedSong] = useAtom(selectedSongAtom)
  const setCurrentSection = useSetAtom(currentSectionAtom);

  const nextSong = useMemo(
    () => {
      if (!setlist) return undefined;
      const currIndex = setlist.findIndex((song) => song == selectedSong)
      if (currIndex < setlist.length - 1) {
        return setlist[currIndex + 1];
      }
      return null;
    },

    [setlist, selectedSong]
  )
  
  const trackPlayback = (payload: number[]) => {
    if (!selectedSong) return;
    const timelineLocation = payload[0]

    const passedSong = !!nextSong && timelineLocation >=  nextSong.timelineLocation
    if (passedSong) {
      setSelectedSong(nextSong);
    } else {
      const latestSection = selectedSong.structure.filter(section => timelineLocation >= section.timelineLocation).at(-1)
      if (latestSection) {
        setCurrentSection(latestSection)
      }
    }

  }
  
  usePropertyListener("/live/song/start_listen/beat", "/live/song/get/beat", trackPlayback)
}