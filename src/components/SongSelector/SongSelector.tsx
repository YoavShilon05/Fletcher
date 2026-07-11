import { useRef, useEffect, useState, useCallback } from 'react';
import { SongCard } from './SongCard';
import {useAtom, useAtomValue, useSetAtom} from "jotai";
import {currentSectionAtom, selectedSongAtom, setlistAtom} from "@/stores/store.ts";
import { sendOsc } from "@/hooks/useOsc.ts";

export const SongSelector = () => {
  const trackRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [selectedSong, setSelectedSong] = useAtom(selectedSongAtom);
  const setlist = useAtomValue(setlistAtom);
  const setCurrentSection = useSetAtom(currentSectionAtom)

  const globalIndex = setlist?.findIndex((s) => s.name === selectedSong?.name) || 0;

  // Local state tracks the UI independently
  const [localIndex, setLocalIndex] = useState(globalIndex);
  const localIndexRef = useRef(localIndex);

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const scrollThrottleRef = useRef<boolean>(false);

  // Sync back to local if the global state changes externally
  useEffect(() => {
    setLocalIndex(globalIndex);
    localIndexRef.current = globalIndex;
  }, [globalIndex]);

  // Handles global state and OSC sends
  const commitSelection = useCallback((index: number) => {
    if (!setlist) return;
    const selected = setlist[index];

    setSelectedSong(selected);
    setCurrentSection(selected.structure.at(0))
    sendOsc(`/live/song/jump_to`, [selected.timelineLocation]);
    sendOsc(`/live/song/set/start_time`, [selected.timelineLocation]);
  }, [setlist, setSelectedSong]);

  const handleSelectIndex = useCallback((index: number) => {
    if (!setlist || index < 0 || index >= setlist.length) return;

    // Instantly update the local UI for smooth scrolling/swiping
    setLocalIndex(index);
    localIndexRef.current = index;

    // Debounce the heavy lifting
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

    debounceTimerRef.current = setTimeout(() => {
      commitSelection(index);
    }, 250);
  }, [setlist, commitSelection]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !setlist) return;

    let touchStartY = 0;

    const triggerScrollThrottled = (direction: 'up' | 'down') => {
      if (scrollThrottleRef.current) return;

      scrollThrottleRef.current = true;
      setTimeout(() => { scrollThrottleRef.current = false; }, 80);

      const current = localIndexRef.current;
      if (direction === 'down' && current < setlist.length - 1) {
        handleSelectIndex(current + 1);
      } else if (direction === 'up' && current > 0) {
        handleSelectIndex(current - 1);
      }
    };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      triggerScrollThrottled(e.deltaY > 0 ? 'down' : 'up');
    };

    const handleTouchStart = (e: TouchEvent) => {
      touchStartY = e.touches[0].clientY;
    };

    const handleTouchMove = (e: TouchEvent) => {
      // Prevent the browser's default pull-to-refresh or page bouncing
      e.preventDefault();

      const currentY = e.touches[0].clientY;
      const diff = touchStartY - currentY;
      const swipeThreshold = 30; // Pixels needed to trigger a song change

      if (diff > swipeThreshold) {
        // Swiped up (moving down the list)
        triggerScrollThrottled('down');
        touchStartY = currentY; // Reset anchor for continuous swiping
      } else if (diff < -swipeThreshold) {
        // Swiped down (moving up the list)
        triggerScrollThrottled('up');
        touchStartY = currentY; // Reset anchor for continuous swiping
      }
    };

    // Passive: false is required so we can call e.preventDefault()
    container.addEventListener('wheel', handleWheel, { passive: false });
    container.addEventListener('touchstart', handleTouchStart, { passive: false });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });

    return () => {
      container.removeEventListener('wheel', handleWheel);
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
    };
  }, [setlist, handleSelectIndex]);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    const cards = track.querySelectorAll('.song-card-wrapper');
    const activeCard = cards[localIndex] as HTMLElement;

    if (activeCard) {
      const trackCenter = track.offsetHeight / 2;
      const cardCenter = activeCard.offsetHeight / 2;
      const targetTop = activeCard.offsetTop - trackCenter + cardCenter;

      track.scrollTo({ top: targetTop, behavior: 'smooth' });
    }
  }, [localIndex]);

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, []);

  return (
    <div ref={containerRef} className={"flex flex-col h-full w-60 overflow-hidden touch-none"}>
      <div className="flex items-center justify-between px-[18px] pb-4 shrink-0 font-mono text-[10px] tracking-widest uppercase text-card-foreground">
        <span>Setlist</span>
        <div className="flex items-center gap-1.5 text-xs text-primary">
          <div className="w-1.5 h-1.5 rounded-full bg-primary animate-juke-blink" />
          <span className="font-mono text-[11px] tracking-wide uppercase">
            {setlist?.[localIndex]?.name || selectedSong?.name}
          </span>
        </div>
      </div>

      <div ref={trackRef} className="flex flex-col items-center gap-2 h-full overflow-y-hidden scroll-smooth py-4 px-2">
        {setlist && setlist.map((song, idx) => {
          const isSelected = idx === localIndex;
          const diff = Math.abs(idx - localIndex);
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

              <SongCard
                song={song}
                status={status}
                onClick={() => {
                  setLocalIndex(idx);
                  localIndexRef.current = idx;
                  commitSelection(idx);
                }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};