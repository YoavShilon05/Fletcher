import {useAtomValue} from "jotai";
import {currentBeatAtom, currentlyPlayingAtom, selectedSongAtom} from "@/stores/store.ts";
import {ViewContainer} from "@/components/Views/ViewContainer.tsx";
import {SongInfo} from "@/components/Views/SongInfo.tsx";
import {getTimeSignature} from "@/utils/get-time-signature.ts";
import {calculateMeasure} from "@/utils/calc-current-measure.ts";

export const ClickView = () => {
  const selectedSong = useAtomValue(selectedSongAtom)
  const isPlaying = useAtomValue(currentlyPlayingAtom);

  //todo: comnsider non-4 denominators

  const currentBeat = useAtomValue(currentBeatAtom);
  const timeSignature = getTimeSignature(currentBeat, selectedSong);
  const activeBeat = isPlaying ? (
    selectedSong
      ? Math.round(calculateMeasure(currentBeat, selectedSong) * timeSignature.numerator) % timeSignature.numerator
      : currentBeat % timeSignature.numerator % timeSignature.numerator
    ) : null

  const circleCount = timeSignature.numerator

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