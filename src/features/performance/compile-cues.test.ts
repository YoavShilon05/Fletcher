import { describe, expect, it } from "vitest";
import { COUNT_CUE_OFFSET, SECTION_CUE_OFFSET } from "@/constants";
import { song } from "@/test/fixtures";
import { SectionNames, type Song } from "@/types/song";
import { countClips } from "./clips";
import { compileCues, cueRange } from "./compile-cues";

/** The beat a cue would sit on with its nudge applied. */
const nudged = (beat: number, offset: number) => Math.round((beat + offset) * 1000) / 1000;
const onCount = (beat: number) => nudged(beat, COUNT_CUE_OFFSET);
const onSection = (beat: number) => nudged(beat, SECTION_CUE_OFFSET);

/** The compiled cues as readable `beat: clip name` pairs. */
const spoken = (s: Song) => compileCues(s).map(({ beat, slot }) => `${beat}: ${countClips[slot]}`);

describe("compileCues", () => {
  it("lays out a section's call and count-in on the beats the live cue used", () => {
    // Fixture sections sit at 104 / 136 / 168.
    expect(spoken(song())).toEqual([
      `${onSection(97)}: intro`,
      `${onCount(100)}: 1`,
      `${onCount(101)}: 2`,
      `${onCount(102)}: 3`,
      `${onCount(103)}: 4`,
      `${onSection(129)}: verse`,
      `${onCount(132)}: 1`,
      `${onCount(133)}: 2`,
      `${onCount(134)}: 3`,
      `${onCount(135)}: 4`,
      `${onSection(161)}: chorus`,
      `${onCount(164)}: 1`,
      `${onCount(165)}: 2`,
      `${onCount(166)}: 3`,
      `${onCount(167)}: 4`,
    ]);
  });

  it("has nothing to compile for a song with no sections", () => {
    expect(compileCues(song({ structure: [] }))).toEqual([]);
  });

  it("never places a clip before the start of the arrangement", () => {
    const opener = song({
      timelineLocation: 0,
      structure: [{ name: SectionNames.INTRO, timelineLocation: 4 }],
    });
    expect(compileCues(opener).every(({ beat }) => beat >= 0)).toBe(true);
    // "1" would land at -0.1, so it is clamped to the very start instead.
    expect(spoken(opener)).toEqual([
      "0: 1",
      `${onCount(1)}: 2`,
      `${onCount(2)}: 3`,
      `${onCount(3)}: 4`,
    ]);
  });

  it("nudges the two kinds of cue by their own offset", () => {
    const cues = compileCues(song());
    const [name, firstNumber] = cues;
    // The intro sits at 104: its name is called on 97, its "1" on 100.
    expect(name.beat).toBeCloseTo(97 + SECTION_CUE_OFFSET);
    expect(firstNumber.beat).toBeCloseTo(100 + COUNT_CUE_OFFSET);
  });
});

describe("cueRange", () => {
  it("reaches back far enough to cover the opening section's call", () => {
    // The intro is called at 97, seven beats before the section at 104 — and
    // the window also allows for a cue nudged earlier than the beat it is on.
    expect(cueRange(song()).from).toBeCloseTo(
      93 + Math.min(0, SECTION_CUE_OFFSET, COUNT_CUE_OFFSET),
    );
  });

  it("stops at the song's STOP locator", () => {
    expect(cueRange(song()).to).toBe(200);
  });

  it("stops short of the next song's own first call", () => {
    const next = song({
      name: "Song B",
      timelineLocation: 300,
      end: undefined,
      structure: [{ name: SectionNames.INTRO, timelineLocation: 304 }],
    });
    // Song B calls its intro at 297, so Song A must not clear past that.
    expect(cueRange(song({ end: undefined }), next).to).toBeCloseTo(
      293 + Math.min(0, SECTION_CUE_OFFSET, COUNT_CUE_OFFSET),
    );
  });

  it("falls back to its own last cue when nothing bounds it", () => {
    expect(cueRange(song({ end: undefined })).to).toBe(168);
  });
});
