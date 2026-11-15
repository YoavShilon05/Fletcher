import { describe, expect, it } from "vitest";
import { ctx, song } from "@/test/fixtures";
import { pulseGroups, pulseInBar, pulsesPerBeat } from "./pulse";

const sig = (numerator: number, denominator: number) => ({ numerator, denominator });

describe("pulsesPerBeat", () => {
  it("counts the signature's notes in a quarter note", () => {
    expect(pulsesPerBeat(sig(4, 4))).toBe(1);
    expect(pulsesPerBeat(sig(12, 8))).toBe(2);
    expect(pulsesPerBeat(sig(12, 16))).toBe(4);
  });

  it("treats a denominator longer than a quarter note as the beat itself", () => {
    expect(pulsesPerBeat(sig(2, 2))).toBe(1);
    expect(pulsesPerBeat(sig(4, 1))).toBe(1);
  });
});

describe("pulseGroups", () => {
  it("gives one circle per beat in x/4", () => {
    expect(pulseGroups(sig(4, 4))).toEqual([[0], [1], [2], [3]]);
  });

  it("pairs eighths into quarter-note beats", () => {
    // 12/8 is six beats, each a quarter note with its off-beat alongside.
    expect(pulseGroups(sig(12, 8))).toEqual([
      [0, 1],
      [2, 3],
      [4, 5],
      [6, 7],
      [8, 9],
      [10, 11],
    ]);
  });

  it("groups sixteenths four to a beat", () => {
    expect(pulseGroups(sig(12, 16))).toEqual([
      [0, 1, 2, 3],
      [4, 5, 6, 7],
      [8, 9, 10, 11],
    ]);
  });

  it("ends on a short group when the bar isn't whole beats", () => {
    expect(pulseGroups(sig(7, 8))).toEqual([[0, 1], [2, 3], [4, 5], [6]]);
    expect(pulseGroups(sig(7, 16))).toEqual([
      [0, 1, 2, 3],
      [4, 5, 6],
    ]);
  });
});

describe("pulseInBar", () => {
  const scenes = (numerator: number, denominator: number) => [
    { name: "Song A", tempo: 120, timeSignature: sig(numerator, denominator) },
  ];

  it("counts quarter-note beats from the chart start in x/4", () => {
    const withStart = song({ start: 104 });
    expect(pulseInBar(ctx(), sig(4, 4), 104, withStart)).toBe(0);
    expect(pulseInBar(ctx(), sig(4, 4), 106, withStart)).toBe(2);
    expect(pulseInBar(ctx(), sig(4, 4), 108, withStart)).toBe(0); // next bar
  });

  it("lands on the off-beat eighth halfway through a beat", () => {
    const sixEight = ctx({ scenes: scenes(6, 8) });
    const withStart = song({ start: 104 });
    // 6/8 is three quarter-note beats: pulses 0 and 1 share the first.
    expect(pulseInBar(sixEight, sig(6, 8), 104, withStart)).toBe(0);
    expect(pulseInBar(sixEight, sig(6, 8), 104.5, withStart)).toBe(1);
    expect(pulseInBar(sixEight, sig(6, 8), 105, withStart)).toBe(2);
    expect(pulseInBar(sixEight, sig(6, 8), 106.5, withStart)).toBe(5);
    expect(pulseInBar(sixEight, sig(6, 8), 107, withStart)).toBe(0); // next bar
  });

  it("walks every sixteenth of a beat", () => {
    const twelveSixteen = ctx({ scenes: scenes(12, 16) });
    const withStart = song({ start: 104 });
    const at = (beat: number) => pulseInBar(twelveSixteen, sig(12, 16), beat, withStart);
    expect([at(104), at(104.25), at(104.5), at(104.75), at(105)]).toEqual([0, 1, 2, 3, 4]);
  });

  it("wraps the count-in back into the bar", () => {
    // One bar before the chart start, so the bar's last eighth.
    expect(pulseInBar(ctx({ scenes: scenes(6, 8) }), sig(6, 8), 103.5, song({ start: 104 }))).toBe(
      5,
    );
  });

  it("counts from the timeline when there is no song", () => {
    expect(pulseInBar(ctx(), sig(4, 4), 6)).toBe(2);
    expect(pulseInBar(ctx(), sig(6, 8), 2.5)).toBe(5);
  });
});
