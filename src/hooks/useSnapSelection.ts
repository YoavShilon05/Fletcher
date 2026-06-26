import {sendOsc} from "@/hooks/useOsc.ts";
import {useAtom, useAtomValue} from "jotai";
import {
  currentlyPlayingAtom,
  currentSectionAtom,
  selectedSongAtom,
  setlistAtom,
  snapSelectionAtom
} from "@/stores/store.ts";
import {SongSection} from "@/interfaces/song-section.ts";
import {usePropertyListener} from "@/hooks/usePropertyListener.ts";


export const useSnapSelection = () => {
  const currentSong = useAtomValue(selectedSongAtom)
  const setlist = useAtomValue(setlistAtom)
  const [currentSection, setCurrentSection] = useAtom(currentSectionAtom)
  const snapSelection = useAtomValue(snapSelectionAtom)
  const isPlaying = useAtomValue(currentlyPlayingAtom)

  const snapToTimeline = (payload: number[]) => {
    if (!snapSelection) return;
    if (isPlaying) return;
    if (!currentSection || !currentSong || !setlist) return;

    const timelineLocation = payload[0] as number;

    if (currentSection.timelineLocation === timelineLocation) return;

    const currentSectionIndex = currentSong.structure.findIndex(section => section === currentSection)
    const goForward = timelineLocation > currentSection.timelineLocation
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

    setCurrentSection(nextSection!);
    sendOsc(`/live/song/jump_by`, [nextSection.timelineLocation - timelineLocation]); //todo if I can find a way to capture midi messages I can remove this and life will be beautiful.
    sendOsc(`/live/song/set/start_time`, [nextSection.timelineLocation]);
  };

  usePropertyListener("/live/song/start_listen/beat", "/live/song/get/beat", snapToTimeline)

}