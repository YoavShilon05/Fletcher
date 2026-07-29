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

// Fallback top padding for the frame before the toolbar has been measured; the
// toolbar is always taller than this, so in practice its height wins. Matches
// the small-screen side padding.
const MIN_TOP_PADDING = 12

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
      // A phone has no width to spare — the 40px frame that suits a desktop ate
      // a fifth of the screen, so it only kicks in from sm up.
      className="flex flex-col items-center justify-center w-full h-full min-h-0 text-center px-3 pb-3 sm:px-10 sm:pb-10"
      style={{ paddingTop: Math.max(MIN_TOP_PADDING, toolbarHeight) }}
    >
      {children}
    </div>
  );
};