import { describe, expect, it } from "vitest";
import type { PlaybackAnchor } from "@/lib/osc/addresses";
import { beatAfter } from "./useBeatClock";

const anchor = (overrides: Partial<PlaybackAnchor> = {}): PlaybackAnchor => ({
  startTimeMs: 0,
  startBeat: 0,
  tempo: 120,
  ...overrides,
});

/** A switch from 120 to 60 BPM at beat 8, drawn as two adjacent points. */
const SWITCH = [
  { time: -63072000, tempo: 120 },
  { time: 7.99, tempo: 120 },
  { time: 8, tempo: 60 },
];

describe("beatAfter", () => {
  it("extrapolates at the anchor's tempo when nothing is automated", () => {
    // 120 BPM: 2 beats per second.
    expect(beatAfter([], anchor(), 4000)).toEqual({ beat: 8, tempo: 120 });
  });

  it("counts from the anchor's beat, not from zero", () => {
    expect(beatAfter([], anchor({ startBeat: 100 }), 1000).beat).toBe(102);
  });

  it("ignores breakpoints the playhead has already passed", () => {
    const changes = [{ time: 4, tempo: 60 }];
    expect(beatAfter(changes, anchor({ startBeat: 100 }), 1000)).toEqual({
      beat: 102,
      tempo: 120,
    });
  });

  it("slows down after a breakpoint", () => {
    // 8 beats at 120 take 4s; the next 2s then cover 2 beats at 60.
    expect(beatAfter(SWITCH, anchor(), 6000)).toEqual({ beat: 10, tempo: 60 });
  });

  it("is still on the old tempo a moment before the switch", () => {
    const { beat, tempo } = beatAfter(SWITCH, anchor(), 3000);
    expect(beat).toBeCloseTo(6);
    expect(tempo).toBe(120);
  });

  it("crosses several breakpoints in one step", () => {
    const changes = [
      { time: 4, tempo: 60 }, // 4 beats at 120 = 2s
      { time: 8, tempo: 240 }, // 4 beats at 60 = 4s
    ];
    // 2s + 4s to reach beat 8, then 1s at 240 covers 4 more beats.
    expect(beatAfter(changes, anchor(), 7000)).toEqual({ beat: 12, tempo: 240 });
  });

  it("stays monotonic when the clock offset puts us before the anchor", () => {
    expect(beatAfter(SWITCH, anchor({ startBeat: 10 }), -500).beat).toBe(9);
  });
});
