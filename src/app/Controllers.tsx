// Headless components that run the app's background logic. They render
// nothing, so state they subscribe to (like the beat) re-renders only them,
// never the visible tree — and they stay mounted whatever the layout shows.

import { useChartReadySync } from "@/features/chart/useChartReadySync";
import { useBeatClock } from "@/features/live/useBeatClock";
import {
  useBroadcastHeartbeat,
  useLiveListeners,
  useLiveSetFile,
} from "@/features/live/useHostLiveSync";
import { useLiveStateSync } from "@/features/live/useLiveStateSync";
import { useAutoStop } from "@/features/performance/useAutoStop";
import { useBuiltCues } from "@/features/performance/useBuiltCues";
import { useClipControls } from "@/features/performance/useClipControls";
import { useFletcherTracks } from "@/features/performance/useFletcherTracks";
import { useLoopSnapper } from "@/features/performance/useLoopSnapper";
import { useSyncTempo } from "@/features/performance/useSyncTempo";
import { useFollowPlayback } from "@/features/setlist/useFollowPlayback";
import { useSceneSelection } from "@/features/setlist/useSceneSelection";
import { useSnapSelection } from "@/features/setlist/useSnapSelection";
import { isHost } from "@/lib/osc/transport";

/** Host and followers: mirror Live's state and keep the selection on the playhead. */
function SharedControllers() {
  useLiveStateSync();
  useBeatClock();
  useFollowPlayback();
  useChartReadySync();
  return null;
}

/** Host only: everything that talks back to Live or to the band. */
function HostControllers() {
  useLiveSetFile();
  useBroadcastHeartbeat();

  useSyncTempo();
  useBuiltCues();
  useAutoStop();
  useLoopSnapper();
  useClipControls();
  useFletcherTracks();
  useSnapSelection();
  useSceneSelection();

  // Last, so every listener above is subscribed before Live starts replying.
  useLiveListeners();
  return null;
}

export function Controllers() {
  return (
    <>
      <SharedControllers />
      {isHost && <HostControllers />}
    </>
  );
}
