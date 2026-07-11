import {useAtomValue} from "jotai";
import {currentBeatAtom, currentlyPlayingAtom, selectedSongAtom} from "@/stores/store.ts";
import {getTimeSignature} from "@/utils/get-time-signature.ts";
import {calculateMeasure} from "@/utils/calc-current-measure.ts";
import {Separator} from "@/components/ui/separator.tsx";

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
    <div className="font-mono relative h-full w-full">
      <div className="flex justify-center w-full">
        <div className="fixed top-1/2 -translate-y-1/2 flex flex-col items-center w-3/5">
          <div className="flex justify-evenly items-center gap-2 w-full">
            {Array.from({ length: circleCount }).map((_, index) => {
              const isActive = activeBeat === index;
              return (
                <div
                  key={index}
                  className={`w-[min(4rem,7vw)] h-[min(4rem,7vw)] rounded-full border-2 border-primary transition-all duration-150 ${
                    isActive
                      ? "bg-primary shadow-[0_0_12px_var(--primary)]"
                      : "bg-transparent"
                  }`}
                />
              );
            })}
          </div>
        </div>
      </div>

      {selectedSong?.tempo && (
        <div className="flex justify-center w-full">
          <div className="fixed bottom-[10vh] flex flex-col items-center w-1/6 min-w-fit">
            <div className="text-muted-foreground text-4xl tracking-widest my-6 whitespace-nowrap">
              {selectedSong.tempo} BPM
            </div>
            <Separator />
          </div>
        </div>
      )}
    </div>
  );
};