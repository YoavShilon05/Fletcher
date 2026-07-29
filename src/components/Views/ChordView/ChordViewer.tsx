// A small custom lead-sheet grid built from the chord symbols present in the
// MusicXML (see extract-chords.ts), not from note analysis. Same props as
// SheetViewer (content / activeMeasure / zoom).

import { useMemo, useRef } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Centered } from '@/components/Views/ScoreView.tsx';
import { useFollowScroll } from '@/hooks/useFollowScroll.ts';
import { parseChordsFromMusicXml, type MeasureChords } from '@/utils/extract-chords';

interface Props {
  content: string;
  /** 0-indexed, matches OSMD's MeasureList indexing (same convention as SheetViewer) */
  activeMeasure?: number;
  zoom?: number;
  /** When true, auto-scroll to keep the active measure's row in view. */
  follow?: boolean;
}

export function ChordViewer({ content, activeMeasure, zoom = 1.0, follow = true }: Props) {
  const measures = useMemo<MeasureChords[]>(
    () => (content ? parseChordsFromMusicXml(content) : []),
    [content],
  );

  // Keep the active measure in view as the song plays, without re-rendering the
  // grid. Anchor its row near the top (read-ahead) rather than nudging it just
  // barely on-screen; cells sharing a grid row share a top, so stepping across a
  // row doesn't scroll.
  const viewportRef = useRef<HTMLDivElement>(null);
  const cellRefs = useRef<(HTMLDivElement | null)[]>([]);
  useFollowScroll(viewportRef, follow, [activeMeasure], () => {
    const viewport = viewportRef.current;
    const cell = activeMeasure == null ? null : cellRefs.current[activeMeasure];
    if (!viewport || !cell) return null;

    // The grid never scrolls sideways (cells reflow), so only Y is needed.
    return {
      y: cell.getBoundingClientRect().top - viewport.getBoundingClientRect().top + viewport.scrollTop,
    };
  });

  if (!content) return null;

  const hasChords = measures.some((m) => m.chords.length > 0);
  if (!hasChords) return <Centered>No chord symbols found in this chart.</Centered>;

  const cellSize = 110 * zoom;
  const rootSize = 1.5 * zoom;
  const qualitySize = 0.85 * zoom;

  return (
    <ScrollArea className="w-full h-full bg-white" viewportRef={viewportRef}>
      <div
        className="grid gap-2 p-4"
        style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${cellSize}px, 1fr))` }}
      >
        {measures.map((m) => {
          const isActive = m.measureIndex === activeMeasure;

          return (
            <div
              key={m.measureIndex}
              // Every 4th measure gets a little breathing room, mirroring how
              // lead sheets are conventionally grouped into 4-bar phrases.
              className={cn('flex flex-col', m.measureIndex > 0 && m.measureIndex % 4 === 0 && 'ml-3')}
            >
              <div
                ref={(el) => { cellRefs.current[m.measureIndex] = el; }}
                className={cn(
                  'relative flex items-center justify-center gap-3 rounded-sm border p-2 transition-colors duration-300',
                  isActive ? 'border-yellow-400 bg-yellow-400/25' : 'border-neutral-200',
                )}
                style={{ minHeight: cellSize * 0.65 }}
              >
                <span className="absolute left-1.5 top-1 text-[10px] leading-none text-neutral-400">
                  {m.measureNumber}
                </span>

                {m.chords.length === 0 && <span className="text-neutral-300">·</span>}

                {m.chords.map((c, i) => (
                  <span key={i} className="inline-flex items-baseline font-semibold leading-none">
                    <span className={"text-neutral-600"} style={{ fontSize: `${rootSize}rem` }}>{c.root}</span>
                    {!c.isNoChord && c.quality && (
                      <span className="text-neutral-600" style={{ fontSize: `${qualitySize}rem` }}>
                        {c.quality}
                      </span>
                    )}
                    {c.bass && (
                      <span className="text-neutral-600" style={{ fontSize: `${qualitySize}rem` }}>
                        /{c.bass}
                      </span>
                    )}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}