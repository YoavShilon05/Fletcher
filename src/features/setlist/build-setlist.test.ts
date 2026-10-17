import { describe, expect, it } from "vitest";
import { buildSetlist } from "./build-setlist";

const loc = (name: string, location: number) => ({ name, location });

describe("buildSetlist", () => {
  it("groups sections, cues and STOP under the preceding song", () => {
    const setlist = buildSetlist(
      [loc("Song B", 100), loc("INTRO", 4), loc("Song A", 0), loc("BREAK", 10), loc("STOP", 50)],
      [],
      90,
    );

    expect(setlist.map((s) => s.name)).toEqual(["Song A", "Song B"]);
    expect(setlist[0]).toMatchObject({
      timelineLocation: 0,
      end: 50,
      structure: [{ name: "INTRO", timelineLocation: 4 }],
      extraCalls: [{ name: "BREAK", timelineLocation: 10 }],
    });
    expect(setlist[1].structure).toEqual([]);
  });

  it("takes the tempo from the scene with the song's name, else the set tempo", () => {
    const scenes = [
      { name: "Song A", tempo: 140, timeSignature: { numerator: 4, denominator: 4 } },
    ];
    const [a, b] = buildSetlist([loc("Song A", 0), loc("Song B", 10)], scenes, 90);
    expect(a.tempo).toBe(140);
    expect(b.tempo).toBe(90);
  });

  it("ignores section and STOP locators before the first song", () => {
    const setlist = buildSetlist([loc("INTRO", 0), loc("STOP", 1), loc("Song A", 2)], [], 120);
    expect(setlist).toHaveLength(1);
    expect(setlist[0]).toMatchObject({ name: "Song A", structure: [] });
    expect(setlist[0].end).toBeUndefined();
  });

  it("records a START locator as the song's chart start", () => {
    const [a, b] = buildSetlist(
      [loc("Song A", 0), loc("START", 8), loc("INTRO", 8), loc("Song B", 100)],
      [],
      120,
    );
    expect(a.start).toBe(8);
    expect(a.structure).toHaveLength(1); // START isn't a section
    expect(b.start).toBeUndefined();
  });

  it("does not mutate its input", () => {
    const locators = [loc("Song B", 10), loc("Song A", 0)];
    buildSetlist(locators, [], 120);
    expect(locators[0].name).toBe("Song B");
  });
});
