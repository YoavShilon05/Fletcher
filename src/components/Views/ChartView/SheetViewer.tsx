import { useEffect, useRef, useState } from 'react';
import {OpenSheetMusicDisplay, unitInPixels} from 'opensheetmusicdisplay';

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

export function SheetViewer({
                              content,
                              activeMeasure,
                              zoom = 1.0,
                              extraMarkers = [],
                            }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  // Store the OSMD instance in a ref, never in state — state triggers re-renders
  const osmdRef = useRef<OpenSheetMusicDisplay | null>(null);
  const [highlightRect, setHighlightRect] = useState<MeasureRect | null>(null);

  /** Call after every render to refresh the highlight position. */
  const updateHighlight = () => {
    const osmd = osmdRef.current;
    if (!osmd || activeMeasure == null) {
      setHighlightRect(null);
      return;
    }
    const result = getMeasureRect(osmd, activeMeasure)
    console.log("HIGHLIGHT", result)
    setHighlightRect(result);
  };

  // ── 1. Create OSMD instance exactly once ─────────────────────────────────
  useEffect(() => {

    if (!containerRef.current) return;

    osmdRef.current = new OpenSheetMusicDisplay(containerRef.current, {
      backend: 'svg',
      drawTitle: false,
      drawComposer: false,
      drawingParameters: 'compacttight',
      // autoResize causes a second render on mount — disable it.
      autoResize: true,
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
      })
      .catch((err) => {
        console.error('OSMD load error:', err);
      });
  }, [content]);

  // ── 3. Re-render on zoom change (after initial load) ─────────────────────
  useEffect(() => {
    const osmd = osmdRef.current;
    if (!osmd) return;
    osmd.zoom = zoom;
    osmd.render();
  }, [zoom]); // eslint-disable-line

  // ── 4. Reposition highlight when activeMeasure changes (no re-render) ─────
  useEffect(() => {
    updateHighlight();
  }, [activeMeasure]); // eslint-disable-line

  return (
    // Explicit block container — flex parents will try to shrink this.
    <div className="relative w-full block">
      {/* OSMD mounts here. Avoid any padding/margin that would shift the
          SVG relative to this div — it breaks the coordinate math. */}
      <div ref={containerRef} className="w-full"/>

      {highlightRect && (
        <div
          className="pointer-events-none absolute rounded-sm"
          style={{
            left: highlightRect.x,
            top: highlightRect.y,
            width: highlightRect.w,
            height: highlightRect.h,
            backgroundColor: 'rgba(250, 204, 21, 0.25)', // yellow-400/25
            outline: '2px solid rgba(250, 204, 21, 0.7)',
          }}
        />
      )}

    </div>
  );
}