// Typed wrappers for every command the host sends. Each returns the
// underlying invoke promise; await it when ordering matters (see clips.ts).

import type { TimeSignatureChangeEvent } from "@/types/time-signature";
import { BROADCAST, LIVE_INITIAL_QUERIES, LIVE_LISTEN_ADDRESSES } from "./addresses";
import { broadcast, sendOsc } from "./transport";

export const live = {
  startListening: () => Promise.all(LIVE_LISTEN_ADDRESSES.map((address) => sendOsc(address))),
  queryInitialState: () => Promise.all(LIVE_INITIAL_QUERIES.map((address) => sendOsc(address))),

  // Transport
  jumpTo: (beat: number) => sendOsc("/live/song/jump_to", [beat]),
  jumpBy: (beats: number) => sendOsc("/live/song/jump_by", [beats]),
  setStartTime: (beat: number) => sendOsc("/live/song/set/start_time", [beat]),
  stopPlaying: () => sendOsc("/live/song/stop_playing"),
  stopAllClips: () => sendOsc("/live/song/stop_all_clips"),
  backToArranger: () => sendOsc("/live/song/set/back_to_arranger", [0]),
  setTempo: (bpm: number) => sendOsc("/live/song/set/tempo", [bpm]),
  setLoopStart: (beat: number) => sendOsc("/live/song/set/loop_start", [beat]),
  setLoopLength: (beats: number) => sendOsc("/live/song/set/loop_length", [beats]),

  // Tracks, scenes & clips
  createAudioTrack: (index: number) => sendOsc("/live/song/create_audio_track", [index]),
  createMidiTrack: (index: number) => sendOsc("/live/song/create_midi_track", [index]),
  deleteTrack: (index: number) => sendOsc("/live/song/delete_track", [index]),
  setTrackName: (index: number, name: string) => sendOsc("/live/track/set/name", [index, name]),
  createScene: () => sendOsc("/live/song/create_scene", [-1]),
  fireClip: (track: number, clip: number) => sendOsc("/live/clip_slot/fire", [track, clip]),
  loadSample: (track: number, clip: number, fileName: string) =>
    sendOsc("/live/clip_slot/load_sample", [track, clip, fileName]),
  createClip: (track: number, clip: number, lengthBeats: number) =>
    sendOsc("/live/clip_slot/create_clip", [track, clip, lengthBeats]),
  setClipName: (track: number, clip: number, name: string) =>
    sendOsc("/live/clip/set/name", [track, clip, name]),
  listenClipTriggered: (track: number, clip: number) =>
    sendOsc("/live/clip_slot/start_listen/is_triggered", [track, clip]),
  stopListeningClipTriggered: (track: number, clip: number) =>
    sendOsc("/live/clip_slot/stop_listen/is_triggered", [track, clip]),
};

export const band = {
  heartbeat: (sentAt: number) => broadcast(BROADCAST.heartbeat.address, [sentAt]),
  timeSignatureEvents: (events: TimeSignatureChangeEvent[]) =>
    broadcast(
      BROADCAST.timeSignatureEvents.address,
      events.flatMap(({ time, timeSignature }) => [
        time,
        timeSignature.numerator,
        timeSignature.denominator,
      ]),
    ),
  chartReady: (songName: string, songKey: string) =>
    broadcast(BROADCAST.chartReady.address, [songName, songKey]),
};
