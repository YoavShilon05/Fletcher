import { Flag, Music, Play, type LucideIcon } from "lucide-react";
import { useAtomValue, useSetAtom } from "jotai";
import { currentBeatAtom, isPlayingAtom } from "@/features/live/atoms";
import { selectLocationAtom, selectSectionAtom } from "@/features/setlist/actions";
import { currentSectionAtom, selectedSongAtom } from "@/features/setlist/atoms";

/** Fallback beat transition while the song's tempo is unknown, in ms. */
const UNKNOWN_TEMPO_BEAT_MS = 150;

/**
 * A point you can start the song from, other than a section: the song
 * locator (playback, incl. any intro / count-in) and the optional START
 * locator (where the instruments' chart begins).
 */
interface StartPoint {
  label: string;
  Icon: LucideIcon;
  location: number;
}

export const SongStructure = () => {
  const selectedSong = useAtomValue(selectedSongAtom);
  const currentlyPlaying = useAtomValue(isPlayingAtom);
  const currentSection = useAtomValue(currentSectionAtom);
  const currentBeat = useAtomValue(currentBeatAtom);
  const selectSection = useSetAtom(selectSectionAtom);
  const selectLocation = useSetAtom(selectLocationAtom);
  const structure = selectedSong?.structure ?? [];

  const startPoints: StartPoint[] = [];
  if (selectedSong) {
    startPoints.push({ label: "Playback", Icon: Music, location: selectedSong.timelineLocation });
    if (selectedSong.start !== undefined) {
      startPoints.push({ label: "Chart", Icon: Flag, location: selectedSong.start });
    }
  }

  // Map each point's timelineLocation onto a 0–100% range so vertical
  // spacing reflects actual section length rather than being uniform.
  const locations = [
    ...structure.map((section) => section.timelineLocation),
    ...startPoints.map((point) => point.location),
  ];
  const startLocation = locations.length > 0 ? Math.min(...locations) : 0;
  const endLocation =
    selectedSong?.end ?? (locations.length > 0 ? Math.max(...locations) : startLocation);
  const totalDuration = Math.max(endLocation - startLocation, 1); // avoid /0 for 1-point songs

  const getTopPercent = (timelineLocation: number): number =>
    ((timelineLocation - startLocation) / totalDuration) * 100;

  // Clamp so the progress line/dot never overshoot the track visually,
  // e.g. if currentBeat briefly exceeds `end`.
  const progressPercent = Math.min(Math.max(getTopPercent(currentBeat), 0), 100);
  const hasProgress = locations.length > 0 && currentBeat >= startLocation;

  // Start points sitting on a section are tagged on that section's row; the
  // rest get rows of their own (one per location, so coinciding points share).
  const pointsAt = (location: number) => startPoints.filter((p) => p.location === location);
  const ownRowLocations = [...new Set(startPoints.map((p) => p.location))].filter(
    (location) => !structure.some((section) => section.timelineLocation === location),
  );

  // Beat-to-beat interval drives the CSS transition duration so the line/dot
  // glide continuously between discrete beat updates instead of snapping.
  const msPerBeat = !currentlyPlaying
    ? 0
    : selectedSong?.tempo
      ? (60 / selectedSong.tempo) * 1000
      : UNKNOWN_TEMPO_BEAT_MS;

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
              transitionProperty: "height",
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
                onClick={() => selectSection(section)}
                style={{ top: `${topPercent}%` }}
                className="group absolute left-0 -translate-y-1/2 flex items-center gap-3 text-left w-full cursor-pointer focus:outline-none transition-colors"
              >
                {/* Indicator Node */}
                <div
                  className={`w-5 h-5 rounded-sm flex items-center justify-center border transition-all z-10 bg-background
                    ${
                      isActive
                        ? "border-primary text-primary shadow-[0_0_8px_var(--juke-glow)]"
                        : "border-border text-muted group-hover:border-muted-foreground"
                    }`}
                >
                  <Play
                    className={`h-2.5 w-2.5 fill-current transition-transform ${isActive ? "scale-100" : "scale-0 group-hover:scale-75 text-muted-foreground"}`}
                  />
                </div>

                {/* Section Name label */}
                <span
                  className={`text-sm capitalize tracking-wide transition-colors truncate
                    ${
                      isActive
                        ? "text-foreground font-bold"
                        : "text-card-foreground group-hover:text-muted-foreground"
                    }`}
                >
                  {section.name}
                </span>
                {pointsAt(section.timelineLocation).map((point) => (
                  <StartTag
                    key={point.label}
                    point={point}
                    reached={currentBeat >= point.location}
                    showIcon
                  />
                ))}
              </button>
            );
          })}

          {/* Start points that aren't on a section — playback start / chart start */}
          {ownRowLocations.map((location) => {
            const points = pointsAt(location);
            const reached = currentBeat >= location;
            const { Icon } = points[0];

            return (
              <button
                key={location}
                onClick={() => selectLocation(location)}
                style={{ top: `${getTopPercent(location)}%` }}
                className="group absolute left-0 -translate-y-1/2 flex items-center gap-3 text-left w-full cursor-pointer focus:outline-none transition-colors"
              >
                <div
                  className={`w-5 h-5 rounded-sm flex items-center justify-center border border-dashed transition-all z-10 bg-background ${
                    reached
                      ? "border-primary text-primary"
                      : "border-border text-muted-foreground group-hover:border-muted-foreground"
                  }`}
                >
                  <Icon className="h-2.5 w-2.5" />
                </div>
                {points.map((point, i) => (
                  // The box already shows the first point's icon.
                  <StartTag key={point.label} point={point} reached={reached} showIcon={i > 0} />
                ))}
              </button>
            );
          })}

          {/* Playhead dot — leading edge of the progress line */}
          {hasProgress && (
            <div
              className="absolute left-2.5 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_6px_var(--juke-glow)] pointer-events-none z-20 ease-linear"
              style={{
                top: `${progressPercent}%`,
                transitionProperty: "top",
                transitionDuration: `${msPerBeat}ms`,
              }}
            />
          )}
        </div>

        {/* Fallback empty state */}
        {structure.length === 0 && startPoints.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-xs text-muted/50 italic">
            No sections defined
          </div>
        )}
      </div>
    </aside>
  );
};

/** Small label for a start point, lit once the playhead has reached it. */
const StartTag = ({
  point,
  reached,
  showIcon,
}: {
  point: StartPoint;
  reached: boolean;
  showIcon: boolean;
}) => (
  <span
    className={`flex items-center gap-1 text-[10px] tracking-widest uppercase transition-colors ${
      reached ? "text-primary" : "text-muted-foreground"
    }`}
  >
    {showIcon && <point.Icon className="h-2.5 w-2.5" />}
    {point.label}
  </span>
);
