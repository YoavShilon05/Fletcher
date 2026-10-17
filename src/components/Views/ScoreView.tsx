// Shared scaffolding for the two score views (Chart and Chords). Both resolve
// the same baked chart, read the same zoom/follow toolbar state, track the same
// playing measure, and need the same bounded-scroll layout — only what they draw
// inside differs.

import type { ReactNode } from "react";

/** Full-bleed placeholder for the loading / missing / error states. */
export function Centered({ children }: { children: ReactNode }) {
  return (
    <div className="w-full h-full bg-white flex items-center justify-center">
      <p className="text-gray-500">{children}</p>
    </div>
  );
}

interface ScoreSurfaceProps {
  /** Optional bar above the scroll area (e.g. the Chart part picker). */
  header?: ReactNode;
  /** The scrolling content; it is pinned to the surface, never sizes it. */
  children: ReactNode;
}

/**
 * Bounded page for a score view.
 *
 * `min-h-0` / `overflow-hidden` stop the (arbitrarily tall) score from growing
 * this box, and the absolute inner wrapper pins the scroll container to the
 * remaining slot — so content scrolls *inside* the view instead of stretching
 * the whole app page.
 */
export function ScoreSurface({ header, children }: ScoreSurfaceProps) {
  return (
    <div className="w-full h-full min-w-0 min-h-0 bg-white flex flex-col overflow-hidden">
      {header}
      <div className="relative flex-1 min-h-0 min-w-0">
        <div className="absolute inset-0">{children}</div>
      </div>
    </div>
  );
}
