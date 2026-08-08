// The one place OSC addresses are spelled out. Incoming messages carry their
// payload decoder; outgoing commands are typed functions in `live-api.ts`.

import type { Scene } from "@/types/scene";
import type { TempoChangeEvent } from "@/types/tempo";
import type { TimeSignatureChangeEvent } from "@/types/time-signature";
import { asBoolean, asNumber, asString, chunk, defineMessage } from "./message";

export interface Locator {
  name: string;
  location: number;
}

/** Wall-clock moment playback started, for extrapolating the beat locally. */
export interface PlaybackAnchor {
  /** Epoch ms at which playback started (as stamped by the Live machine). */
  startTimeMs: number;
  startBeat: number;
  /** BPM — quarter notes per minute. */
  tempo: number;
}

export interface ClipTriggered {
  trackIndex: number;
  clipIndex: number;
  isTriggered: boolean;
}

/** Messages sent by AbletonOSC (and forwarded to followers by the band server). */
export const LIVE = {
  isPlaying: defineMessage("/live/song/get/is_playing", ([v]) => asBoolean(v)),
  beat: defineMessage("/live/song/get/beat", ([v]) => asNumber(v)),
  playbackStart: defineMessage(
    "/live/song/get/playback_start",
    ([seconds, millis, startBeat, tempo]): PlaybackAnchor => ({
      startTimeMs: asNumber(seconds) * 1000 + asNumber(millis),
      startBeat: asNumber(startBeat),
      tempo: asNumber(tempo),
    }),
  ),
  cuePoints: defineMessage("/live/song/get/cue_points", (args) =>
    chunk(args, 2).map(([name, location]): Locator => ({
      name: asString(name),
      location: asNumber(location),
    })),
  ),
  scenes: defineMessage("/live/song/get/scenes", (args) =>
    chunk(args, 4).map(([name, tempo, numerator, denominator]): Scene => ({
      name: asString(name),
      tempo: asNumber(tempo),
      timeSignature: { numerator: asNumber(numerator), denominator: asNumber(denominator) },
    })),
  ),
  trackNames: defineMessage("/live/song/get/track_names", (args) => args.map(asString)),
  selectedScene: defineMessage("/live/view/get/selected_scene", ([v]) => asNumber(v)),
  loop: defineMessage("/live/song/get/loop", ([v]) => asBoolean(v)),
  tempo: defineMessage("/live/song/get/tempo", ([v]) => asNumber(v)),
  signatureNumerator: defineMessage("/live/song/get/signature_numerator", ([v]) => asNumber(v)),
  signatureDenominator: defineMessage("/live/song/get/signature_denominator", ([v]) => asNumber(v)),
  filePath: defineMessage("/live/song/get/file_path", ([v]) => asString(v)),
  clipTriggered: defineMessage(
    "/live/clip_slot/get/is_triggered",
    ([track, clip, triggered]): ClipTriggered => ({
      trackIndex: asNumber(track),
      clipIndex: asNumber(clip),
      isTriggered: asBoolean(triggered),
    }),
  ),
} as const;

/**
 * Song properties the host subscribes to once at startup. AbletonOSC replies
 * immediately with the current value and again on every change. Re-sending a
 * start_listen replaces the previous listener, so this is safe to repeat.
 */
export const LIVE_LISTEN_ADDRESSES = [
  "/live/song/start_listen/is_playing",
  "/live/song/start_listen/beat",
  "/live/song/start_listen/playback_start",
  "/live/song/start_listen/cue_points",
  "/live/song/start_listen/scenes",
  "/live/song/start_listen/track_names",
  "/live/song/start_listen/loop",
  "/live/view/start_listen/selected_scene",
] as const;

/** One-shot queries the host sends at startup; replies arrive as `LIVE.*`. */
export const LIVE_INITIAL_QUERIES = [
  LIVE.signatureNumerator.address,
  LIVE.signatureDenominator.address,
  LIVE.filePath.address,
  LIVE.tempo.address,
] as const;

// --- Host -> follower broadcasts ----------------------------------------------

export const BROADCAST = {
  /** Host wall-clock time, so followers can estimate their clock offset. */
  heartbeat: defineMessage("/broadcast/heartbeat", ([sentAt]) => asNumber(sentAt)),
  /** The Live set's tempo automation, flattened to [time, bpm]*. */
  tempoEvents: defineMessage("/broadcast/tempo_events", (args) =>
    chunk(args, 2).map(([time, tempo]): TempoChangeEvent => ({
      time: asNumber(time),
      tempo: asNumber(tempo),
    })),
  ),
  /** The Live set's time-signature automation, flattened to [time, num, den]*. */
  timeSignatureEvents: defineMessage("/broadcast/time_signature_events", (args) =>
    chunk(args, 3).map(([time, numerator, denominator]): TimeSignatureChangeEvent => ({
      time: asNumber(time),
      timeSignature: { numerator: asNumber(numerator), denominator: asNumber(denominator) },
    })),
  ),
  /** "Song <songName> is baked and fetchable at key <songKey>". */
  chartReady: defineMessage("/broadcast/chart_ready", ([songName, songKey]) => ({
    songName: asString(songName),
    songKey: asString(songKey),
  })),
} as const;
