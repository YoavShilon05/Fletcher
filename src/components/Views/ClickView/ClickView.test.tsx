// @vitest-environment happy-dom
import { createStore, Provider } from "jotai";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it } from "vitest";
import { currentBeatAtom, globalTimeSignatureAtom, isPlayingAtom } from "@/features/live/atoms";
import type { TimeSignature } from "@/types/time-signature";
import { ClickView } from "./ClickView";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * No locators, so there's no setlist and no song — the circles then count
 * pulses from the start of the timeline, which makes `beat` the whole input.
 * Set before mounting: the pulse clock takes its starting beat on mount, and
 * without a playback anchor nothing moves it afterwards.
 */
async function render(timeSignature: TimeSignature, beat: number) {
  const store = createStore();
  store.set(globalTimeSignatureAtom, timeSignature);
  store.set(currentBeatAtom, beat);
  store.set(isPlayingAtom, true);

  const container = document.createElement("div");
  await act(async () =>
    createRoot(container).render(
      <Provider store={store}>
        <ClickView />
      </Provider>,
    ),
  );

  const circles = [...container.querySelectorAll("div.rounded-full")];
  const groups = [...new Set(circles.map((circle) => circle.parentElement))];
  return {
    /** Circles per quarter-note beat, in bar order. */
    shape: groups.map((group) => group?.childElementCount),
    /** Index of the lit circle among all of the bar's, i.e. its pulse. */
    lit: circles.findIndex((circle) => circle.className.includes("bg-primary")),
  };
}

describe("ClickView", () => {
  it("draws one circle per beat in 4/4", async () => {
    expect(await render({ numerator: 4, denominator: 4 }, 2)).toEqual({
      shape: [1, 1, 1, 1],
      lit: 2,
    });
  });

  it("hangs an eighth off each of 12/8's six beats", async () => {
    const { shape, lit } = await render({ numerator: 12, denominator: 8 }, 2);
    expect(shape).toEqual([2, 2, 2, 2, 2, 2]);
    // Beat 2 of the bar is the fifth eighth — the big circle of the third pair.
    expect(lit).toBe(4);
  });

  it("lights the off-beat eighth between two beats", async () => {
    expect((await render({ numerator: 12, denominator: 8 }, 2.5)).lit).toBe(5);
  });

  it("hangs three sixteenths off each of 12/16's three beats", async () => {
    const { shape, lit } = await render({ numerator: 12, denominator: 16 }, 1.75);
    expect(shape).toEqual([4, 4, 4]);
    expect(lit).toBe(7);
  });

  it("ends an odd bar on a short beat", async () => {
    expect((await render({ numerator: 7, denominator: 8 }, 0)).shape).toEqual([2, 2, 2, 1]);
  });
});
