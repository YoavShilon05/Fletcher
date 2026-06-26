import {ReactNode, useRef} from "react";
import {usePropertyListener} from "@/hooks/usePropertyListener.ts";
import {useAtomValue} from "jotai";
import {currentlyPlayingAtom} from "@/stores/store.ts";
import "./ViewContainer.css"

interface ViewContainerProps {
  children: ReactNode
}

export const ViewContainer = ({ children }: ViewContainerProps) => {
  const ANIMATION_OFFSET = 390; // ms

  const isPlaying = useAtomValue(currentlyPlayingAtom);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleBeat = () => {
    if (!isPlaying) return;
    const el = containerRef.current;
    if (!el) return;

    setTimeout(() => {
      el.classList.remove("beat-flash");
      void el.offsetWidth;
      el.classList.add("beat-flash");
    }, ANIMATION_OFFSET);
  };

  usePropertyListener("/live/song/start_listen/beat", "/live/song/get/beat", handleBeat);

  return (
    <div
      ref={containerRef}
      className="flex flex-col items-center justify-center w-full h-full text-center"
    >
      {children}
    </div>
  );
};