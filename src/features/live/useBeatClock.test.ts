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

  // Live writes an instant switch as two points on the same beat: the outgoing
  // value then the incoming one. Taking the first left the clock a breakpoint
  // behind for the rest of the song.
  describe("instant switches, written as coincident points", () => {
    const INSTANT = [
      { time: -63072000, tempo: 122 },
      { time: 8, tempo: 122 },
      { time: 8, tempo: 244 },
    ];

    it("takes the incoming value, not the outgoing one", () => {
      // 8 beats at 122 take ~3934ms; 1 further beat at 244 takes ~246ms.
      const { beat, tempo } = beatAfter(INSTANT, anchor({ tempo: 122 }), 3934.4 + 245.9);
      expect(beat).toBeCloseTo(9, 3);
      expect(tempo).toBe(244);
    });

    it("adopts a step the anchor lands exactly on", () => {
      expect(beatAfter(INSTANT, anchor({ startBeat: 8, tempo: 244 }), 0)).toEqual({
        beat: 8,
        tempo: 244,
      });
    });

    it("walks the real set's envelope", () => {
      // Straight out of 26.10.26.als: 122, then steps at 1004.25 / 1166 / 1198.
      const real = [
        { time: -63072000, tempo: 122 },
        { time: 1004.25, tempo: 122 },
        { time: 1004.25, tempo: 154 },
        { time: 1166, tempo: 154 },
        { time: 1166, tempo: 77 },
        { time: 1198, tempo: 77 },
        { time: 1198, tempo: 154 },
      ];
      const from = anchor({ startBeat: 1000, tempo: 122 });
      const ms = (beats: number, bpm: number) => (beats * 60_000) / bpm;

      // Start at beat 1000, so each leg is the run up to the next step.
      const toFirst = ms(4.25, 122);
      const toSecond = toFirst + ms(1166 - 1004.25, 154);
      const toThird = toSecond + ms(1198 - 1166, 77);

      expect(beatAfter(real, from, toFirst).beat).toBeCloseTo(1004.25, 6);
      expect(beatAfter(real, from, toFirst).tempo).toBe(154);
      expect(beatAfter(real, from, toSecond).beat).toBeCloseTo(1166, 6);
      expect(beatAfter(real, from, toSecond).tempo).toBe(77);
      expect(beatAfter(real, from, toThird).beat).toBeCloseTo(1198, 6);
      expect(beatAfter(real, from, toThird).tempo).toBe(154);

      // Halfway through the 77 BPM stretch, a quarter of the way in beats.
      const { beat, tempo } = beatAfter(real, from, toSecond + ms(8, 77));
      expect(beat).toBeCloseTo(1174, 6);
      expect(tempo).toBe(77);
    });
  });
});
