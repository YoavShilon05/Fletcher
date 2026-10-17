import { describe, expect, it, vi } from "vitest";
import { BROADCAST, LIVE } from "./addresses";
import { asBoolean, asNumber, chunk, decodeOscValue, matchMessage } from "./message";

describe("decodeOscValue", () => {
  it("unwraps Rust Debug-formatted arguments", () => {
    expect(decodeOscValue("Float(72.5)")).toBe(72.5);
    expect(decodeOscValue("Int(4)")).toBe(4);
    expect(decodeOscValue('String("Chorus")')).toBe("Chorus");
    expect(decodeOscValue("Bool(true)")).toBe(true);
    expect(decodeOscValue("Nil()")).toBeNull();
  });

  it("passes plain strings and primitives through", () => {
    expect(decodeOscValue("72")).toBe("72");
    expect(decodeOscValue(3)).toBe(3);
  });
});

describe("coercion", () => {
  it("accepts numbers that arrive as strings (band-server broadcasts)", () => {
    expect(asNumber("72")).toBe(72);
    expect(() => asNumber("abc")).toThrow();
    expect(() => asNumber(undefined)).toThrow();
  });

  it("accepts the boolean spellings Live and the band server use", () => {
    expect(asBoolean(true)).toBe(true);
    expect(asBoolean(0)).toBe(false);
    expect(asBoolean("True")).toBe(true);
    expect(() => asBoolean("maybe")).toThrow();
  });
});

describe("chunk", () => {
  it("groups into fixed-size records and drops a trailing partial one", () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([
      [1, 2],
      [3, 4],
    ]);
  });
});

describe("matchMessage", () => {
  it("ignores other addresses", () => {
    const raw = { address: "/live/song/get/tempo", args: ["Float(1.0)"] };
    expect(matchMessage(LIVE.beat, raw)).toBeUndefined();
  });

  it("decodes cue points into locators", () => {
    const raw = {
      address: "/live/song/get/cue_points",
      args: ['String("Song A")', "Float(0.0)", 'String("INTRO")', "Float(8.0)"],
    };
    expect(matchMessage(LIVE.cuePoints, raw)).toEqual([
      { name: "Song A", location: 0 },
      { name: "INTRO", location: 8 },
    ]);
  });

  it("decodes stringified broadcast payloads", () => {
    const raw = {
      address: "/broadcast/time_signature_events",
      args: ["0", "4", "4", "64", "7", "8"],
    };
    expect(matchMessage(BROADCAST.timeSignatureEvents, raw)).toEqual([
      { time: 0, timeSignature: { numerator: 4, denominator: 4 } },
      { time: 64, timeSignature: { numerator: 7, denominator: 8 } },
    ]);
  });

  it("drops (and logs) malformed payloads instead of throwing", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(matchMessage(LIVE.beat, { address: "/live/song/get/beat", args: [] })).toBeUndefined();
    expect(warn).toHaveBeenCalledOnce();
    warn.mockRestore();
  });
});
