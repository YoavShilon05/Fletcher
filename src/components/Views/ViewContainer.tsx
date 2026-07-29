import {ReactNode, useEffect, useRef} from "react";
import {useAtomValue} from "jotai";
import {
  beatOffsetAtom,
  currentBeatAtom,
  currentlyPlayingAtom,
  lightScreenAtom,
  toolbarHeightAtom
} from "@/stores/store.ts";
import "./ViewContainer.css"

// Matches the p-10 breathing room used on the other three sides.
const BASE_PADDING = 40

interface ViewContainerProps {
  children: ReactNode
}

export const ViewContainer = ({ children }: ViewContainerProps) => {
  const beatOffset = useAtomValue(beatOffsetAtom)
  // The floating toolbar is absolutely positioned over this container's top
  // edge, and wraps onto several rows on a phone. Reserve its real height so it
  // never covers the view's own controls (e.g. the Chart part picker).
  const toolbarHeight = useAtomValue(toolbarHeightAtom)

  const isPlaying = useAtomValue(currentlyPlayingAtom);
  const enabled = useAtomValue(lightScreenAtom)
  const containerRef = useRef<HTMLDivElement>(null);

  const currentBeat = useAtomValue(currentBeatAtom)

  useEffect(() => {
    if (!isPlaying || !enabled) return;
    const el = containerRef.current;
    if (!el) return;

    setTimeout(() => {
      el.classList.remove("beat-flash");
      void el.offsetWidth;
      el.classList.add("beat-flash");
    }, beatOffset);
  }, [currentBeat]);

  return (
    <div
      ref={containerRef}
      className="flex flex-col items-center justify-center w-full h-full min-h-0 text-center px-10 pb-10"
      style={{ paddingTop: Math.max(BASE_PADDING, toolbarHeight) }}
    >
      {children}
    </div>
  );
};