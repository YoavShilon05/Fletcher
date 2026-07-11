import { Play } from 'lucide-react';
import {useAtomValue, useAtom} from "jotai";
import {
  currentSectionAtom,
  currentBeatAtom,
  selectedSongAtom,
  currentlyPlayingAtom
} from "@/stores/store.ts";
import {useSnapSelection} from "@/hooks/useSnapSelection.ts";
import {SongSection} from "@/interfaces/song-section.ts";
import {sendOsc} from "@/hooks/useOsc.ts";
import {useSyncToPlayback} from "@/hooks/useSyncToPlayback.ts";

export const SongStructure = () => {

  const selectedSong = useAtomValue(selectedSongAtom)
  const currentlyPlaying = useAtomValue(currentlyPlayingAtom)
  const [currentSection, setCurrentSection] = useAtom(currentSectionAtom);
  const currentBeat = useAtomValue(currentBeatAtom);
  const structure = selectedSong?.structure || []

  useSnapSelection()
  useSyncToPlayback()

  const onSectionSelect = (section: SongSection): void => {
    if (currentlyPlaying) return;
    setCurrentSection(section)
    sendOsc(`/live/song/jump_to`, [section.timelineLocation]);
    sendOsc(`/live/song/set/start_time`, [section.timelineLocation]);
  }

  // Map each section's timelineLocation onto a 0–100% range so vertical
  // spacing reflects actual section length rather than being uniform.
  const startLocation = structure[0]?.timelineLocation ?? 0;
  const endLocation = selectedSong?.end
    ?? structure[structure.length - 1]?.timelineLocation
    ?? startLocation;
  const totalDuration = Math.max(endLocation - startLocation, 1); // avoid /0 for 1-section songs

  const getTopPercent = (timelineLocation: number): number =>
    ((timelineLocation - startLocation) / totalDuration) * 100;

  // Clamp so the progress line/dot never overshoot the track visually,
  // e.g. during count-in or if currentBeat briefly exceeds `end`.
  const progressPercent = Math.min(Math.max(getTopPercent(currentBeat), 0), 100);
  const hasProgress = structure.length > 0 && currentBeat >= startLocation;

  // Beat-to-beat interval drives the CSS transition duration so the line/dot
  // glide continuously between discrete beat updates instead of snapping.
  const msPerBeat = currentlyPlaying ? (selectedSong?.tempo ? (60 / selectedSong.tempo) * 1000 : 150) : 0;

  return (
    <aside className="w-48 h-full min-h-0 flex flex-col bg-background border-r border-border font-mono p-4 select-none">
      {/* Sidebar Header */}
      <div className="text-[10px] tracking-widest uppercase text-card-foreground mb-4">
        Structure
      </div>

      {/* Timeline track, proportional to section length */}
      <div className="flex-1 relative">
        {/* Subtle background timeline line */}
        <div className="absolute inset-y-4 left-2.5 w-[1px] bg-border/60 pointer-events-none" />

        {/* Progress line — fills from the top down to currentBeat */}
        {hasProgress && (
          <div
            className="absolute left-2.5 top-4 w-[1px] bg-primary/70 pointer-events-none ease-linear"
            style={{
              height: `calc(${progressPercent}% * (100% - 2rem) / 100%)`,
              transitionProperty: 'height',
              transitionDuration: `${msPerBeat}ms`,
            }}
          />
        )}

        {/* Positioning region — matches the line's inset so percentages line up */}
        <div className="absolute inset-y-4 left-0 right-0">
          {structure.map((section, idx) => {
            const isActive = currentSection?.timelineLocation === section.timelineLocation;
            const topPercent = getTopPercent(section.timelineLocation);

            return (
              <button
                key={`${section.name}-${idx}`}
                onClick={() => onSectionSelect?.(section)}
                style={{ top: `${topPercent}%` }}
                className="group absolute left-0 -translate-y-1/2 flex items-center gap-3 text-left w-full cursor-pointer focus:outline-none transition-colors"
              >
                {/* Indicator Node */}
                <div
                  className={`w-5 h-5 rounded-sm flex items-center justify-center border transition-all z-10 bg-background
                    ${isActive
                    ? 'border-primary text-primary shadow-[0_0_8px_var(--juke-glow)]'
                    : 'border-border text-muted group-hover:border-muted-foreground'
                  }`}
                >
                  <Play className={`h-2.5 w-2.5 fill-current transition-transform ${isActive ? 'scale-100' : 'scale-0 group-hover:scale-75 text-muted-foreground'}`} />
                </div>

                {/* Section Name label */}
                <span
                  className={`text-sm capitalize tracking-wide transition-colors truncate
                    ${isActive
                    ? 'text-foreground font-bold'
                    : 'text-card-foreground group-hover:text-muted-foreground'
                  }`}
                >
                  {section.name}
                </span>
              </button>
            );
          })}

          {/* Playhead dot — leading edge of the progress line */}
          {hasProgress && (
            <div
              className="absolute left-2.5 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_6px_var(--juke-glow)] pointer-events-none z-20 ease-linear"
              style={{
                top: `${progressPercent}%`,
                transitionProperty: 'top',
                transitionDuration: `${msPerBeat}ms`,
              }}
            />
          )}
        </div>

        {/* Fallback empty state */}
        {structure.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-xs text-muted/50 italic">
            No sections defined
          </div>
        )}
      </div>
    </aside>
  );
};