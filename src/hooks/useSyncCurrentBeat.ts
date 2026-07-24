import {usePropertyListener} from "@/hooks/usePropertyListener.ts";
import {useAtomValue, useSetAtom} from "jotai";
import {currentBeatAtom, currentlyPlayingAtom, delayFromMothershipAtom} from "@/stores/store.ts";
import {useCallback, useEffect, useRef} from "react";

const MS_PER_MINUTE = 60000;

type PlaybackAnchor = {
  startTimeMs: number; // absolute wall-clock time (epoch ms) playback actually started
  startBeat: number;
  tempo: number; // BPM = quarter notes per minute
};

export const useSyncCurrentBeat = () => {
  const setCurrentBeat = useSetAtom(currentBeatAtom);
  const currentlyPlaying = useAtomValue(currentlyPlayingAtom);

  const anchorRef = useRef<PlaybackAnchor | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastEmittedBeatRef = useRef<number | null>(null);

  const clearScheduled = useCallback(() => {
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const delayFromMothership = useAtomValue(delayFromMothershipAtom);

  const advance = useCallback(() => {
    const anchor = anchorRef.current;
    if (!anchor || anchor.tempo <= 0) return;

    const beatsPerMs = anchor.tempo / MS_PER_MINUTE;
    const elapsedMs = Date.now() - anchor.startTimeMs;
    const adjustedElapsedMs = elapsedMs - delayFromMothership; // always fresh

    const beatFloat = anchor.startBeat + adjustedElapsedMs * beatsPerMs;
    const beatInt = Math.floor(beatFloat);

    if (beatInt !== lastEmittedBeatRef.current) {
      lastEmittedBeatRef.current = beatInt;
      setCurrentBeat(beatInt);
    }

    const nextBeatOffsetFromStart = (beatInt + 1 - anchor.startBeat) / beatsPerMs;
    const msUntilNextBeat = nextBeatOffsetFromStart - adjustedElapsedMs;
    const delay = Math.max(msUntilNextBeat, 1);

    timeoutRef.current = setTimeout(advance, delay);
    // void msPerBeat; // (kept for readability/debugging; remove if you add logging elsewhere)
  }, [setCurrentBeat, delayFromMothership]);

  const handlePlaybackStart = useCallback((payload: number[]) => {
    const [unixSeconds, unixMillis, startBeat, tempo] = payload;

    anchorRef.current = {
      startTimeMs: unixSeconds * 1000 + unixMillis - 200,
      startBeat,
      tempo,
    };
    lastEmittedBeatRef.current = null; // force emit on the first `advance()` call

    clearScheduled();
    advance();
  }, [advance, clearScheduled]);

  usePropertyListener(
    "/live/song/start_listen/playback_start",
    "/live/song/get/playback_start",
    handlePlaybackStart
  );

  useEffect(() => {
    if (!currentlyPlaying) {
      anchorRef.current = null;
      lastEmittedBeatRef.current = null;
      clearScheduled();
    }
  }, [currentlyPlaying, clearScheduled]);

  useEffect(() => clearScheduled, [clearScheduled]);
};