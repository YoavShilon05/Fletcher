import {ReactNode, useEffect, useRef} from "react";
import {useAtomValue} from "jotai";
import {beatOffsetAtom, currentBeatAtom, currentlyPlayingAtom, lightScreenAtom} from "@/stores/store.ts";
import "./ViewContainer.css"

interface ViewContainerProps {
  children: ReactNode
}

export const ViewContainer = ({ children }: ViewContainerProps) => {
  const beatOffset = useAtomValue(beatOffsetAtom)

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
      className="flex flex-col items-center justify-center w-full h-full text-center p-10"
    >
      {children}
    </div>
  );
};