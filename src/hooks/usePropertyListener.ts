import {useEffect} from "react";
import {sendOsc, useOscListener} from "@/hooks/useOsc.ts";
import {parseOscPayload} from "@/utils/parse-osc-payload.ts";

export const usePropertyListener = <T extends Array<unknown>>(listenAddress: string, receiveAddress: string, callback: (newValue: T) => void) => {

    useEffect(() => {
      sendOsc(listenAddress, []);
    }, []);

  const handleMessage = (msg: { address: string; args: string[] }) => {
    if (msg.address !== receiveAddress) return;
    const payload = parseOscPayload<T>(msg.args)

    callback(payload)
  };

  useOscListener(handleMessage);

}