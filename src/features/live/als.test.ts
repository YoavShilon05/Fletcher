import { describe, expect, it } from "vitest";
import { decodeTimeSignatureValue, extractTimeSignatureEvents } from "./als";

describe("decodeTimeSignatureValue", () => {
  it("decodes Live's numerator/denominator enum", () => {
    expect(decodeTimeSignatureValue(201)).toEqual({ numerator: 4, denominator: 4 });
    expect(decodeTimeSignatureValue(303)).toEqual({ numerator: 7, denominator: 8 });
    expect(decodeTimeSignatureValue(0)).toEqual({ numerator: 1, denominator: 1 });
  });
});

const liveSet = (enumEvent: unknown) => ({
  Ableton: {
    LiveSet: {
      MainTrack: {
        AutomationEnvelopes: {
          Envelopes: {
            AutomationEnvelope: [{ Automation: { Events: { EnumEvent: enumEvent } } }],
          },
        },
      },
    },
  },
});

describe("extractTimeSignatureEvents", () => {
  it("reads and sorts the main track's automation", () => {
    const events = extractTimeSignatureEvents(
      liveSet([
        { "@_Time": "64", "@_Value": "303" },
        { "@_Time": "-63072000", "@_Value": "201" },
      ]),
    );
    expect(events.map((e) => e.time)).toEqual([-63072000, 64]);
    expect(events[1].timeSignature).toEqual({ numerator: 7, denominator: 8 });
  });

  it("handles a lone event, which the XML parser doesn't wrap in an array", () => {
    expect(extractTimeSignatureEvents(liveSet({ "@_Time": "0", "@_Value": "201" }))).toHaveLength(
      1,
    );
  });

  it("returns [] for a set without automation", () => {
    expect(extractTimeSignatureEvents({})).toEqual([]);
    expect(extractTimeSignatureEvents(liveSet(undefined))).toEqual([]);
  });
});
