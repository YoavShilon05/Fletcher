// @vitest-environment happy-dom
import { createStore, Provider } from "jotai";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PLAYBACK_LOOKAHEAD_MS } from "@/constants";
import { playbackAnchorAtom } from "./atoms";
import { usePlayheadSteps } from "./useBeatClock";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/** 120 BPM from beat 0: a beat every 500ms, an eighth every 250ms. */
const ANCHOR = { startTimeMs: 0, startBeat: 0, tempo: 120 };

async function mount(subdivision: number) {
  const steps: number[] = [];
  const Harness = () => {
    usePlayheadSteps(subdivision, (beat) => steps.push(beat));
    return null;
  };

  const store = createStore();
  store.set(playbackAnchorAtom, ANCHOR);
  // The clock starts from the anchor plus the lookahead, so wind the clock back
  // by it to have the first step land on beat 0.
  vi.setSystemTime(-PLAYBACK_LOOKAHEAD_MS);

  await act(async () =>
    createRoot(document.createElement("div")).render(
      <Provider store={store}>
        <Harness />
      </Provider>,
    ),
  );
  return steps;
}

const advance = (ms: number) => act(async () => vi.advanceTimersByTime(ms));

describe("usePlayheadSteps", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("steps once per quarter note at subdivision 1", async () => {
    const steps = await mount(1);
    expect(steps).toEqual([0]);
    await advance(1000);
    expect(steps).toEqual([0, 1, 2]);
  });

  it("steps on every eighth at subdivision 2", async () => {
    const steps = await mount(2);
    await advance(1000);
    expect(steps).toEqual([0, 0.5, 1, 1.5, 2]);
  });

  it("steps on every sixteenth at subdivision 4", async () => {
    const steps = await mount(4);
    await advance(500);
    expect(steps).toEqual([0, 0.25, 0.5, 0.75, 1]);
  });

  it("reports each step once, however often it is polled", async () => {
    const steps = await mount(2);
    for (let i = 0; i < 20; i++) await advance(25);
    expect(steps).toEqual([0, 0.5, 1]);
  });
});
