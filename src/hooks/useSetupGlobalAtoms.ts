import {sendOsc, useOscListener} from "@/hooks/useOsc.ts";
import {OscMessage} from "osc";
import {useEffect} from "react";
import {parseOscPayload} from "@/utils/parse-osc-payload.ts";
import {useSetAtom} from "jotai";
import {globalTimeSignatureAtom, timeSignatureChangesAtom} from "@/stores/store.ts";
import {loadAls} from "@/utils/parse-als.ts";
import {parseTimeSignatureEvents} from "@/utils/parse-time-signature-events.ts";

export const useSetupGlobalAtoms = () => {

  const setGlobalTimeSignature = useSetAtom(globalTimeSignatureAtom)
  // const setFilePath = useSetAtom(filePathAtom)
  const setTimeSignatureChanges = useSetAtom(timeSignatureChangesAtom)

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
        const filePath = payload[0] as string
        const xml = await loadAls(filePath)
        //Ableton.LiveSet.MainTrack.AutomationEnvelopes.Envelopes.AutomationEnvelope[0].Automation.Events.EnumEvent
        const timeSignatureEvents = xml.Ableton.LiveSet.MainTrack.AutomationEnvelopes.Envelopes.AutomationEnvelope[0].Automation.Events.EnumEvent
        const result = parseTimeSignatureEvents(timeSignatureEvents.map
          ((event: any) => ({value: event["@_Value"], time: event["@_Time"]}))
        ).sort((a, b) => a.time - b.time)
        setTimeSignatureChanges(result)

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