import { useEffect, useRef, useState } from 'react'

const CROSSFADE_MS = 1200
const FADE_STEP_MS = 50

// Deux couches audio côté joueurs : une ambiance en boucle (avec fondu
// enchaîné quand elle change) et des effets one-shot par-dessus.
// Gère aussi le blocage d'autoplay : `blocked` passe à true tant que le
// navigateur exige une interaction, `unlock()` relance après un toucher.
export function useAudioLayers(
  url: string,
  playing: boolean,
  volume: number,
  sfx: { id: string; url: string } | null
) {
  const current = useRef<HTMLAudioElement | null>(null)
  const currentUrl = useRef('')
  const fadeTimer = useRef<ReturnType<typeof setInterval> | null>(null)
  const lastSfxId = useRef('')
  const [blocked, setBlocked] = useState(false)
  const volumeRef = useRef(volume)
  volumeRef.current = volume

  const stopFade = () => {
    if (fadeTimer.current) {
      clearInterval(fadeTimer.current)
      fadeTimer.current = null
    }
  }

  const startAmbience = (nextUrl: string) => {
    const next = new Audio(nextUrl)
    next.loop = true
    next.volume = 0
    const prev = current.current
    current.current = next
    currentUrl.current = nextUrl
    next
      .play()
      .then(() => {
        setBlocked(false)
        stopFade()
        const t0 = Date.now()
        fadeTimer.current = setInterval(() => {
          const t = Math.min(1, (Date.now() - t0) / CROSSFADE_MS)
          next.volume = t * volumeRef.current
          if (prev) prev.volume = (1 - t) * volumeRef.current
          if (t >= 1) {
            stopFade()
            prev?.pause()
          }
        }, FADE_STEP_MS)
      })
      .catch(() => {
        prev?.pause()
        setBlocked(true)
      })
  }

  // Ambiance : réagit aux changements d'URL et de lecture
  useEffect(() => {
    if (!playing || !url) {
      stopFade()
      current.current?.pause()
      return
    }
    if (url === currentUrl.current && current.current) {
      current.current.volume = volumeRef.current
      current.current
        .play()
        .then(() => setBlocked(false))
        .catch(() => setBlocked(true))
      return
    }
    startAmbience(url)
  }, [url, playing])

  // Volume (hors fondu en cours)
  useEffect(() => {
    if (current.current && !fadeTimer.current) current.current.volume = volume
  }, [volume])

  // Effets one-shot : un nouvel id = une lecture
  useEffect(() => {
    if (!sfx || sfx.id === lastSfxId.current) return
    lastSfxId.current = sfx.id
    const effect = new Audio(sfx.url)
    effect.volume = volumeRef.current
    effect.play().catch(() => setBlocked(true))
  }, [sfx])

  // Cleanup
  useEffect(
    () => () => {
      stopFade()
      current.current?.pause()
    },
    []
  )

  const unlock = () => {
    const el = current.current
    if (!el) {
      setBlocked(false)
      return
    }
    el.volume = volumeRef.current
    el.play()
      .then(() => setBlocked(false))
      .catch(() => setBlocked(true))
  }

  return { blocked, unlock }
}
