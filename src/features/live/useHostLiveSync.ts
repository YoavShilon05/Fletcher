import { useSetAtom } from "jotai";
import { useEffect } from "react";
import { BROADCAST_HEARTBEAT_INTERVAL_MS } from "@/constants";
import { LIVE } from "@/lib/osc/addresses";
import { band, live } from "@/lib/osc/live-api";
import { useOscMessage } from "@/lib/osc/useOscMessage";
import { extractTimeSignatureEvents, loadAls } from "./als";
import { filePathAtom, timeSignatureChangesAtom } from "./atoms";

/** Host: subscribe to Live's song properties and ask for the one-shot ones. */
export function useLiveListeners() {
  useEffect(() => {
    live.startListening();
    live.queryInitialState();
  }, []);
}

/**
 * Host: when Live reports the open .als, read its time-signature automation
 * (not exposed over OSC) and share it with followers.
 */
export function useLiveSetFile() {
  const setFilePath = useSetAtom(filePathAtom);
  const setTimeSignatureChanges = useSetAtom(timeSignatureChangesAtom);

  useOscMessage(LIVE.filePath, async (path) => {
    setFilePath(path);
    try {
      const events = extractTimeSignatureEvents(await loadAls(path));
      setTimeSignatureChanges(events);
      band.timeSignatureEvents(events);
    } catch (err) {
      console.error(`Couldn't read time signatures from ${path}`, err);
    }
  });
}

/**
 * Host: broadcast the wall-clock time on a fixed grid, so followers can
 * measure how far their clock is from ours.
 */
export function useBroadcastHeartbeat() {
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    const beat = () => {
      band.heartbeat(Date.now());
      const msUntilNext =
        BROADCAST_HEARTBEAT_INTERVAL_MS - (Date.now() % BROADCAST_HEARTBEAT_INTERVAL_MS);
      timeout = setTimeout(beat, msUntilNext);
    };
    beat();
    return () => clearTimeout(timeout);
  }, []);
}
