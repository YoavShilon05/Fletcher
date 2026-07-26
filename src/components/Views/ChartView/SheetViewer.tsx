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
  /** When true, auto-scroll to keep the active measure's system in view. */
  follow?: boolean;
}

// Where the active system's top sits in the viewport, as a fraction of its
// height. Keeping it high (upper ~third) leaves the rest of the screen showing
// the measures you're about to play, instead of chasing the bottom edge.
const FOLLOW_TOP_FRACTION = 0.28;
// Don't re-scroll for sub-threshold moves — avoids fighting manual scrolling and
// needless smooth-scroll churn while stepping through one system.
const FOLLOW_EPSILON = 4;

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

export function SheetViewer({ pages, positions, activeMeasure, zoom = 1, follow = true }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);

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

  // Follow the playing measure: scroll so its *system* sits near the top of the
  // viewport, revealing the upcoming systems below (read-ahead, never blind).
  // The vertical target is derived from the row's Y, so stepping through
  // measures within the same system doesn't move it — no jitter, and same-row
  // jumps (common when zoomed in or on a narrow phone) don't trigger a scroll.
  useEffect(() => {
    if (!follow || !highlightRect) return;
    const viewport = scrollRef.current;
    if (!viewport) return;

    const targetTop = highlightRect.y - viewport.clientHeight * FOLLOW_TOP_FRACTION;
    const maxTop = viewport.scrollHeight - viewport.clientHeight;
    const clampedTop = Math.max(0, Math.min(targetTop, maxTop));

    // Horizontal only matters past fit-to-width (zoomed in). Keep the measure
    // on screen with room to its right so the rest of the bar/system shows.
    const viewLeft = viewport.scrollLeft;
    let targetLeft = viewLeft;
    if (highlightRect.x < viewLeft || highlightRect.x + highlightRect.w > viewLeft + viewport.clientWidth) {
      targetLeft = highlightRect.x - viewport.clientWidth * 0.25;
    }
    const maxLeft = viewport.scrollWidth - viewport.clientWidth;
    const clampedLeft = Math.max(0, Math.min(targetLeft, maxLeft));

    if (
      Math.abs(clampedTop - viewport.scrollTop) > FOLLOW_EPSILON ||
      Math.abs(clampedLeft - viewLeft) > FOLLOW_EPSILON
    ) {
      viewport.scrollTo({ top: clampedTop, left: clampedLeft, behavior: 'smooth' });
    }
    // Re-evaluate when the measure or the layout scale changes.
  }, [follow, highlightRect?.x, highlightRect?.y, highlightRect?.w]);

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
