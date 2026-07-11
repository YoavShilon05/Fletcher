import {useMemo} from "react";
import {selectedSongAtom, setlistAtom} from "@/stores/store.ts";
import {useAtomValue} from "jotai";
import {ArrowRightCircle} from "lucide-react";

export const AppHeader = () => {

  const selectedSong = useAtomValue(selectedSongAtom);
  const setlist = useAtomValue(setlistAtom)

  const currentSongIndex = useMemo(
    () => setlist?.findIndex((song) => song.name === selectedSong?.name) ?? -1,
    [setlist, selectedSong]
  );
  const nextSong = useMemo(
    () => (setlist && currentSongIndex >= 0 && currentSongIndex < setlist.length - 1)
      ? setlist[currentSongIndex + 1]
      : undefined,
    [setlist, currentSongIndex]
  );

  return (
    <header className="flex items-center gap-4 h-30 px-6 border-b border-border/20 shrink-0">
      {/* Left spacer - disappears on smaller screens */}
      <div className="hidden lg:block flex-1" />

      {/* Center title */}
      <div className="flex-1 min-w-0 flex justify-center">
        <h1 className="text-center text-white font-mono text-4xl sm:text-5xl font-bold tracking-tight leading-none select-none">
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
          <span className="text-xl sm:text-2xl font-semibold uppercase">
          Final Song
        </span>
        )}
      </div>
    </header>
  );};