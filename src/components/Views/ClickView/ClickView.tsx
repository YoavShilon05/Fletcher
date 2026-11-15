import { useAtomValue } from "jotai";
import { useState } from "react";
import { TempoFooter } from "@/components/Views/TempoFooter";
import { currentBeatAtom, isPlayingAtom } from "@/features/live/atoms";
import { usePlayheadSteps } from "@/features/live/useBeatClock";
import { pulseGroups, pulseInBar, pulsesPerBeat } from "@/features/music/pulse";
import { tempoAt, tempoContextAtom } from "@/features/music/tempo";
import { timeSignatureAt, timeSignatureContextAtom } from "@/features/music/time-signature";
import { selectedSongAtom } from "@/features/setlist/atoms";
import { cn } from "@/lib/utils";

/** Width the bar has to lay itself out in: the row below is `w-3/5`, in vw. */
const ROW_VW = 60;
/** Least space left between one beat's circles and the next's, in vw. */
const GROUP_GAP_VW = 1.2;
/** A subdivision circle's diameter, relative to the beat circle it hangs off. */
const SMALL_RATIO = 0.4;
/** Space between circles within one beat, relative to the beat circle. */
const SMALL_GAP_RATIO = 0.3;

/**
 * Diameter of a quarter-note circle, as a CSS length.
 *
 * The more a bar has to draw, the smaller its circles, so twelve sixteenths
 * fit the row instead of running off the sides. Once a bar is sparse enough
 * the cap takes over, which is every x/4 signature — 4/4 is sized exactly as
 * it always was.
 */
function pulseSize(groups: number[][]) {
  const widths = groups.reduce(
    (total, group) => total + 1 + (group.length - 1) * (SMALL_RATIO + SMALL_GAP_RATIO),
    0,
  );
  const room = ROW_VW - GROUP_GAP_VW * (groups.length - 1);
  return `min(4rem, 7vw, ${(room / widths).toFixed(2)}vw)`;
}

export const ClickView = () => {
  const selectedSong = useAtomValue(selectedSongAtom);
  const isPlaying = useAtomValue(isPlayingAtom);
  const currentBeat = useAtomValue(currentBeatAtom);
  const timeSignatures = useAtomValue(timeSignatureContextAtom);
  const tempos = useAtomValue(tempoContextAtom);

  // Follows the envelope through a song that switches tempo mid-way.
  const tempo = tempoAt(tempos, selectedSong, currentBeat);

  // One group per quarter-note beat: a big circle for the beat, then a small
  // one for each subdivision it holds (none in x/4, one in x/8, three in x/16).
  const timeSignature = timeSignatureAt(timeSignatures, selectedSong, currentBeat);
  const groups = pulseGroups(timeSignature);
  const size = pulseSize(groups);

  // `currentBeatAtom` only ever moves a whole quarter note at a time, so it
  // can't see the off-beat of a 6/8 bar. The circles therefore run on their own
  // clock, stepping once per pulse of whatever signature is in force.
  const [pulseBeat, setPulseBeat] = useState(currentBeat);
  usePlayheadSteps(pulsesPerBeat(timeSignature), setPulseBeat);

  const activePulse = isPlaying
    ? pulseInBar(timeSignatures, timeSignature, pulseBeat, selectedSong)
    : null;

  return (
    <div className="font-mono relative h-full w-full">
      <div className="flex justify-center w-full">
        <div className="absolute top-1/2 -translate-y-1/2 flex flex-col items-center w-3/5">
          <div
            className="flex justify-evenly items-center w-full"
            style={{ gap: `${GROUP_GAP_VW}vw` }}
          >
            {groups.map((group) => (
              <div
                key={group[0]}
                className="flex items-center"
                style={{ gap: `calc(${size} * ${SMALL_GAP_RATIO})` }}
              >
                {group.map((pulse) => {
                  const diameter = pulse === group[0] ? size : `calc(${size} * ${SMALL_RATIO})`;
                  return (
                    <div
                      key={pulse}
                      className={cn(
                        "rounded-full border-2 border-primary transition-all duration-150",
                        activePulse === pulse
                          ? "bg-primary shadow-[0_0_12px_var(--primary)]"
                          : "bg-transparent",
                      )}
                      style={{ width: diameter, height: diameter }}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {tempo ? <TempoFooter tempo={tempo} /> : null}
    </div>
  );
};
