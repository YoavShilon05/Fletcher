import { readFile } from "@tauri-apps/plugin-fs";
import { gunzipSync } from "fflate";
import { XMLParser } from "fast-xml-parser";
import type { TempoChangeEvent } from "@/types/tempo";
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

/** The two main-track mixer parameters we read, and the event tag each uses. */
const EVENT_TAGS = { Tempo: "FloatEvent", TimeSignature: "EnumEvent" } as const;
type MixerParam = keyof typeof EVENT_TAGS;

interface AutomationEvent {
  "@_Time": string | number;
  "@_Value": string | number;
}

interface Envelope {
  EnvelopeTarget?: { PointeeId?: { "@_Value"?: string | number } };
  Automation?: { Events?: Record<string, AutomationEvent | AutomationEvent[] | undefined> };
}

interface MainTrack {
  AutomationEnvelopes?: { Envelopes?: { AutomationEnvelope?: Envelope | Envelope[] } };
  DeviceChain?: {
    Mixer?: Partial<Record<MixerParam, { AutomationTarget?: { "@_Id"?: string | number } }>>;
  };
}

const asArray = <T>(value: T | T[] | undefined): T[] =>
  value === undefined ? [] : Array.isArray(value) ? value : [value];

/** Live 12 renamed the master track to "Main"; sets saved before it say MasterTrack. */
function mainTrack(liveSet: unknown): MainTrack | undefined {
  const root = liveSet as {
    Ableton?: { LiveSet?: { MainTrack?: MainTrack; MasterTrack?: MainTrack } };
  };
  const set = root.Ableton?.LiveSet;
  return set?.MainTrack ?? set?.MasterTrack;
}

interface Breakpoint {
  time: number;
  value: number;
}

/**
 * Breakpoints of one main-track mixer envelope, sorted by time.
 *
 * The envelope is matched by the parameter's automation-target id rather than
 * by its position in the list: Live orders envelopes by creation, so tempo and
 * time signature can come either way round.
 *
 * Live keeps an envelope for both parameters even in a set with no automation —
 * a lone point at `-63072000` (its "beginning of time") holding the manual
 * value. That point is a real baseline, so it comes back like any other; see
 * `hasTempoAutomation` for telling a baseline from an actual tempo move.
 */
function extractBreakpoints(liveSet: unknown, param: MixerParam): Breakpoint[] {
  const track = mainTrack(liveSet);
  const tag = EVENT_TAGS[param];
  const envelopes = asArray(track?.AutomationEnvelopes?.Envelopes?.AutomationEnvelope);

  const targetId = track?.DeviceChain?.Mixer?.[param]?.AutomationTarget?.["@_Id"];
  const byTarget =
    targetId === undefined
      ? undefined
      : envelopes.find(
          (envelope) =>
            String(envelope.EnvelopeTarget?.PointeeId?.["@_Value"]) === String(targetId),
        );

  // Falling back on the event tag alone is only safe when it picks out exactly
  // one envelope — but then it keeps us working on a layout we don't recognise.
  const tagged = envelopes.filter((envelope) => envelope.Automation?.Events?.[tag] !== undefined);
  const envelope = byTarget ?? (tagged.length === 1 ? tagged[0] : undefined);

  return asArray(envelope?.Automation?.Events?.[tag])
    .map((event) => ({ time: Number(event["@_Time"]), value: Number(event["@_Value"]) }))
    .filter(({ time, value }) => Number.isFinite(time) && Number.isFinite(value))
    .sort((a, b) => a.time - b.time);
}

/**
 * Pull the main track's time-signature automation out of a parsed .als, sorted
 * by time. Returns [] when the set has none (or the layout isn't what we expect).
 */
export function extractTimeSignatureEvents(liveSet: unknown): TimeSignatureChangeEvent[] {
  return extractBreakpoints(liveSet, "TimeSignature").map(({ time, value }) => ({
    time,
    timeSignature: decodeTimeSignatureValue(value),
  }));
}

/** The same for the main track's tempo automation, in BPM. */
export function extractTempoEvents(liveSet: unknown): TempoChangeEvent[] {
  return extractBreakpoints(liveSet, "Tempo")
    .map(({ time, value }) => ({ time, tempo: value }))
    .filter(({ tempo }) => tempo > 0);
}

/** Read a gzipped .als file and parse its XML. Host only. */
export async function loadAls(path: string): Promise<unknown> {
  const bytes = await readFile(path);
  const xml = new TextDecoder().decode(gunzipSync(bytes));
  return new XMLParser({ ignoreAttributes: false }).parse(xml);
}
