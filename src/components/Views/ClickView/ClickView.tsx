import {useAtomValue} from "jotai";
import {beatOffsetAtom, currentBeatAtom, currentlyPlayingAtom, selectedSongAtom} from "@/stores/store.ts";
import {ViewContainer} from "@/components/Views/ViewContainer.tsx";
import {SongInfo} from "@/components/Views/SongInfo.tsx";
import {usePropertyListener} from "@/hooks/usePropertyListener.ts";
import {useEffect, useRef, useState} from "react";
import {useGetTimeSignature} from "@/hooks/useGetTimeSignature.ts";

export const ClickView = () => {
  const selectedSong = useAtomValue(selectedSongAtom)
  const isPlaying = useAtomValue(currentlyPlayingAtom);

  const beatOffset = useAtomValue(beatOffsetAtom)
  const activeCircleOffset = 1;

  const currentBeat = useAtomValue(currentBeatAtom);
  // const [activeBeat, setActiveBeat] = useState<number | null>(null);
  const activeBeat = isPlaying ? currentBeat % 4 : null //todo: fix (hard af)
  const currentTimeSignature = useGetTimeSignature(activeBeat ?? undefined, selectedSong);
  const circleCount = currentTimeSignature.numerator
  // const timerRef = useRef<number>(null);

  // const handleBeat = (payload: number[]) => {
  //   if (!isPlaying || !selectedSong) return;
  //
  //   const beat = payload[0];
  //   const songStart = selectedSong?.timelineLocation
  //
  //   const nextActiveBeat = (beat - songStart + activeCircleOffset) % circleCount;
  //
  //   timerRef.current = setTimeout(() => {
  //     setActiveBeat(nextActiveBeat);
  //   }, beatOffset);
  // };

  // useEffect(() => {
  //   if (!isPlaying) {
  //     setActiveBeat(null)
  //     if (timerRef.current) {
  //       clearTimeout(timerRef.current)
  //     }
  //   }
  // }, [isPlaying]);
  //
  // usePropertyListener("/live/song/start_listen/beat", "/live/song/get/beat", handleBeat);

  return (
    <ViewContainer>
      <div className="font-mono grid grid-rows-3 h-full w-full">
        <div></div>
        <div className="justify-self-center flex flex-row items-center justify-between w-2/4">
          {Array.from({ length: circleCount }).map((_, index) => {
            const isActive = activeBeat === index;
            return (
              <div
                key={index}
                className={`w-16 h-16 rounded-full border-2 border-primary transition-all duration-150 ${
                  isActive
                    ? "bg-primary shadow-[0_0_12px_var(--primary)]"
                    : "bg-transparent"
                }`}
              />
            );
          })}
        </div>        <SongInfo />
      </div>
    </ViewContainer>
  );
};