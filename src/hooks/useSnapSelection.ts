import { sendOsc } from "@/hooks/useOsc.ts";
import { useAtom, useAtomValue } from "jotai";
import {
  currentBeatAtom,
  currentlyPlayingAtom,
  currentSectionAtom,
  selectedSongAtom,
  setlistAtom,
  snapSelectionAtom
} from "@/stores/store.ts";
import { SongSection } from "@/interfaces/song-section.ts";
import { useEffect, useRef } from "react";

export const useSnapSelection = () => {
  const selectedSong = useAtomValue(selectedSongAtom);
  const setlist = useAtomValue(setlistAtom);
  const [currentSection, setCurrentSection] = useAtom(currentSectionAtom);
  const snapSelection = useAtomValue(snapSelectionAtom);
  const isPlaying = useAtomValue(currentlyPlayingAtom);
  const currentBeat = useAtomValue(currentBeatAtom);

  const lastBeat = useRef<number | undefined>(undefined);

  // 1. Accept the exact movement direction as an argument
  const snapToTimeline = (isMovingForward: boolean) => {
    if (!currentSection || !selectedSong || !setlist) return;
    if (currentSection.timelineLocation === currentBeat) return;

    const currentSectionIndex = selectedSong.structure.findIndex(
      (section) => section === currentSection
    );

    // Guard against the section reference not being found
    if (currentSectionIndex === -1) return;

    let nextSection: SongSection = currentSection;

    // 2. Safely navigate based on true scrubbing direction
    if (isMovingForward) {
      if (currentSectionIndex < selectedSong.structure.length - 1) {
        nextSection = selectedSong.structure[currentSectionIndex + 1];
      }
    } else {
      if (currentSectionIndex > 0) {
        nextSection = selectedSong.structure[currentSectionIndex - 1];
      }
    }

    sendOsc(`/live/song/jump_by`, [nextSection.timelineLocation - currentBeat]);
    sendOsc(`/live/song/set/start_time`, [nextSection.timelineLocation]);
    setCurrentSection(nextSection)
  };

  useEffect(() => {

    // 3. Capture the previous beat before updating the ref
    const previousBeat = lastBeat.current;
    lastBeat.current = currentBeat;

    // Ignore the initial mount when there is no previous beat
    if (previousBeat === undefined || !currentSection) return;

    if (!snapSelection || isPlaying) return;
    if (currentSection.timelineLocation === currentBeat) return;

    // 5. Calculate true direction and pass it down
    const isMovingForward = currentBeat > previousBeat;

    snapToTimeline(isMovingForward);
  }, [currentBeat]);

};