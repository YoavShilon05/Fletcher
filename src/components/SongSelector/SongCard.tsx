import { Check, Hammer, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import type { Song } from "@/types/song";

interface SongCardProps {
  song: Song;
  status: "selected" | "adjacent" | "default";
  onClick: () => void;
  /** Compile this song's spoken cues onto the timeline. Absent on followers. */
  onBuild?: () => void;
  /** The song already has cues on the Fletcher_Count timeline. */
  built?: boolean;
  building?: boolean;
}

export const SongCard = ({
  song,
  status,
  onClick,
  onBuild,
  built = false,
  building = false,
}: SongCardProps) => {
  const isSelected = status === "selected";
  const isAdjacent = status === "adjacent";
  const BuildIcon = building ? Loader2 : built ? Check : Hammer;

  return (
    <Card
      onClick={onClick}
      className={`
        relative flex flex-col justify-between h-25 w-[116px] shrink-0 p-2.5 font-mono cursor-pointer transition-all duration-200
        before:absolute before:top-0 before:left-0 before:right-0 before:h-[3px] before:bg-muted
        ${isSelected ? "bg-(--juke-surface-selected) border-primary/60 shadow-[0_0_18px_var(--juke-glow)] -translate-y-1 scale-105 z-10 before:bg-primary before:shadow-[0_0_6px_var(--primary)]" : "hover:border-primary/40"}
        ${isAdjacent ? "-translate-y-0.5 scale-[1.015] opacity-85" : ""}
      `}
    >
      {/* Build: compile this song's cues onto the Fletcher_Count timeline */}
      {onBuild && (
        <button
          type="button"
          // The whole card selects the song, so the button has to keep its click.
          onClick={(e) => {
            e.stopPropagation();
            onBuild();
          }}
          disabled={building}
          title={built ? `Rebuild ${song.name}’s cues` : `Build ${song.name}’s cues`}
          className={`absolute bottom-2 right-2 z-20 flex items-center justify-center w-5 h-5 rounded-md transition-colors cursor-pointer disabled:cursor-default ${
            built
              ? "text-primary hover:bg-primary/15"
              : "text-muted hover:text-foreground hover:bg-muted/40"
          }`}
        >
          <BuildIcon className={`w-3 h-3 ${building ? "animate-spin" : ""}`} />
        </button>
      )}

      {/* Target Vinyl Icon Decal */}
      <div
        className={`absolute top-3 right-2 w-7 h-7 rounded-full bg-(--juke-label-bg) border border-(--juke-label-lines) flex items-center justify-center text-[8px] transition-opacity duration-200 ${isSelected ? "opacity-25" : "opacity-15"}`}
      >
        ●
      </div>

      {/* Song Title */}
      <div
        className={`text-xs font-bold max-w-[85px] truncate ${isSelected ? "text-foreground" : isAdjacent ? "text-(--juke-text-adjacent)" : "text-muted"}`}
      >
        {song.name}
      </div>

      {/* Meta Indicators */}
      <div className="flex flex-col gap-0.5">
        <div
          className={`text-lg font-bold ${isSelected ? "text-primary [text-shadow:0_0_8px_var(--juke-glow-strong)]" : isAdjacent ? "text-(--juke-text-adjacent-dim)" : "text-muted"}`}
        >
          {song.key}
        </div>
        <div
          className={`text-[10px] tracking-wide ${isSelected ? "text-secondary" : "text-card-foreground"}`}
        >
          {song.tempo} BPM
        </div>
      </div>
    </Card>
  );
};
