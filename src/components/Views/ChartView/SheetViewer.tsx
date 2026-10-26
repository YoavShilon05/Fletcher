import { useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { elementIndexFor } from "@/features/chart/measure-map";
import { useFollowScroll } from "@/features/chart/useFollowScroll";
import type { Positions } from "@/lib/webmscore/types";

interface Props {
  /** Pre-rendered SVG page strings, in page order (from the bake). */
  pages: string[];
  /** Measure bounding boxes for these pages, in SVG viewBox units. */
  positions: Positions;
  /** 0-indexed played measure (timeline order, repeats unrolled) to highlight */
  activeMeasure?: number;
  /** Zoom multiplier on top of fit-to-width. 1 = pages fill the container width. */
  zoom?: number;
  /** When true, auto-scroll to keep the active measure's system in view. */
  follow?: boolean;
}

interface MeasureRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

// Vertical gap between stacked pages, in scaled (screen) px.
const PAGE_GAP = 24;

// Map a played measure's SVG-pixel box to a screen-pixel rect, accounting for
// the page it sits on and the display scale. The box may be a repeated
// measure's or a multimeasure rest's — see features/chart/measure-map.ts.
function measureRectFor(
  positions: Positions,
  measureIndex: number,
  scale: number,
): MeasureRect | null {
  const el = positions.elements[elementIndexFor(positions, measureIndex)];
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

// MuseScore (and webmscore) number each page's SVG defs — clipPath ids used to
// break TAB staff lines around fret numbers — starting fresh from 1. Pages are
// independent files on disk, but Fletcher inlines several at once into one DOM
// via dangerouslySetInnerHTML, where ids are document-global: page 2's "id=1"
// collides with page 1's, so every `url(#1)` resolves to whichever element won
// the collision — usually the wrong page's clip geometry, which doesn't
// overlap the line it's supposed to unmask, so the line vanishes entirely
// (numbers are unaffected since they don't reference these ids). Rewriting
// every id and every url(#id)/href="#id" with a page-unique prefix before
// mounting keeps each page's defs scoped to itself.
export function namespaceSvgIds(svg: string, prefix: string): string {
  return svg
    .replace(/\bid="(\d+)"/g, `id="${prefix}-$1"`)
    .replace(/url\(#(\d+)\)/g, `url(#${prefix}-$1)`)
    .replace(/href="#(\d+)"/g, `href="#${prefix}-$1"`);
}

export function SheetViewer({ pages, positions, activeMeasure, zoom = 1, follow = true }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const instanceId = useId();

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

  // Each SVG fills its scaled page box through its own viewBox (MuseScore and
  // webmscore both emit one), so pages are drawn at display size — never as a
  // full-resolution layer shrunk by a transform.
  const pageNodes = useMemo(
    () =>
      pages.map((svg, i) => (
        <div
          key={i}
          className="[&>svg]:block [&>svg]:h-full [&>svg]:w-full"
          style={{
            width: scaledPageWidth,
            height: scaledPageHeight,
            marginBottom: i < pages.length - 1 ? PAGE_GAP : 0,
            overflow: "hidden",
          }}
          dangerouslySetInnerHTML={{ __html: namespaceSvgIds(svg, `${instanceId}-${i}`) }}
        />
      )),
    [pages, scaledPageWidth, scaledPageHeight, instanceId],
  );

  const highlightRect =
    activeMeasure != null ? measureRectFor(positions, activeMeasure, scale) : null;

  // Follow the playing measure: scroll so its *system* sits near the top of the
  // viewport, revealing the upcoming systems below (read-ahead, never blind).
  // The vertical target is derived from the row's Y, so stepping through
  // measures within the same system doesn't move it — no jitter, and same-row
  // jumps (common when zoomed in or on a narrow phone) don't trigger a scroll.
  useFollowScroll(
    scrollRef,
    follow,
    highlightRect ? `${highlightRect.x},${highlightRect.y},${highlightRect.w}` : undefined,
    () => highlightRect,
  );

  return (
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
              backgroundColor: "var(--chart-highlight-fill)",
              outline: "2px solid var(--chart-highlight-outline)",
              boxShadow: "0 0 14px var(--chart-highlight-glow)",
            }}
          />
        )}
      </div>
    </ScrollArea>
  );
}
