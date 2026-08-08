import { describe, expect, it } from "vitest";
import { decodeTimeSignatureValue, extractTempoEvents, extractTimeSignatureEvents } from "./als";

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

/** Both envelopes, addressed by PointeeId as a real set does. */
const automatedSet = (envelopes: unknown[], trackKey = "MainTrack") => ({
  Ableton: {
    LiveSet: {
      [trackKey]: {
        AutomationEnvelopes: { Envelopes: { AutomationEnvelope: envelopes } },
        DeviceChain: {
          Mixer: {
            Tempo: { AutomationTarget: { "@_Id": "8" } },
            TimeSignature: { AutomationTarget: { "@_Id": "10" } },
          },
        },
      },
    },
  },
});

const envelope = (pointeeId: string, tag: string, events: unknown) => ({
  EnvelopeTarget: { PointeeId: { "@_Value": pointeeId } },
  Automation: { Events: { [tag]: events } },
});

const TEMPO_ENVELOPE = envelope("8", "FloatEvent", [
  { "@_Time": "-63072000", "@_Value": "69.5" },
  { "@_Time": "160", "@_Value": "140" },
  { "@_Time": "128", "@_Value": "69.5" },
]);
const SIGNATURE_ENVELOPE = envelope("10", "EnumEvent", [
  { "@_Time": "-63072000", "@_Value": "201" },
]);

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

  it("picks its envelope by target id, whatever order the envelopes come in", () => {
    // Live orders envelopes by creation, so automating tempo first puts the
    // tempo envelope at index 0.
    const events = extractTimeSignatureEvents(automatedSet([TEMPO_ENVELOPE, SIGNATURE_ENVELOPE]));
    expect(events).toEqual([{ time: -63072000, timeSignature: { numerator: 4, denominator: 4 } }]);
  });
});

describe("extractTempoEvents", () => {
  it("reads the tempo envelope, sorted by time", () => {
    expect(extractTempoEvents(automatedSet([TEMPO_ENVELOPE, SIGNATURE_ENVELOPE]))).toEqual([
      { time: -63072000, tempo: 69.5 },
      { time: 128, tempo: 69.5 },
      { time: 160, tempo: 140 },
    ]);
  });

  it("reads sets saved before Live 12 renamed the master track", () => {
    expect(
      extractTempoEvents(automatedSet([TEMPO_ENVELOPE, SIGNATURE_ENVELOPE], "MasterTrack")),
    ).toHaveLength(3);
  });

  it("doesn't mistake the time-signature envelope for tempo", () => {
    expect(extractTempoEvents(automatedSet([SIGNATURE_ENVELOPE]))).toEqual([]);
    expect(extractTempoEvents(liveSet({ "@_Time": "0", "@_Value": "201" }))).toEqual([]);
  });

  it("returns [] for a set without automation", () => {
    expect(extractTempoEvents({})).toEqual([]);
  });
});
