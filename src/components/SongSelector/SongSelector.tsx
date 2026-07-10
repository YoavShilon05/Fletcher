import { useRef, useEffect } from 'react';
import { SongCard } from './SongCard';
import { useAtom, useAtomValue } from "jotai";
import { selectedSongAtom, setlistAtom } from "@/stores/store.ts";
import { sendOsc } from "@/hooks/useOsc.ts";

export const SongSelector = () => {
  const trackRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [selectedSong, setSelectedSong] = useAtom(selectedSongAtom);
  const setlist = useAtomValue(setlistAtom);
  const currentIndex = setlist?.findIndex((s) => s.name === selectedSong?.name) || 0;

  const handleSelectIndex = (index: number) => {
    if (!setlist) return;
    if (index >= 0 && index < setlist.length) {
      const selected = setlist[index];
      setSelectedSong(selected);
      sendOsc(`/live/song/set/start_time`, [selected.timelineLocation]);
    }
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (!setlist) return;

      if (e.deltaY > 0) {
        if (currentIndex < setlist.length - 1) handleSelectIndex(currentIndex + 1);
      } else if (e.deltaY < 0) {
        if (currentIndex > 0) handleSelectIndex(currentIndex - 1);
      }
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [currentIndex, setlist]);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    const cards = track.querySelectorAll('.song-card-wrapper');
    const activeCard = cards[currentIndex] as HTMLElement;

    if (activeCard) {
      // FIX: Calculate the exact scroll position manually.
      // This forces ONLY the inner track to scroll, protecting the main window.
      const trackCenter = track.offsetHeight / 2;
      const cardCenter = activeCard.offsetHeight / 2;
      const targetTop = activeCard.offsetTop - trackCenter + cardCenter;

      track.scrollTo({ top: targetTop, behavior: 'smooth' });
    }
  }, [currentIndex]);

  return (
    <div ref={containerRef} className={"flex flex-col h-full w-60 overflow-hidden"}>

      {/* Header Info */}
      <div className="flex items-center justify-between px-[18px] pb-4 shrink-0 font-mono text-[10px] tracking-widest uppercase text-card-foreground">
        <span>Setlist</span>
        <div className="flex items-center gap-1.5 text-xs text-primary">
          <div className="w-1.5 h-1.5 rounded-full bg-primary animate-juke-blink" />
          <span className="font-mono text-[11px] tracking-wide uppercase">{selectedSong?.name}</span>
        </div>
      </div>


      <div ref={trackRef} className="flex flex-col items-center gap-2 h-full overflow-y-hidden scroll-smooth py-4 px-2">
        {setlist && setlist.map((song, idx) => {
          const isSelected = idx === currentIndex;
          const diff = Math.abs(idx - currentIndex);
          const status = isSelected ? 'selected' : diff === 1 ? 'adjacent' : 'default';

          return (
            <div
              key={`${song.name}-${idx}`}
              className="song-card-wrapper relative flex items-center justify-center shrink-0 w-full max-w-[280px] py-1 transition-all duration-300"
            >
              {isSelected && (
                <>
                  <div className="absolute top-0 left-0 right-0 h-[1px] bg-primary/25 z-10" />
                  <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-primary/25 z-10" />
                </>
              )}

              <SongCard song={song} status={status} onClick={() => handleSelectIndex(idx)} />
            </div>
          );
        })}
      </div>
    </div>
  // <div ref={containerRef} className="relative bg-background border-t-2 border-border py-3 flex flex-col h-full max-h-screen overflow-hidden w-60">
  //
  //   {/* Chrome Strip */}
  //   <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-primary via-secondary via-primary to-secondary" />
  //
  //   {/* Header Info */}
  //   <div className="flex items-center justify-between px-[18px] pb-4 shrink-0 font-mono text-[10px] tracking-widest uppercase text-card-foreground">
  //     <span>Setlist</span>
  //     <div className="flex items-center gap-1.5 text-xs text-primary">
  //       <div className="w-1.5 h-1.5 rounded-full bg-primary animate-juke-blink" />
  //       <span className="font-mono text-[11px] tracking-wide uppercase">{selectedSong?.name}</span>
  //     </div>
  //   </div>
  //
  //   {/* Carousel Core Track Wrap */}
  //   <div className="relative flex-1 min-h-0 flex flex-col">
  //     {/* Top & Bottom Fade Gradients */}
  //     <div className="absolute top-0 left-0 right-0 h-12 z-20 pointer-events-none bg-gradient-to-b from-background to-transparent" />
  //     <div className="absolute bottom-0 left-0 right-0 h-12 z-20 pointer-events-none bg-gradient-to-t from-background to-transparent" />
  //
  //     {/* Vertical Track */}
  //     <div ref={trackRef} className="flex flex-col items-center gap-2 h-full overflow-y-auto scroll-smooth py-4 px-2">
  //
  //       {setlist && setlist.map((song, idx) => {
  //         const isSelected = idx === currentIndex;
  //         const diff = Math.abs(idx - currentIndex);
  //         const status = isSelected ? 'selected' : diff === 1 ? 'adjacent' : 'default';
  //
  //         return (
  //           <div
  //             key={`${song.name}-${idx}`}
  //             className="song-card-wrapper relative shrink-0 w-full max-w-[280px] py-1 transition-all duration-300"
  //           >
  //             {isSelected && (
  //               <>
  //                 <div className="absolute top-0 left-0 right-0 h-[1px] bg-primary/25 z-10" />
  //                 <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-primary/25 z-10" />
  //               </>
  //             )}
  //
  //             <SongCard song={song} status={status} onClick={() => handleSelectIndex(idx)} />
  //           </div>
  //         );
  //       })}
  //
  //     </div>
  //   </div>
  //
  //   {/* Controls Layer */}
  //   <div className="flex items-center justify-center gap-4 pt-4 shrink-0 border-t border-border/20 mt-2">
  //     <Button
  //       variant="outline"
  //       size="icon"
  //       onClick={() => handleSelectIndex(currentIndex - 1)}
  //       disabled={currentIndex === 0}
  //       className="h-7 w-7 rounded-full border-border text-card-foreground bg-transparent"
  //     >
  //       <ChevronUp className="h-4 w-4" />
  //     </Button>
  //
  //     <span className="font-mono text-xs text-card-foreground min-w-[50px] text-center">
  //         {currentIndex + 1} / {setlist?.length ?? "??"}
  //       </span>
  //
  //     <Button
  //       variant="outline"
  //       size="icon"
  //       onClick={() => handleSelectIndex(currentIndex + 1)}
  //       disabled={!setlist || currentIndex === setlist.length - 1}
  //       className="h-7 w-7 rounded-full border-border text-card-foreground bg-transparent"
  //     >
  //       <ChevronDown className="h-4 w-4" />
  //     </Button>
  //   </div>
  // </div>
);
};