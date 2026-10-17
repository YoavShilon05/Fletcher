import { useSetAtom } from "jotai";
import { BROADCAST } from "@/lib/osc/addresses";
import { useOscMessage } from "@/lib/osc/useOscMessage";
import { chartReadyTickAtom } from "./atoms";

/** Follower: re-resolve charts whenever the host announces a freshly baked one. */
export function useChartReadySync() {
  const bumpChartReady = useSetAtom(chartReadyTickAtom);
  useOscMessage(BROADCAST.chartReady, () => bumpChartReady((tick) => tick + 1));
}
