// Suggested location: src/components/Views/ChartView/ChordViewer.tsx
//
// Drop-in alternative to SheetViewer: same props (content / activeMeasure /
// zoom / extraMarkers), so ChartView can swap between the two without any
// other changes. OSMD itself has no "chords only" render mode — this is a
// small custom lead-sheet grid built from the chord symbols already present
// in the MusicXML (see extract-chords.ts), not from note analysis.

import { useEffect, useMemo, useRef } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { parseChordsFromMusicXml, type MeasureChords } from '@/utils/extract-chords';

interface SectionMarker {
  /** 1-indexed measure number */
  measure: number;
  label: string;
}

interface Props {
  content: string;
  /** 0-indexed, matches OSMD's MeasureList indexing (same convention as SheetViewer) */
  activeMeasure?: number;
  zoom?: number;
  extraMarkers?: SectionMarker[];
}

export function ChordViewer({ content, activeMeasure, zoom = 1.0, extraMarkers = [] }: Props) {
  const measures = useMemo<MeasureChords[]>(
    () => (content ? parseChordsFromMusicXml(content) : []),
    [content],
  );

  const markerByMeasureIndex = useMemo(() => {
    const map = new Map<number, string>();
    extraMarkers.forEach((m) => map.set(m.measure - 1, m.label));
    return map;
  }, [extraMarkers]);

  // Keep the active measure in view as the song plays, without re-rendering the grid.
  const cellRefs = useRef<(HTMLDivElement | null)[]>([]);
  useEffect(() => {
    if (activeMeasure == null) return;
    cellRefs.current[activeMeasure]?.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'center',
    });
  }, [activeMeasure]);

  if (!content) return null;

  const hasChords = measures.some((m) => m.chords.length > 0);
  if (!hasChords) {
    return (
      <div className="w-full h-full bg-white flex items-center justify-center">
        <p className="text-gray-500">No chord symbols found in this chart.</p>
      </div>
    );
  }

  const cellSize = 110 * zoom;
  const rootSize = 1.5 * zoom;
  const qualitySize = 0.85 * zoom;

  return (
    <ScrollArea className="w-full h-full bg-white">
      <div
        className="grid gap-2 p-4"
        style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${cellSize}px, 1fr))` }}
      >
        {measures.map((m) => {
          const isActive = m.measureIndex === activeMeasure;
          const marker = markerByMeasureIndex.get(m.measureIndex);

          return (
            <div
              key={m.measureIndex}
              // Every 4th measure gets a little breathing room, mirroring how
              // lead sheets are conventionally grouped into 4-bar phrases.
              className={cn('flex flex-col', m.measureIndex > 0 && m.measureIndex % 4 === 0 && 'ml-3')}
            >
              <div className="mb-1 h-4">
                {marker && (
                  <span className="inline-flex items-center rounded-sm border border-neutral-400 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-neutral-600">
                    {marker}
                  </span>
                )}
              </div>

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