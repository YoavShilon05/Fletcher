import { useAtomValue } from "jotai";
import { ArrowRightCircle } from "lucide-react";
import { nextSongAtom, selectedSongAtom } from "@/features/setlist/atoms";

export const AppHeader = () => {
  const selectedSong = useAtomValue(selectedSongAtom);
  const nextSong = useAtomValue(nextSongAtom);

  return (
    <header className="flex items-center gap-4 h-30 px-6 border-b border-border/20 shrink-0">
      {/* Left spacer - disappears on smaller screens */}
      <div className="hidden lg:block flex-1" />

      {/* Center title */}
      <div className="flex-1 min-w-0 flex justify-center">
        <h1 className="text-center text-foreground font-mono text-4xl sm:text-5xl font-bold tracking-tight leading-none select-none">
          {selectedSong?.name}
        </h1>
      </div>

      {/* Right */}
      <div className="flex-1 min-w-0 flex justify-end items-center gap-3 text-muted-foreground font-mono">
        <ArrowRightCircle className="h-6 w-6 shrink-0" />

        {nextSong ? (
          <div className="min-w-0">
            <span className="uppercase tracking-wider text-sm mr-2">Next</span>
            <span className="text-xl sm:text-2xl font-semibold truncate block">
              {nextSong.name}
            </span>
          </div>
        ) : (
          <span className="text-xl sm:text-2xl font-semibold uppercase">Final Song</span>
        )}
      </div>
    </header>
  );
};
