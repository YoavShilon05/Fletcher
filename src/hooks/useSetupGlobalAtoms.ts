import {sendOsc, useOscListener} from "@/hooks/useOsc.ts";
import {OscMessage} from "osc";
import {useEffect} from "react";
import {parseOscPayload} from "@/utils/parse-osc-payload.ts";
import {useSetAtom} from "jotai";
import {globalTimeSignatureAtom} from "@/stores/store.ts";

export const useSetupGlobalAtoms = () => {

  const setGlobalTimeSignature = useSetAtom(globalTimeSignatureAtom)

  const handleSetupMessages = async (msg: OscMessage) => {

    const payload = parseOscPayload<(string | number)[]>(msg.args)
    switch (msg.address) {
      case "/live/song/get/signature_numerator":
        setGlobalTimeSignature(prev => ({...prev, numerator: payload[0] as number}))
        break;
      case "/live/song/get/signature_denominator":
        setGlobalTimeSignature(prev => ({...prev, denominator: payload[0] as number}))
        break;
      case "/live/song/get/file_path":
        console.log("GOT SOMETHING BIATVH", payload)
        break;
    }
  }
  useOscListener(handleSetupMessages)

  useEffect(() => {
    sendOsc("/live/song/get/signature_numerator", [])
    sendOsc("/live/song/get/signature_denominator", [])
    sendOsc("/live/song/get/file_path", [])
  }, []);
}