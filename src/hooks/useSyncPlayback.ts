import {usePropertyListener} from "@/hooks/usePropertyListener.ts";
import {useAtom, useSetAtom} from "jotai";
import {currentSectionAtom, selectedSongAtom} from "@/stores/store.ts";
import {useNextSong} from "@/hooks/useNextSong.ts";

export const useSyncPlayback = () => {

  const [selectedSong, setSelectedSong] = useAtom(selectedSongAtom)
  const setCurrentSection = useSetAtom(currentSectionAtom);

  const nextSong = useNextSong()
  
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