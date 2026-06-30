import { useEffect, useRef } from 'react'
import type { BroadcastMessage } from '../types'

const CHANNEL = 'aberkaer-table'

export function useBroadcastSender() {
  const channel = useRef<BroadcastChannel | null>(null)

  useEffect(() => {
    channel.current = new BroadcastChannel(CHANNEL)
    return () => channel.current?.close()
  }, [])

  const send = (msg: BroadcastMessage) => {
    channel.current?.postMessage(msg)
  }

  return send
}

export function useBroadcastReceiver(onMessage: (msg: BroadcastMessage) => void) {
  const handlerRef = useRef(onMessage)
  handlerRef.current = onMessage

  useEffect(() => {
    const ch = new BroadcastChannel(CHANNEL)
    ch.onmessage = (e) => handlerRef.current(e.data as BroadcastMessage)
    return () => ch.close()
  }, [])
}
