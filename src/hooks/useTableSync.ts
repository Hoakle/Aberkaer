import { useCallback, useEffect, useRef, useState } from 'react'
import { useBroadcastReceiver, useBroadcastSender } from './useBroadcast'
import type { BroadcastMessage, PlayerDisplay } from '../types'

// Sans message (serveur ou MJ) pendant ce délai, l'indicateur repasse au gris
// (les heartbeats sont émis toutes les 5 s).
const CONNECTION_TIMEOUT_MS = 15000

// Côté MJ : pousse un patch d'affichage vers tous les écrans joueurs.
// Voie principale : le serveur local (SSE) → fonctionne sur TV/tablette/téléphone.
// Repli : BroadcastChannel → onglets du même navigateur, même sans serveur.
export function usePushDisplay() {
  const send = useBroadcastSender()
  return useCallback(
    (patch: Partial<PlayerDisplay>) => {
      send({ type: 'DISPLAY_UPDATE', payload: patch })
      void fetch('/api/display', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      }).catch(() => {})
    },
    [send]
  )
}

// Côté MJ, au montage : adopte l'état d'affichage que le serveur tient en
// mémoire, pour qu'un rechargement de l'écran MJ ne désynchronise pas la table.
export function useAdoptServerDisplay(onState: (state: Partial<PlayerDisplay>) => void) {
  const handlerRef = useRef(onState)
  handlerRef.current = onState

  useEffect(() => {
    let cancelled = false
    fetch('/api/display')
      .then((res) => (res.ok ? res.json() : null))
      .then((state) => {
        if (!cancelled && state && typeof state === 'object') handlerRef.current(state)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])
}

// Côté joueurs : reçoit les mises à jour via SSE et BroadcastChannel
// (recevoir un même patch par les deux voies est sans effet : c'est un merge).
// Retourne l'état de connexion.
export function usePlayerSync(onMessage: (msg: BroadcastMessage) => void): boolean {
  const [connected, setConnected] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const handlerRef = useRef(onMessage)
  handlerRef.current = onMessage
  const send = useBroadcastSender()

  const markConnected = useCallback(() => {
    setConnected(true)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setConnected(false), CONNECTION_TIMEOUT_MS)
  }, [])

  useBroadcastReceiver((msg) => {
    handlerRef.current(msg)
    markConnected()
  })

  useEffect(() => {
    // Repli même navigateur : demande l'état courant aux onglets MJ.
    send({ type: 'SYNC_REQUEST' })

    // Voie serveur : EventSource se reconnecte tout seul en cas de coupure.
    const es = new EventSource('/api/events')
    es.onmessage = (e) => {
      let msg: BroadcastMessage
      try {
        msg = JSON.parse(e.data)
      } catch {
        return
      }
      handlerRef.current(msg)
      markConnected()
    }
    es.onerror = () => setConnected(false)

    return () => {
      es.close()
      if (timer.current) clearTimeout(timer.current)
    }
  }, [send, markConnected])

  return connected
}
