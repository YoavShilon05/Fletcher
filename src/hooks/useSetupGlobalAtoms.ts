import {broadcast, isTauri, sendOsc, useOscListener} from "@/hooks/useOsc.ts";
import {OscMessage} from "osc";
import {useEffect} from "react";
import {parseOscPayload} from "@/utils/parse-osc-payload.ts";
import {useSetAtom} from "jotai";
import {filePathAtom, globalTempoAtom, globalTimeSignatureAtom, timeSignatureChangesAtom} from "@/stores/store.ts";
import {loadAls} from "@/utils/parse-als.ts";
import {parseTimeSignatureEvents} from "@/utils/parse-time-signature-events.ts";
import {usePropertyListener} from "@/hooks/usePropertyListener.ts";
import {TimeSignatureChangeEvent} from "@/interfaces/time-signature.ts";

export const useSetupGlobalAtoms = () => {

  const setGlobalTimeSignature = useSetAtom(globalTimeSignatureAtom)
  const setFilePath = useSetAtom(filePathAtom)
  const setTimeSignatureChanges = useSetAtom(timeSignatureChangesAtom)
  const setGlobalTempo = useSetAtom(globalTempoAtom)

  const handleSetupMessages = async (msg: OscMessage) => {

    const payload = parseOscPayload<(string | number)[]>(msg.args)
    switch (msg.address) {
      case "/live/song/get/tempo":
        setGlobalTempo(payload[0] as number)
        break;

      case "/live/song/get/signature_numerator":
        setGlobalTimeSignature(prev => ({...prev, numerator: payload[0] as number}))
        break;
      case "/live/song/get/signature_denominator":
        setGlobalTimeSignature(prev => ({...prev, denominator: payload[0] as number}))
        break;
      case "/live/song/get/file_path":
        if (!isTauri) break;
        const filePath = payload[0] as string
        setFilePath(filePath)
        const xml = await loadAls(filePath)
        //Ableton.LiveSet.MainTrack.AutomationEnvelopes.Envelopes.AutomationEnvelope[0].Automation.Events.EnumEvent
        const timeSignatureEvents = xml.Ableton.LiveSet.MainTrack.AutomationEnvelopes.Envelopes.AutomationEnvelope[0].Automation.Events.EnumEvent
        const events = parseTimeSignatureEvents(timeSignatureEvents.map
          ((event: any) => ({value: event["@_Value"], time: event["@_Time"]}))
        ).sort((a, b) => a.time - b.time)

        const broadcastPayload = events.flatMap(({ time, timeSignature }) => [
          time,
          timeSignature.numerator,
          timeSignature.denominator,
        ]);

        broadcast("/broadcast/time_signature_events", broadcastPayload);
        setTimeSignatureChanges(events);

        break;
    }
  }
  useOscListener(handleSetupMessages)

  usePropertyListener(null, "/broadcast/time_signature_events", (payload: number[]) => {
    const events: TimeSignatureChangeEvent[] = [];

    for (let i = 0; i < payload.length; i += 3) {
      events.push({
        time: payload[i],
        timeSignature: {
          numerator: payload[i + 1],
          denominator: payload[i + 2],
        },
      });
    }

    setTimeSignatureChanges(events)
  });

  useEffect(() => {
    sendOsc("/live/song/get/signature_numerator", [])
    sendOsc("/live/song/get/signature_denominator", [])
    sendOsc("/live/song/get/file_path", [])
    sendOsc("/live/song/get/tempo", [])
  }, []);
}