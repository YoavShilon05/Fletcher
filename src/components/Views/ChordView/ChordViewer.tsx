// A small custom lead-sheet grid built from the chord symbols present in the
// MusicXML (see extract-chords.ts), not from note analysis.

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
  /** Toolbar zoom. Sets how many bars share a row — not a pixel size. */
  zoom?: number;
  /** When true, auto-scroll to keep the active measure's row in view. */
  follow?: boolean;
}

// Bars per row at zoom 1 — the conventional lead-sheet phrase length.
//
// The row is divided into equal fractions of whatever width is available rather
// than laid out at a fixed cell size, so the chart reads the same on a phone and
// on a laptop: same bars per line, same relative proportions. A fixed size did
// the opposite — 187px cells left a phone showing one chord per row. Zoom (which
// is persisted per device) is what changes the density now, so each musician
// picks the one that suits their screen once.
const BASE_COLUMNS = 4;
const MIN_COLUMNS = 1;
const MAX_COLUMNS = 16;

// Bar shape, as width : height. Wider than tall, like a bar of music.
const CELL_ASPECT = '8 / 5';

/**
 * Type is sized in `cqw` — a percentage of the bar's own width — so it tracks
 * the cell on any screen without measuring anything. The rem bounds stop it
 * going illegibly small on a dense phone layout or absurdly large on a wide
 * desktop; between them every bar's type is identical.
 */
function fontSize(cqw: number, minRem: number, maxRem: number, fit: number) {
  return `clamp(${minRem}rem, ${(cqw * fit).toFixed(2)}cqw, ${(maxRem * fit).toFixed(2)}rem)`;
}

function columnsFor(zoom: number) {
  return Math.min(MAX_COLUMNS, Math.max(MIN_COLUMNS, Math.round(BASE_COLUMNS / zoom)));
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

  const columns = columnsFor(zoom);

  return (
    <ScrollArea className="w-full h-full bg-white" viewportRef={viewportRef}>
      <div
        className="grid gap-2 p-2 sm:p-4"
        // minmax(0, 1fr) rather than 1fr: a long chord name must not be allowed
        // to widen its own column and throw the bars out of step.
        style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
      >
        {measures.map((m) => {
          const isActive = m.measureIndex === activeMeasure;
          // Chords in a bar share its width, so shrink the type as they multiply
          // — gently, since two chords rarely need half the room each.
          const fit = 1 / Math.sqrt(Math.max(1, m.chords.length));

          return (
            <div
              key={m.measureIndex}
              ref={(el) => { cellRefs.current[m.measureIndex] = el; }}
              className={cn(
                'relative overflow-hidden rounded-sm border transition-colors duration-300',
                isActive ? 'border-yellow-400 bg-yellow-400/25' : 'border-neutral-200',
              )}
              style={{ aspectRatio: CELL_ASPECT, containerType: 'inline-size' }}
            >
              <span
                className="absolute left-[3cqw] top-[2cqw] leading-none text-neutral-400"
                style={{ fontSize: fontSize(5, 0.375, 0.75, 1) }}
              >
                {m.measureNumber}
              </span>

              {/* The chords sit in a child of the cell, not the cell itself: a
                  cqw length resolves against the nearest *ancestor* container,
                  so spacing set on the container box wouldn't track the bar. */}
              <div className="flex h-full w-full items-center justify-center gap-[4cqw]">
                {m.chords.length === 0 && (
                  <span className="text-neutral-300" style={{ fontSize: fontSize(22, 0.5, 3, 1) }}>
                    ·
                  </span>
                )}

                {m.chords.map((c, i) => (
                  <span key={i} className="inline-flex items-baseline font-semibold leading-none text-neutral-600">
                    <span style={{ fontSize: fontSize(22, 0.5, 3, fit) }}>{c.root}</span>
                    {!c.isNoChord && c.quality && (
                      <span style={{ fontSize: fontSize(13, 0.4, 1.75, fit) }}>{c.quality}</span>
                    )}
                    {c.bass && (
                      <span style={{ fontSize: fontSize(13, 0.4, 1.75, fit) }}>/{c.bass}</span>
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
