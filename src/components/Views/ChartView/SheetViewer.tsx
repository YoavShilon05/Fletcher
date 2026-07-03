import { useEffect, useRef, useState } from 'react';
import { OpenSheetMusicDisplay, unitInPixels } from 'opensheetmusicdisplay';
import { ScrollArea } from '@/components/ui/scroll-area';

interface SectionMarker {
  /** 1-indexed measure number */
  measure: number;
  label: string;
}

interface Props {
  content: Blob | string;
  /** 0-indexed */
  activeMeasure?: number;
  zoom?: number;
  extraMarkers?: SectionMarker[];
}

interface MeasureRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface MarkerRect {
  rect: MeasureRect;
  label: string;
}

function getMeasureRect(
  osmd: OpenSheetMusicDisplay,
  measureIndex: number,
): MeasureRect | null {
  const measureList = osmd.GraphicSheet?.MeasureList;
  if (!measureList?.length) return null;

  const scale = unitInPixels * osmd.zoom;
  const staffEntries = measureList[measureIndex];
  if (!staffEntries?.length) return null;

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  let found = false;

  for (const gm of staffEntries) {
    if (!gm) continue;

    const bb = gm.PositionAndShape;
    const x = bb.AbsolutePosition.x * scale;
    const y = bb.AbsolutePosition.y * scale;
    const w = bb.Size.width * scale;

    // Size.height comes from borderTop/borderBottom which OSMD resets to 0
    // during layout passes triggered by autoResize. Use the VexFlow stave's
    // own height instead — it's set directly by VexFlow and never zeroed.
    // getVFStave() is declared public on VexFlowMeasure.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const stave = (gm as any).getVFStave?.() ?? (gm as any).stave;
    // stave.height is the inter-line span in px; stave.options.num_lines
    // and space_above_staff_ln give the full rendered extent. The simplest
    // correct value is stave.getBottomY() - stave.getTopLineTopY() but a
    // safe fallback is just using the OSMD height when stave is unavailable.
    let h = bb.Size.height * scale;
    if (stave) {
      const top = stave.getTopLineTopY?.() ?? stave.getYForLine?.(0) ?? stave.y;
      const bot = stave.getBottomY?.() ?? (stave.y + stave.height);
      const staveH = (bot - top) * osmd.zoom;
      if (staveH > 0) h = staveH;
    }

    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x + w);
    maxY = Math.max(maxY, y + h);
    found = true;
  }

  if (!found) return null;
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

// Section-marker label size, in constant screen px (deliberately not
// zoom-scaled — a fixed-size annotation reads better at any zoom level
// than one that grows with the staff).
const MARKER_HEIGHT = 20;
const MARKER_GAP = 4;

export function SheetViewer({
                              content,
                              activeMeasure,
                              zoom = 1.0,
                              extraMarkers = [],
                            }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  // Store the OSMD instance in a ref, never in state — state triggers re-renders
  const osmdRef = useRef<OpenSheetMusicDisplay | null>(null);
  // Ref on the highlight box itself, so we can ask the browser to scroll it
  // into view without re-implementing viewport math by hand.
  const highlightRef = useRef<HTMLDivElement>(null);

  const [highlightRect, setHighlightRect] = useState<MeasureRect | null>(null);
  const [markerRects, setMarkerRects] = useState<MarkerRect[]>([]);

  /** Call after every render (content/zoom load, or activeMeasure change) to refresh overlay positions. */
  const updateOverlays = () => {
    const osmd = osmdRef.current;
    if (!osmd) {
      setHighlightRect(null);
      setMarkerRects([]);
      return;
    }

    setHighlightRect(activeMeasure != null ? getMeasureRect(osmd, activeMeasure) : null);

    const markers: MarkerRect[] = [];
    for (const marker of extraMarkers) {
      const rect = getMeasureRect(osmd, marker.measure - 1); // markers are 1-indexed
      if (rect) markers.push({ rect, label: marker.label });
    }
    setMarkerRects(markers);
  };

  // ── 1. Create OSMD instance exactly once ─────────────────────────────────
  useEffect(() => {

    if (!containerRef.current) return;

    osmdRef.current = new OpenSheetMusicDisplay(containerRef.current, {
      backend: 'svg',
      drawTitle: false,
      drawComposer: false,
      drawingParameters: 'compacttight',
      // We re-layout explicitly via our own render() calls below. Leaving
      // this on lets OSMD re-render itself behind our back on container
      // resize, which would silently desync our overlay positions.
      autoResize: false,
    });

    return () => {
      osmdRef.current = null;
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, []);

  // ── 2. Load + render whenever content changes ─────────────────────────────
  useEffect(() => {
    const osmd = osmdRef.current;
    if (!osmd || !content) return;

    osmd
      .load(content)
      .then(() => {
        osmd.zoom = zoom;
        osmd.render();
        updateOverlays();
      })
      .catch((err) => {
        console.error('OSMD load error:', err);
      });
  }, [content]); // eslint-disable-line

  // ── 3. Re-render on zoom change (after initial load) ─────────────────────
  useEffect(() => {
    const osmd = osmdRef.current;
    if (!osmd) return;
    osmd.zoom = zoom;
    osmd.render();
    updateOverlays();
  }, [zoom]); // eslint-disable-line

  // ── 4. Reposition highlight when activeMeasure changes (no re-render) ─────
  useEffect(() => {
    updateOverlays();
  }, [activeMeasure]); // eslint-disable-line

  // ── 5. Auto-scroll the active measure into view — only when it's actually
  //       outside the visible area, thanks to scrollIntoView's block:'nearest'.
  useEffect(() => {
    if (highlightRect && highlightRef.current) {
      highlightRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'nearest',
      });
    }
  }, [highlightRect]);

  return (
    <ScrollArea className="h-full w-full">
      {/* Explicit block container — flex parents will try to shrink this. */}
      <div className="relative w-full block">
        {/* OSMD mounts here. Avoid any padding/margin that would shift the
            SVG relative to this div — it breaks the coordinate math. */}
        <div ref={containerRef} className="w-full"/>

        {highlightRect && (
          <div
            ref={highlightRef}
            className="pointer-events-none absolute rounded-sm transition-all duration-200 ease-out"
            style={{
              left: highlightRect.x,
              top: highlightRect.y,
              width: highlightRect.w,
              height: highlightRect.h,
              backgroundColor: 'rgba(250, 204, 21, 0.25)', // yellow-400/25
              outline: '2px solid rgba(250, 204, 21, 0.7)',
              boxShadow: '0 0 14px rgba(250, 204, 21, 0.35)',
            }}
          />
        )}

        {markerRects.map(({ rect, label }, i) => (
          <span
            key={i}
            className="pointer-events-none absolute inline-flex items-center whitespace-nowrap rounded-sm border border-neutral-400 bg-white px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-neutral-600 transition-all duration-200 ease-out"
            style={{
              left: rect.x,
              top: rect.y - MARKER_HEIGHT - MARKER_GAP,
            }}
          >
            {label}
          </span>
        ))}
      </div>
    </ScrollArea>
  );
}