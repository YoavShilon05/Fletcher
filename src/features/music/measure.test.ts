import { describe, expect, it } from "vitest";
import { ctx, song } from "@/test/fixtures";
import { calculateMeasure, chartStart } from "./measure";
import { timeSignatureAt } from "./time-signature";

describe("calculateMeasure", () => {
  it("counts measures from the song locator when there's no START", () => {
    expect(chartStart(song())).toBe(100); // not the first section (104)
    expect(calculateMeasure(ctx(), song(), 100)).toBe(0);
    expect(calculateMeasure(ctx(), song(), 108)).toBe(2);
  });

  it("counts measures from START when the song has one, negative before it", () => {
    const withStart = song({ start: 104 });
    expect(chartStart(withStart)).toBe(104);
    expect(calculateMeasure(ctx(), withStart, 100)).toBe(-1); // count-in
    expect(calculateMeasure(ctx(), withStart, 104)).toBe(0);
    expect(calculateMeasure(ctx(), withStart, 112)).toBe(2);
  });

  it("honours time-signature changes", () => {
    // From START at 104: 4/4 until beat 120 (bars 0-3), then 3 beats per bar.
    const changes = [{ time: 120, timeSignature: { numerator: 3, denominator: 4 } }];
    expect(calculateMeasure(ctx({ changes }), song({ start: 104 }), 126)).toBe(6);
  });

  it("treats eighth-note denominators as half-length beats", () => {
    const scenes = [
      { name: "Song A", tempo: 120, timeSignature: { numerator: 6, denominator: 8 } },
    ];
    // 6/8 is 3 quarter-note beats per bar.
    expect(calculateMeasure(ctx({ scenes }), song({ start: 104 }), 110)).toBe(2);
  });
});

describe("timeSignatureAt", () => {
  const scenes = [{ name: "Song A", tempo: 120, timeSignature: { numerator: 3, denominator: 4 } }];
  const changes = [{ time: 150, timeSignature: { numerator: 5, denominator: 4 } }];

  it("prefers automation, then the song's scene, then the global signature", () => {
    expect(timeSignatureAt(ctx({ scenes, changes }), song(), 160).numerator).toBe(5);
    expect(timeSignatureAt(ctx({ scenes, changes }), song(), 140).numerator).toBe(3);
    expect(timeSignatureAt(ctx(), song(), 140).numerator).toBe(4);
  });

  it("ignores automation from before the song", () => {
    const early = [{ time: 50, timeSignature: { numerator: 7, denominator: 8 } }];
    expect(timeSignatureAt(ctx({ changes: early }), song(), 140).numerator).toBe(4);
  });
});
