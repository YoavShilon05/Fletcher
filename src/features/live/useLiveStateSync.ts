import { useStore } from "jotai";
import { BROADCAST, LIVE } from "@/lib/osc/addresses";
import { useOscMessage } from "@/lib/osc/useOscMessage";
import {
  currentBeatAtom,
  delayFromMothershipAtom,
  globalTempoAtom,
  globalTimeSignatureAtom,
  isPlayingAtom,
  locatorsAtom,
  playbackAnchorAtom,
  scenesAtom,
  tempoChangesAtom,
  timeSignatureChangesAtom,
  trackNamesAtom,
} from "./atoms";

/**
 * Copy incoming Live state into atoms. Runs on the host and on followers —
 * the band server forwards every Live message, so both see the same stream.
 */
export function useLiveStateSync() {
  const store = useStore();

  useOscMessage(LIVE.isPlaying, (playing) => {
    store.set(isPlayingAtom, playing);
    if (!playing) store.set(playbackAnchorAtom, null);
  });
  useOscMessage(LIVE.playbackStart, (anchor) => store.set(playbackAnchorAtom, anchor));
  useOscMessage(LIVE.beat, (beat) => {
    // While playing, useBeatClock extrapolates the beat locally instead.
    if (!store.get(isPlayingAtom)) store.set(currentBeatAtom, beat);
  });

  useOscMessage(LIVE.cuePoints, (locators) => store.set(locatorsAtom, locators));
  useOscMessage(LIVE.scenes, (scenes) => store.set(scenesAtom, scenes));
  useOscMessage(LIVE.trackNames, (names) => store.set(trackNamesAtom, names));

  useOscMessage(LIVE.tempo, (tempo) => store.set(globalTempoAtom, tempo));
  useOscMessage(LIVE.signatureNumerator, (numerator) =>
    store.set(globalTimeSignatureAtom, (prev) => ({ ...prev, numerator })),
  );
  useOscMessage(LIVE.signatureDenominator, (denominator) =>
    store.set(globalTimeSignatureAtom, (prev) => ({ ...prev, denominator })),
  );

  useOscMessage(BROADCAST.tempoEvents, (events) => store.set(tempoChangesAtom, events));
  useOscMessage(BROADCAST.timeSignatureEvents, (events) =>
    store.set(timeSignatureChangesAtom, events),
  );
  useOscMessage(BROADCAST.heartbeat, (sentAt) =>
    store.set(delayFromMothershipAtom, Date.now() - sentAt),
  );
}
