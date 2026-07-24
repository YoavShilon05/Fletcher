import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { Positions } from '@/lib/webmscore/types';

interface Props {
  /** Pre-rendered SVG page strings, in page order (from the bake). */
  pages: string[];
  /** Measure bounding boxes for these pages (webmscore measurePositions). */
  positions: Positions;
  /** 0-indexed measure to highlight */
  activeMeasure?: number;
  /** Zoom multiplier on top of fit-to-width. 1 = pages fill the container width. */
  zoom?: number;
}

interface MeasureRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

// Vertical gap between stacked pages, in scaled (screen) px.
const PAGE_GAP = 24;

// Map a measure's SVG-pixel box to a screen-pixel rect, accounting for the page
// it sits on and the display scale. `positions.elements` is indexed by measure.
function measureRectFor(
  positions: Positions,
  measureIndex: number,
  scale: number,
): MeasureRect | null {
  const el = positions.elements[measureIndex];
  if (!el) return null;

  const pageStride = positions.pageSize.height * scale + PAGE_GAP;
  const pageOffsetY = el.page * pageStride;

  return {
    x: el.x * scale,
    y: pageOffsetY + el.y * scale,
    w: el.sx * scale,
    h: el.sy * scale,
  };
}

export function SheetViewer({ pages, positions, activeMeasure, zoom = 1 }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);

  // Width available for the sheet, tracked so pages fit-to-width responsively.
  const [containerWidth, setContainerWidth] = useState(0);

  useLayoutEffect(() => {
    const node = scrollRef.current;
    if (!node) return;
    const update = () => setContainerWidth(node.clientWidth);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(node);
    return () => ro.disconnect();
  }, []);

  const pageWidth = positions.pageSize.width || 1;
  // fit-to-width, then apply the user zoom. Guard against a 0-width first paint.
  const scale = containerWidth > 0 ? (containerWidth / pageWidth) * zoom : zoom;

  const scaledPageWidth = pageWidth * scale;
  const scaledPageHeight = positions.pageSize.height * scale;

  // Inject each SVG once per `pages` change; scale the whole page with a CSS
  // transform so we don't depend on the SVG carrying a viewBox.
  const pageNodes = useMemo(
    () =>
      pages.map((svg, i) => (
        <div
          key={i}
          style={{
            width: scaledPageWidth,
            height: scaledPageHeight,
            marginBottom: i < pages.length - 1 ? PAGE_GAP : 0,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: pageWidth,
              height: positions.pageSize.height,
              transform: `scale(${scale})`,
              transformOrigin: '0 0',
            }}
            dangerouslySetInnerHTML={{ __html: svg }}
          />
        </div>
      )),
    // Rebuild when the SVGs or the scale change.
    [pages, scale, scaledPageWidth, scaledPageHeight, pageWidth, positions.pageSize.height],
  );

  const highlightRect =
    activeMeasure != null ? measureRectFor(positions, activeMeasure, scale) : null;

  // Auto-scroll the active measure into view only when it's off-screen.
  useEffect(() => {
    if (highlightRect && highlightRef.current) {
      highlightRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
    }
    // Depend on the measure/position, not the object identity.
  }, [highlightRect?.x, highlightRect?.y]);

  return (
    // The absolute wrapper pins the scroll box to the parent slot's size, so wide/
    // tall sheet content scrolls *inside* here instead of stretching the page. The
    // parent (ChartView) must be `relative` with a bounded height.
    <div className="absolute inset-0">
      <ScrollArea className="h-full w-full" viewportRef={scrollRef}>
        <div className="relative block" style={{ width: scaledPageWidth }}>
          {pageNodes}

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
        </div>
      </ScrollArea>
    </div>
  );
}
