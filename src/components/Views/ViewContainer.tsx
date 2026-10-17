import { useAtomValue } from "jotai";
import type { ReactNode } from "react";
import { currentBeatAtom, isPlayingAtom } from "@/features/live/atoms";
import { lightScreenAtom, toolbarHeightAtom } from "@/features/view/atoms";
import "./ViewContainer.css";

// Fallback top padding for the frame before the toolbar has been measured; the
// toolbar is always taller than this, so in practice its height wins. Matches
// the small-screen side padding.
const MIN_TOP_PADDING = 12;

interface ViewContainerProps {
  children: ReactNode;
}

export const ViewContainer = ({ children }: ViewContainerProps) => {
  // The floating toolbar is absolutely positioned over this container's top
  // edge, and wraps onto several rows on a phone. Reserve its real height so it
  // never covers the view's own controls (e.g. the Chart part picker).
  const toolbarHeight = useAtomValue(toolbarHeightAtom);

  const isPlaying = useAtomValue(isPlayingAtom);
  const lightScreen = useAtomValue(lightScreenAtom);
  const currentBeat = useAtomValue(currentBeatAtom);

  return (
    <div
      // `isolate` gives the beat flash its own stacking context, so -z-10 puts
      // it behind the view's content but still inside this frame.
      // A phone has no width to spare — the 40px frame that suits a desktop ate
      // a fifth of the screen, so it only kicks in from sm up.
      className="relative isolate flex flex-col items-center justify-center w-full h-full min-h-0 text-center px-3 pb-3 sm:px-10 sm:pb-10"
      style={{ paddingTop: Math.max(MIN_TOP_PADDING, toolbarHeight) }}
    >
      {isPlaying && lightScreen && (
        // Keyed by beat: a fresh element per beat restarts the flash animation.
        <div
          key={currentBeat}
          aria-hidden
          className="beat-flash pointer-events-none absolute inset-0 -z-10"
        />
      )}
      {children}
    </div>
  );
};
