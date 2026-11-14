import { describe, expect, it } from "vitest";
import { song } from "@/test/fixtures";
import { ExtraCueNames } from "@/types/song";
import { countClips } from "./clips";
import { cueClipAt } from "./cue-calls";

/** The clip name fired on `beat`, or null. */
const spokenAt = (s: ReturnType<typeof song>, beat: number) => {
  const clip = cueClipAt(s, beat);
  return clip === null ? null : countClips[clip];
};

describe("cueClipAt", () => {
  // The next section after the intro is VERSE, at beat 136.
  it("calls the section name 7 beats ahead", () => {
    expect(spokenAt(song(), 129)).toBe("verse");
  });

  it("counts in 1-2-3-4 on the beats right before the section", () => {
    expect([132, 133, 134, 135].map((beat) => spokenAt(song(), beat))).toEqual([
      "1",
      "2",
      "3",
      "4",
    ]);
  });

  it("finishes the count on the beat before the downbeat", () => {
    expect(spokenAt(song(), 135)).toBe("4"); // the section lands on 136
    expect(spokenAt(song(), 136)).toBeNull(); // nothing on the downbeat itself
  });

  it("stays quiet otherwise", () => {
    expect(spokenAt(song(), 120)).toBeNull(); // too far ahead
    expect(spokenAt(song(), 130)).toBeNull(); // between the call and the count
    expect(spokenAt(song(), 131)).toBeNull(); // still before the count starts
    expect(spokenAt(song(), 190)).toBeNull(); // no section left
  });

  it("calls whichever of section / extra cue comes first", () => {
    const s = song({ extraCalls: [{ name: ExtraCueNames.BREAK, timelineLocation: 120 }] });
    expect(spokenAt(s, 113)).toBe("break");
  });
});
