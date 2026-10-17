// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import { parseChordsFromMusicXml } from "./extract-chords";

const score = (measures: string) =>
  `<?xml version="1.0"?><score-partwise><part id="P1">${measures}</part></score-partwise>`;

const measure = (number: number, harmony: string) =>
  `<measure number="${number}"><harmony>${harmony}</harmony></measure>`;

describe("parseChordsFromMusicXml", () => {
  it("reads root, quality (preferring the text attribute) and bass", () => {
    const [m] = parseChordsFromMusicXml(
      score(
        measure(
          1,
          `<root><root-step>C</root-step><root-alter>1</root-alter></root>
           <kind text="m7">minor-seventh</kind>
           <bass><bass-step>E</bass-step></bass>`,
        ),
      ),
    );
    expect(m.measureNumber).toBe("1");
    expect(m.chords).toEqual([{ root: "C#", quality: "m7", bass: "E", isNoChord: false }]);
  });

  it("falls back to the standard kind symbol, and handles N.C.", () => {
    const [a, b] = parseChordsFromMusicXml(
      score(
        measure(1, "<root><root-step>G</root-step></root><kind>dominant</kind>") +
          measure(2, "<kind>none</kind>"),
      ),
    );
    expect(a.chords[0].quality).toBe("7");
    expect(b.chords[0]).toMatchObject({ root: "N.C.", isNoChord: true });
  });

  it("returns [] for malformed XML", () => {
    expect(parseChordsFromMusicXml("<score-partwise>")).toEqual([]);
  });
});
