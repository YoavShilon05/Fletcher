import { DependencyList, RefObject, useEffect } from 'react';

/** Target box in the scroll container's *content* coordinate space. */
export interface FollowRect {
  y: number;
  h?: number;
  /** Omit when the content never scrolls horizontally (e.g. the chord grid). */
  x?: number;
  w?: number;
}

// Where the active row/system's top sits in the viewport, as a fraction of its
// height. Keeping it high (upper ~third) leaves the rest of the screen showing
// the measures you're about to play, instead of chasing the bottom edge.
const FOLLOW_TOP_FRACTION = 0.28;
// Don't re-scroll for sub-threshold moves — avoids fighting manual scrolling and
// needless smooth-scroll churn while stepping through one system.
const FOLLOW_EPSILON = 4;
// When a zoomed-in measure is off-screen sideways, leave this much of the
// viewport to its left so the bar reads in context rather than hugging the edge.
const FOLLOW_LEFT_FRACTION = 0.25;

/**
 * Keep the playing measure in view inside a scroll viewport, shared by the
 * Chart and Chords views.
 *
 * `resolveTarget` runs inside the effect rather than during render, so callers
 * that can only measure their target from the DOM (the chord grid) and callers
 * that compute it arithmetically (the sheet) can use the same hook. Pass the
 * inputs it reads as `deps`.
 */
export function useFollowScroll(
  viewportRef: RefObject<HTMLElement | null>,
  enabled: boolean,
  deps: DependencyList,
  resolveTarget: () => FollowRect | null,
) {
  useEffect(() => {
    if (!enabled) return;
    const viewport = viewportRef.current;
    if (!viewport) return;

    const target = resolveTarget();
    if (!target) return;

    const targetTop = target.y - viewport.clientHeight * FOLLOW_TOP_FRACTION;
    const maxTop = viewport.scrollHeight - viewport.clientHeight;
    const clampedTop = Math.max(0, Math.min(targetTop, maxTop));

    // Horizontal only matters past fit-to-width (zoomed in). Keep the measure
    // on screen with room to its right so the rest of the bar/system shows.
    const viewLeft = viewport.scrollLeft;
    let targetLeft = viewLeft;
    if (target.x != null) {
      const right = target.x + (target.w ?? 0);
      if (target.x < viewLeft || right > viewLeft + viewport.clientWidth) {
        targetLeft = target.x - viewport.clientWidth * FOLLOW_LEFT_FRACTION;
      }
    }
    const maxLeft = viewport.scrollWidth - viewport.clientWidth;
    const clampedLeft = Math.max(0, Math.min(targetLeft, maxLeft));

    if (
      Math.abs(clampedTop - viewport.scrollTop) > FOLLOW_EPSILON ||
      Math.abs(clampedLeft - viewLeft) > FOLLOW_EPSILON
    ) {
      viewport.scrollTo({ top: clampedTop, left: clampedLeft, behavior: 'smooth' });
    }
  }, [enabled, ...deps]);
}
