import { useState, useEffect, useRef } from "react"
import {sendOsc, useOscListener} from "@/hooks/useOsc.ts";
import {OscMessage} from "osc";
import {DEATH_TIMEOUT, PING_INTERVAL} from "@/constants.ts";

export const useAbletonHeartbeat = () => {
  const [isConnected, setIsConnected] = useState(false)
  const pingTimerRef = useRef<NodeJS.Timeout | null>(null)
  const deathTimerRef = useRef<NodeJS.Timeout | null>(null)

  const receiveConnectedMessages = (msg: OscMessage) => {
    if (msg.address !== "/live/test" && msg.address !== "/live/startup") return;
    if (deathTimerRef.current) clearTimeout(deathTimerRef.current)
    setIsConnected(true)
  }

  const checkHeartbeat = () => {
    sendOsc("/live/test", [])

    deathTimerRef.current = setTimeout(() => {
      setIsConnected(false)
    }, DEATH_TIMEOUT)

  }

  useEffect(() => {
    checkHeartbeat()
    pingTimerRef.current = setInterval(() => {
      checkHeartbeat()
    }, PING_INTERVAL)

    return () => {
      if (pingTimerRef.current) clearInterval(pingTimerRef.current)
      if (deathTimerRef.current) clearTimeout(deathTimerRef.current)
    }
  }, [])

  useOscListener(receiveConnectedMessages)

  return isConnected
}