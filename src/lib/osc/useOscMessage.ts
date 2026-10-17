import { useEffect, useEffectEvent } from "react";
import { matchMessage, type OscMessageType } from "./message";
import { subscribeOsc } from "./transport";

/**
 * Call `handler` with the decoded payload of every incoming `type` message.
 * The handler always sees the latest props/state; the subscription itself is
 * made once per mount.
 */
export function useOscMessage<T>(type: OscMessageType<T>, handler: (payload: T) => void) {
  const onPayload = useEffectEvent(handler);

  useEffect(
    () =>
      subscribeOsc((raw) => {
        const payload = matchMessage(type, raw);
        if (payload !== undefined) onPayload(payload);
      }),
    [type],
  );
}
