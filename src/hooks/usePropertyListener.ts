import {useEffect} from "react";
import {sendOsc, useOscListener} from "@/hooks/useOsc.ts";
import {parseOscPayload} from "@/utils/parse-osc-payload.ts";
import {OscMessage} from "osc";

export const usePropertyListener = <T extends Array<unknown>>(listenAddress: string | null, receiveAddress: string, callback: (newValue: T) => void) => {

    useEffect(() => {
      if (listenAddress)
        sendOsc(listenAddress, []);
    }, []);

  const handleMessage = (msg: OscMessage) => {
    if (msg.address !== receiveAddress) return;
    const payload = parseOscPayload<T>(msg.args)

    callback(payload)
  };

  useOscListener(handleMessage);

}