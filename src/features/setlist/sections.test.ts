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
  // START at 100, sections at 104 / 136 / 168; song B's START at 300.
  const setlist = [song(), song({ name: "B", timelineLocation: 290, start: 300, structure: [] })];
  const points = snapPoints(setlist);

  it("lists every song start and section start once, in order", () => {
    expect(points).toEqual([100, 104, 136, 168, 300]);
    expect(snapPoints([song({ start: 104 })])).toEqual([104, 136, 168]);
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
    expect(snapTarget(points, 168, 400)).toBe(300);
    expect(snapTarget(points, 300, 110)).toBe(104);
  });

  it("clamps at both ends of the set", () => {
    expect(snapTarget(points, 136, 0)).toBe(100);
    expect(snapTarget(points, 100, 50)).toBe(100);
    expect(snapTarget(points, 300, 500)).toBe(300);
    expect(snapTarget([], 0, 50)).toBeUndefined();
  });
});
