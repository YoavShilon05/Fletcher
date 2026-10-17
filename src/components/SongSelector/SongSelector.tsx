import { useAtomValue, useSetAtom } from "jotai";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import {
  SONG_SCROLL_THROTTLE_MS,
  SONG_SELECT_DEBOUNCE_MS,
  SONG_SWIPE_THRESHOLD_PX,
} from "@/constants";
import { selectSongAtom } from "@/features/setlist/actions";
import { selectedSongIndexAtom, setlistAtom } from "@/features/setlist/atoms";
import { SongCard } from "./SongCard";

export const SongSelector = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  const setlist = useAtomValue(setlistAtom);
  const selectedIndex = Math.max(0, useAtomValue(selectedSongIndexAtom));
  const selectSong = useSetAtom(selectSongAtom);

  // While wheeling/swiping, the highlighted card runs ahead of the real
  // selection; Live is only cued once the gesture settles.
  const [pendingIndex, setPendingIndex] = useState<number | null>(null);
  const shownIndex = pendingIndex ?? selectedIndex;

  const debounceTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const throttleTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const commit = (index: number) => {
    clearTimeout(debounceTimer.current);
    setPendingIndex(null);
    const song = setlist[index];
    if (song) selectSong(song);
  };

  const step = useEffectEvent((direction: 1 | -1) => {
    if (throttleTimer.current) return;
    throttleTimer.current = setTimeout(() => {
      throttleTimer.current = undefined;
    }, SONG_SCROLL_THROTTLE_MS);

    const index = shownIndex + direction;
    if (index < 0 || index >= setlist.length) return;

    setPendingIndex(index);
    clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => commit(index), SONG_SELECT_DEBOUNCE_MS);
  });

  // Wheel and swipe step through the setlist one song at a time.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let touchStartY = 0;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      step(e.deltaY > 0 ? 1 : -1);
    };
    const handleTouchStart = (e: TouchEvent) => {
      touchStartY = e.touches[0].clientY;
    };
    const handleTouchMove = (e: TouchEvent) => {
      // Stop the browser's own pull-to-refresh / page bounce.
      e.preventDefault();
      const y = e.touches[0].clientY;
      const travelled = touchStartY - y;
      if (Math.abs(travelled) < SONG_SWIPE_THRESHOLD_PX) return;
      step(travelled > 0 ? 1 : -1); // swiping up moves down the list
      touchStartY = y; // re-anchor so a long swipe keeps stepping
    };

    // passive: false so the handlers may call preventDefault().
    container.addEventListener("wheel", handleWheel, { passive: false });
    container.addEventListener("touchstart", handleTouchStart, { passive: false });
    container.addEventListener("touchmove", handleTouchMove, { passive: false });
    return () => {
      container.removeEventListener("wheel", handleWheel);
      container.removeEventListener("touchstart", handleTouchStart);
      container.removeEventListener("touchmove", handleTouchMove);
    };
  }, []);

  useEffect(
    () => () => {
      clearTimeout(debounceTimer.current);
      clearTimeout(throttleTimer.current);
    },
    [],
  );

  // Keep the highlighted card centred in the track.
  useEffect(() => {
    const track = trackRef.current;
    const card = cardRefs.current[shownIndex];
    if (!track || !card) return;

    const top = card.offsetTop - track.offsetHeight / 2 + card.offsetHeight / 2;
    track.scrollTo({ top, behavior: "smooth" });
  }, [shownIndex, setlist.length]);

  return (
    <div ref={containerRef} className="flex flex-col h-full w-60 overflow-hidden touch-none">
      <div className="flex items-center justify-between px-[18px] pb-4 shrink-0 font-mono text-[10px] tracking-widest uppercase text-card-foreground">
        <span>Setlist</span>
        <div className="flex items-center gap-1.5 text-xs text-primary">
          <div className="w-1.5 h-1.5 rounded-full bg-primary animate-juke-blink" />
          <span className="font-mono text-[11px] tracking-wide uppercase">
            {setlist[shownIndex]?.name}
          </span>
        </div>
      </div>

      <div
        ref={trackRef}
        className="flex flex-col items-center gap-2 h-full overflow-y-hidden scroll-smooth py-4 px-2"
      >
        {setlist.map((song, index) => {
          const isSelected = index === shownIndex;
          const distance = Math.abs(index - shownIndex);
          const status = isSelected ? "selected" : distance === 1 ? "adjacent" : "default";

          return (
            <div
              key={`${song.name}-${index}`}
              ref={(el) => {
                cardRefs.current[index] = el;
              }}
              className="relative flex items-center justify-center shrink-0 w-full max-w-[280px] py-1 transition-all duration-300"
            >
              {isSelected && (
                <>
                  <div className="absolute top-0 left-0 right-0 h-px bg-primary/25 z-10" />
                  <div className="absolute bottom-0 left-0 right-0 h-px bg-primary/25 z-10" />
                </>
              )}

              <SongCard song={song} status={status} onClick={() => commit(index)} />
            </div>
          );
        })}
      </div>
    </div>
  );
};
