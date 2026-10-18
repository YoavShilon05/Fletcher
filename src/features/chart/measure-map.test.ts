import { describe, expect, it } from "vitest";
import type { Positions } from "@/lib/webmscore/types";
import { buildMeasureMap, elementIndexFor, withMeasureMaps } from "./measure-map";

const box = (id: number) => ({ id, x: 0, y: 0, sx: 1, sy: 1, page: 0 });

// `events` as [elid, ms] pairs, in playback order.
const positions = (boxes: number, events: [number, number][]): Positions => ({
  elements: Array.from({ length: boxes }, (_, i) => box(i)),
  events: events.map(([elid, position]) => ({ elid, position })),
  pageSize: { width: 100, height: 100 },
});

// 4 written bars of 1 s each, bars 1–2 repeated: plays 0 1 0 1 2 3.
const fullScore = positions(4, [
  [0, 0],
  [1, 1000],
  [0, 2000],
  [1, 3000],
  [2, 4000],
  [3, 5000],
]);

describe("buildMeasureMap", () => {
  it("unrolls repeats for the full score", () => {
    expect(buildMeasureMap(fullScore, fullScore)).toEqual([0, 1, 0, 1, 2, 3]);
  });

  it("maps every bar of a multimeasure rest onto its single box", () => {
    // Part folds bars 1–2 into one rest box (0), then bars 3, 4 are boxes 1, 2.
    const part = positions(3, [
      [0, 0],
      [0, 2000],
      [1, 4000],
      [2, 5000],
    ]);
    expect(buildMeasureMap(fullScore, part)).toEqual([0, 0, 0, 0, 1, 2]);
  });

  it("tolerates 1 ms rounding between scores", () => {
    const part = positions(2, [
      [0, 0],
      [1, 1001],
    ]);
    const ref = positions(2, [
      [0, 0],
      [1, 1000],
    ]);
    expect(buildMeasureMap(ref, part)).toEqual([0, 1]);
  });

  it("gives up without events", () => {
    expect(buildMeasureMap(positions(2, []), fullScore)).toBeUndefined();
    expect(buildMeasureMap(fullScore, positions(2, []))).toBeUndefined();
  });
});

describe("withMeasureMaps", () => {
  it("times every part against the full score", () => {
    const part = positions(2, [
      [0, 0],
      [1, 4000],
    ]);
    const result = withMeasureMaps({
      musicXml: "",
      parts: [
        { id: -1, name: "Full Score", pages: [], positions: fullScore },
        { id: 0, name: "Bass", pages: [], positions: part },
      ],
    });
    expect(result.parts.map((p) => p.positions.measures)).toEqual([
      [0, 1, 0, 1, 2, 3],
      [0, 0, 0, 0, 1, 1],
    ]);
  });
});

describe("elementIndexFor", () => {
  it("uses the map when present, identity otherwise", () => {
    expect(elementIndexFor({ ...fullScore, measures: [0, 1, 0] }, 2)).toBe(0);
    expect(elementIndexFor({ ...fullScore, measures: [0, 1, 0] }, 9)).toBe(-1);
    expect(elementIndexFor(fullScore, 2)).toBe(2);
  });
});
