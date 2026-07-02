import { useCallback, useEffect, useRef } from 'react'
import type { BroadcastMessage } from '../types'

const CHANNEL = 'aberkaer-table'

export function useBroadcastSender() {
  const channel = useRef<BroadcastChannel | null>(null)

  useEffect(() => {
    return () => {
      channel.current?.close()
      channel.current = null
    }
  }, [])

  // Canal créé paresseusement : un send() au montage (ex. SYNC_REQUEST)
  // fonctionne sans attendre le passage de l'effet.
  return useCallback((msg: BroadcastMessage) => {
    if (!channel.current) channel.current = new BroadcastChannel(CHANNEL)
    channel.current.postMessage(msg)
  }, [])
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
