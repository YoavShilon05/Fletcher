import {useCallback, useEffect, useRef} from "react";
import {BROADCAST_HEARTBEAT_ADDRESS, BROADCAST_HEARTBEAT_TIMEOUT} from "@/constants.ts";
import {broadcast} from "@/hooks/useOsc.ts";


export const useBroadcastHeartbeat = () => {

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const broadcastHeartbeat = useCallback(() => {
    broadcast(BROADCAST_HEARTBEAT_ADDRESS, [Date.now()])

    const msUntilNextBroadcast = BROADCAST_HEARTBEAT_TIMEOUT - Date.now() % BROADCAST_HEARTBEAT_TIMEOUT;

    timeoutRef.current = setTimeout(broadcastHeartbeat, msUntilNextBroadcast);
  }, [])

  useEffect(() => {
    broadcastHeartbeat()
  }, []);
}