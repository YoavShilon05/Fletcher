import { useAtomValue } from "jotai";
import { TempoFooter } from "@/components/Views/TempoFooter";
import { currentBeatAtom, isPlayingAtom } from "@/features/live/atoms";
import { calculateMeasure } from "@/features/music/measure";
import { tempoAt, tempoContextAtom } from "@/features/music/tempo";
import { timeSignatureAt, timeSignatureContextAtom } from "@/features/music/time-signature";
import { selectedSongAtom } from "@/features/setlist/atoms";

export const ClickView = () => {
  const selectedSong = useAtomValue(selectedSongAtom);
  const isPlaying = useAtomValue(isPlayingAtom);
  const currentBeat = useAtomValue(currentBeatAtom);
  const timeSignatures = useAtomValue(timeSignatureContextAtom);
  const tempos = useAtomValue(tempoContextAtom);

  // Follows the envelope through a song that switches tempo mid-way.
  const tempo = tempoAt(tempos, selectedSong, currentBeat);

  // TODO: consider non-4 denominators
  const { numerator } = timeSignatureAt(timeSignatures, selectedSong, currentBeat);

  // Measures run negative through the count-in, so wrap into [0, numerator).
  const beatInBar = (beats: number) => ((Math.round(beats) % numerator) + numerator) % numerator;

  const activeBeat = !isPlaying
    ? null
    : selectedSong
      ? beatInBar(calculateMeasure(timeSignatures, selectedSong, currentBeat) * numerator)
      : beatInBar(currentBeat);

  return (
    <div className="font-mono relative h-full w-full">
      <div className="flex justify-center w-full">
        <div className="absolute top-1/2 -translate-y-1/2 flex flex-col items-center w-3/5">
          <div className="flex justify-evenly items-center gap-2 w-full">
            {Array.from({ length: numerator }, (_, index) => (
              <div
                key={index}
                className={`w-[min(4rem,7vw)] h-[min(4rem,7vw)] rounded-full border-2 border-primary transition-all duration-150 ${
                  activeBeat === index
                    ? "bg-primary shadow-[0_0_12px_var(--primary)]"
                    : "bg-transparent"
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {tempo ? <TempoFooter tempo={tempo} /> : null}
    </div>
  );
};
