import { describe, expect, it } from "vitest";
import { song, tempoCtx } from "@/test/fixtures";
import { hasTempoAutomation, tempoAt } from "./tempo";

/** Live's baseline point, present in every set whether or not it's automated. */
const BASELINE = { time: -63072000, tempo: 90 };
/** A switch inside the fixture song, which runs from beat 100 to 200. */
const SWITCH = [
  { time: 148, tempo: 90 },
  { time: 150, tempo: 140 },
];

describe("hasTempoAutomation", () => {
  it("is false for a set with only Live's baseline point", () => {
    expect(hasTempoAutomation(tempoCtx({ changes: [BASELINE] }), song())).toBe(false);
  });

  it("is true for a song with a breakpoint in its range", () => {
    expect(hasTempoAutomation(tempoCtx({ changes: [BASELINE, ...SWITCH] }), song())).toBe(true);
  });

  it("is true for a song pinned by a point on its own locator", () => {
    const changes = [BASELINE, { time: 100, tempo: 120 }];
    expect(hasTempoAutomation(tempoCtx({ changes }), song())).toBe(true);
  });

  it("ignores breakpoints belonging to another song", () => {
    const changes = [BASELINE, { time: 400, tempo: 140 }];
    expect(hasTempoAutomation(tempoCtx({ changes }), song())).toBe(false);
  });

  it("stops at the next song when there is no STOP locator", () => {
    const first = song({ name: "First", timelineLocation: 100, end: undefined });
    const second = song({ name: "Second", timelineLocation: 300, end: 400 });
    const ctx = tempoCtx({ changes: [{ time: 350, tempo: 140 }], setlist: [first, second] });

    expect(hasTempoAutomation(ctx, first)).toBe(false);
    expect(hasTempoAutomation(ctx, second)).toBe(true);
  });

  it("gives a point on a song locator to that song only", () => {
    const first = song({ name: "First", timelineLocation: 100, end: undefined });
    const second = song({ name: "Second", timelineLocation: 300, end: 400 });
    const ctx = tempoCtx({ changes: [{ time: 300, tempo: 140 }], setlist: [first, second] });

    expect(hasTempoAutomation(ctx, first)).toBe(false);
    expect(hasTempoAutomation(ctx, second)).toBe(true);
  });
});

describe("tempoAt", () => {
  it("uses the song's scene tempo when the song isn't automated", () => {
    const ctx = tempoCtx({ changes: [BASELINE] });
    expect(tempoAt(ctx, song({ tempo: 120 }), 120)).toBe(120);
  });

  it("follows the envelope through an automated song", () => {
    const ctx = tempoCtx({ changes: [BASELINE, ...SWITCH] });
    expect(tempoAt(ctx, song(), 149)).toBe(90);
    expect(tempoAt(ctx, song(), 150)).toBe(140);
    expect(tempoAt(ctx, song(), 199)).toBe(140);
  });

  it("holds the last breakpoint before the song, as Live does", () => {
    // 75 is pinned a bar before the song locator; its scene says 120.
    const ctx = tempoCtx({ changes: [BASELINE, { time: 96, tempo: 75 }, ...SWITCH] });
    expect(tempoAt(ctx, song({ tempo: 120 }), 100)).toBe(75);
  });

  it("falls back to the set tempo with no song", () => {
    expect(tempoAt(tempoCtx({ global: 128 }))).toBe(128);
  });
});
