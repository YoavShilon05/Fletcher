import {useRef, useEffect} from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SongCard } from './SongCard';
import {useAtom, useAtomValue, useSetAtom} from "jotai";
import {currentSectionAtom, selectedSongAtom, setlistAtom} from "@/stores/store.ts";
import {sendOsc} from "@/hooks/useOsc.ts";


export const SongSelector = () => {
  const trackRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [selectedSong, setSelectedSong] = useAtom(selectedSongAtom);
  const setlist = useAtomValue(setlistAtom)
  const setCurrentSection = useSetAtom(currentSectionAtom)
  const currentIndex = setlist?.findIndex((s) => s.name === selectedSong?.name) || 0;

  const handleSelectIndex = (index: number) => {
    if (!setlist) return;
    if (index >= 0 && index < setlist.length) {
      const selectedSong = setlist[index]
      setSelectedSong(selectedSong)
      sendOsc(`/live/song/set/start_time`, [selectedSong.timelineLocation])
    };
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (!setlist) return;
      if (e.deltaY > 0 || e.deltaX > 0) {
        if (currentIndex < setlist.length - 1) handleSelectIndex(currentIndex + 1);
      } else {
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
      const targetLeft = activeCard.offsetLeft - track.offsetWidth / 2 + activeCard.offsetWidth / 2;
      track.scrollTo({ left: targetLeft, behavior: 'smooth' });
    }
  }, [currentIndex]);

  return (
    <div ref={containerRef} className="relative bg-background border-t-2 border-border py-3 overflow-hidden">
      {/* Chrome Strip */}
      <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-primary via-secondary via-primary to-secondary" />

      {/* Header Info */}
      <div className="flex items-center justify-between px-[18px] pb-2 font-mono text-[10px] tracking-widest uppercase text-card-foreground">
        <span>Setlist</span>
        <div className="flex items-center gap-1.5 text-xs text-primary">
          <div className="w-1.5 h-1.5 rounded-full bg-primary animate-juke-blink" />
          <span className="font-mono text-[11px] tracking-wide uppercase">{selectedSong?.name}</span>
        </div>
      </div>

      {/* Carousel Core Track Wrap */}
      <div className="relative">
        <div className="absolute top-0 bottom-0 left-0 w-20 z-20 pointer-events-none bg-gradient-to-r from-background to-transparent" />
        <div className="absolute top-0 bottom-0 right-0 w-20 z-20 pointer-events-none bg-gradient-to-l from-background to-transparent" />
        <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-[136px] border-x border-primary/25 pointer-events-none z-10" />

        <div ref={trackRef} className="flex items-center gap-2.5 py-1.5 overflow-x-auto no-scrollbar scroll-smooth">
          <div className="shrink-0 w-[calc(50%-63px)]" />
          {setlist && setlist.map((song, idx) => {
            const diff = Math.abs(idx - currentIndex);
            const status = idx === currentIndex ? 'selected' : diff === 1 ? 'adjacent' : 'default';

            return (
              <div key={`${song.name}-${idx}`} className="song-card-wrapper shrink-0">
                <SongCard song={song} status={status} onClick={() => handleSelectIndex(idx)} />
              </div>
            );
          })}
          <div className="shrink-0 w-[calc(50%-63px)]" />
        </div>
      </div>

      {/* Controls Layer */}
      <div className="flex items-center justify-center gap-4 mt-2.5">
        <Button
          variant="outline"
          size="icon"
          onClick={() => handleSelectIndex(currentIndex - 1)}
          disabled={currentIndex === 0}
          className="h-7 w-7 rounded-full border-border text-card-foreground bg-transparent"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <span className="font-mono text-xs text-card-foreground min-w-[50px] text-center">
          {currentIndex + 1} / {setlist?.length ?? "??"}
        </span>

        <Button
          variant="outline"
          size="icon"
          onClick={() => handleSelectIndex(currentIndex + 1)}
          disabled={!setlist || currentIndex === setlist.length - 1}
          className="h-7 w-7 rounded-full border-border text-card-foreground bg-transparent"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};