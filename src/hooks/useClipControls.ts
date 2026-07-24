import {useEffect} from "react";
import {sendOsc, useOscListener} from "@/hooks/useOsc.ts";
import {OscMessage} from "osc";
import {parseOscPayload} from "@/utils/parse-osc-payload.ts";

export const useClipControls = () => {

  const handleMessage = (msg: OscMessage) => {
    if (msg.address !== "/live/clip_slot/get/is_triggered") return;
    const payload = parseOscPayload<boolean[]>(msg.args)
    console.log("FIRE", payload)
  }

  useOscListener(handleMessage);

  useEffect(() => {
    sendOsc("/live/clip_slot/start_listen/is_triggered", [0, 0])
  }, []);


}