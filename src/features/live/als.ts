import { readFile } from "@tauri-apps/plugin-fs";
import { gunzipSync } from "fflate";
import { XMLParser } from "fast-xml-parser";
import type { TimeSignature, TimeSignatureChangeEvent } from "@/types/time-signature";

const DENOMINATORS = [1, 2, 4, 8, 16];

/**
 * Live stores a time signature as one enum id: 99 numerators (1–99) per
 * denominator block, blocks ordered 1, 2, 4, 8, 16.
 */
export function decodeTimeSignatureValue(id: number): TimeSignature {
  const denominator = DENOMINATORS[Math.floor(id / 99)] ?? 4;
  const numerator = (id % 99) + 1;
  return { numerator, denominator };
}

interface EnumEvent {
  "@_Time": string | number;
  "@_Value": string | number;
}

const asArray = <T>(value: T | T[] | undefined): T[] =>
  value === undefined ? [] : Array.isArray(value) ? value : [value];

/**
 * Pull the main track's time-signature automation out of a parsed .als, sorted
 * by time. Returns [] when the set has none (or the layout isn't what we expect).
 */
export function extractTimeSignatureEvents(liveSet: unknown): TimeSignatureChangeEvent[] {
  // Ableton.LiveSet.MainTrack.AutomationEnvelopes.Envelopes.AutomationEnvelope[0].Automation.Events.EnumEvent
  const root = liveSet as {
    Ableton?: {
      LiveSet?: {
        MainTrack?: {
          AutomationEnvelopes?: {
            Envelopes?: {
              AutomationEnvelope?: unknown;
            };
          };
        };
      };
    };
  };
  const envelopes = asArray(
    root.Ableton?.LiveSet?.MainTrack?.AutomationEnvelopes?.Envelopes?.AutomationEnvelope,
  ) as { Automation?: { Events?: { EnumEvent?: EnumEvent | EnumEvent[] } } }[];

  return asArray(envelopes[0]?.Automation?.Events?.EnumEvent)
    .map((event) => ({
      time: Number(event["@_Time"]),
      timeSignature: decodeTimeSignatureValue(Number(event["@_Value"])),
    }))
    .filter((event) => Number.isFinite(event.time))
    .sort((a, b) => a.time - b.time);
}

/** Read a gzipped .als file and parse its XML. Host only. */
export async function loadAls(path: string): Promise<unknown> {
  const bytes = await readFile(path);
  const xml = new TextDecoder().decode(gunzipSync(bytes));
  return new XMLParser({ ignoreAttributes: false }).parse(xml);
}
