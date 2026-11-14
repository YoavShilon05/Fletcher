import { describe, expect, it } from "vitest";
import { song } from "@/test/fixtures";
import {
  neighbourSection,
  neighbourSong,
  sectionAt,
  sectionEnd,
  snapPoints,
  snapTarget,
  songAt,
} from "./sections";

describe("sectionAt", () => {
  it("finds the section under the playhead", () => {
    expect(sectionAt(song(), 140)?.name).toBe("VERSE");
    expect(sectionAt(song(), 136)?.name).toBe("VERSE");
  });

  it("is undefined during the count-in, outside the song, and past STOP", () => {
    expect(sectionAt(song(), 102)).toBeUndefined();
    expect(sectionAt(song(), 50)).toBeUndefined();
    expect(sectionAt(song(), 201)).toBeUndefined();
    expect(sectionAt(undefined, 140)).toBeUndefined();
  });
});

describe("songs", () => {
  const setlist = [
    song({ name: "A", timelineLocation: 0 }),
    song({ name: "B", timelineLocation: 100 }),
  ];

  it("picks the last song starting at or before the beat", () => {
    expect(songAt(setlist, 99)?.name).toBe("A");
    expect(songAt(setlist, 100)?.name).toBe("B");
    expect(songAt(setlist, -1)).toBeUndefined();
  });

  it("steps through the setlist by name, not by reference", () => {
    expect(neighbourSong(setlist, song({ name: "A" }), 1)?.name).toBe("B");
    expect(neighbourSong(setlist, setlist[1], 1)).toBeUndefined();
  });
});

describe("section navigation", () => {
  const s = song();

  it("steps between sections by location, not by reference", () => {
    expect(neighbourSection(s, { ...s.structure[1] }, 1)?.name).toBe("CHORUS");
    expect(neighbourSection(s, s.structure[0], -1)).toBeUndefined();
  });

  it("ends a section at the next one, or at the song's STOP", () => {
    expect(sectionEnd(s, s.structure[0])).toBe(136);
    expect(sectionEnd(s, s.structure[2])).toBe(200);
  });
});

describe("snap selection", () => {
  // A: locator 100, START 104 (count-in before it) sharing INTRO's beat,
  // then VERSE 136 / CHORUS 168. B: locator 290, no START, no sections.
  const setlist = [song({ start: 104 }), song({ name: "B", timelineLocation: 290, structure: [] })];
  const points = snapPoints(setlist);

  it("lists each song locator, START and section start once, in order", () => {
    expect(points).toEqual([100, 104, 136, 168, 290]);
    // No START: the locator still gets on the grid, and only once.
    expect(snapPoints([song()])).toEqual([100, 104, 136, 168]);
  });

  it("snaps between the song locator and the chart start", () => {
    expect(snapTarget(points, 104, 102)).toBe(100); // dragged into the count-in
    expect(snapTarget(points, 104, 100)).toBe(100);
    expect(snapTarget(points, 100, 103)).toBe(104); // and back out of it
  });

  it("lands on the start of the section moved into", () => {
    expect(snapTarget(points, 104, 150)).toBe(136);
    expect(snapTarget(points, 170, 140)).toBe(136);
    expect(snapTarget(points, 104, 136)).toBe(136);
  });

  it("steps to the neighbour when the move stays inside one section", () => {
    expect(snapTarget(points, 136, 150)).toBe(168);
    expect(snapTarget(points, 150, 140)).toBe(104);
  });

  it("crosses between songs", () => {
    expect(snapTarget(points, 168, 400)).toBe(290);
    expect(snapTarget(points, 290, 110)).toBe(104);
  });

  it("clamps at both ends of the set", () => {
    expect(snapTarget(points, 136, 0)).toBe(100);
    expect(snapTarget(points, 100, 50)).toBe(100);
    expect(snapTarget(points, 290, 500)).toBe(290);
    expect(snapTarget([], 0, 50)).toBeUndefined();
  });
});
