import { useSetAtom } from "jotai";
import { useEffect } from "react";
import { BROADCAST_HEARTBEAT_INTERVAL_MS } from "@/constants";
import { LIVE } from "@/lib/osc/addresses";
import { band, live } from "@/lib/osc/live-api";
import { useOscMessage } from "@/lib/osc/useOscMessage";
import { extractTempoEvents, extractTimeSignatureEvents, loadAls } from "./als";
import { filePathAtom, tempoChangesAtom, timeSignatureChangesAtom } from "./atoms";

/** Host: subscribe to Live's song properties and ask for the one-shot ones. */
export function useLiveListeners() {
  useEffect(() => {
    live.startListening();
    live.queryInitialState();
  }, []);
}

/**
 * Host: when Live reports the open .als, read its tempo and time-signature
 * automation (neither is exposed over OSC) and share both with followers.
 *
 * Only re-read when the path changes, so automation edited and saved while
 * Fletcher is running won't be picked up until the set is reopened.
 */
export function useLiveSetFile() {
  const setFilePath = useSetAtom(filePathAtom);
  const setTimeSignatureChanges = useSetAtom(timeSignatureChangesAtom);
  const setTempoChanges = useSetAtom(tempoChangesAtom);

  useOscMessage(LIVE.filePath, async (path) => {
    setFilePath(path);
    try {
      const liveSet = await loadAls(path);

      const timeSignatures = extractTimeSignatureEvents(liveSet);
      setTimeSignatureChanges(timeSignatures);
      band.timeSignatureEvents(timeSignatures);

      const tempos = extractTempoEvents(liveSet);
      setTempoChanges(tempos);
      band.tempoEvents(tempos);
    } catch (err) {
      console.error(`Couldn't read the automation in ${path}`, err);
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
