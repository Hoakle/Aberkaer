import { useEffect, useRef, useState } from 'react'
import { useBroadcastReceiver, useBroadcastSender } from '../hooks/useBroadcast'
import { useGMStore } from '../store/gmStore'
import type { PlayerDisplay } from '../types'

// Sans message du MJ pendant ce délai, l'indicateur repasse au gris
// (le heartbeat MJ est émis toutes les 5 s).
const CONNECTION_TIMEOUT_MS = 15000

export default function PlayerView() {
  const storeDisplay = useGMStore((s) => s.display)
  const [display, setDisplay] = useState<PlayerDisplay>(storeDisplay)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [audioReady, setAudioReady] = useState(false)
  const [audioBlocked, setAudioBlocked] = useState(false)
  const [imageError, setImageError] = useState(false)
  const [connected, setConnected] = useState(false)
  const connectionTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const send = useBroadcastSender()

  const markConnected = () => {
    setConnected(true)
    if (connectionTimer.current) clearTimeout(connectionTimer.current)
    connectionTimer.current = setTimeout(() => setConnected(false), CONNECTION_TIMEOUT_MS)
  }

  // Receive updates from GM tab
  useBroadcastReceiver((msg) => {
    if (msg.type === 'DISPLAY_UPDATE') {
      setDisplay((prev) => ({ ...prev, ...msg.payload }))
    }
    markConnected()
  })

  // On opening (or reload), ask the GM view for the current state
  useEffect(() => {
    send({ type: 'SYNC_REQUEST' })
    return () => {
      if (connectionTimer.current) clearTimeout(connectionTimer.current)
    }
  }, [send])

  // Reset image error state when the image changes
  useEffect(() => {
    setImageError(false)
  }, [display.imageUrl])

  // Sync audio element when audioUrl changes
  useEffect(() => {
    if (!display.audioUrl) return
    if (!audioRef.current) {
      audioRef.current = new Audio()
      audioRef.current.loop = true
    }
    if (audioRef.current.src !== display.audioUrl) {
      audioRef.current.src = display.audioUrl
      setAudioReady(false)
      audioRef.current.oncanplay = () => setAudioReady(true)
    }
  }, [display.audioUrl])

  const tryPlay = () => {
    audioRef.current
      ?.play()
      .then(() => setAudioBlocked(false))
      .catch(() => setAudioBlocked(true))
  }

  // Play/pause
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    if (display.audioPlaying) {
      tryPlay()
    } else {
      audio.pause()
    }
  }, [display.audioPlaying, audioReady])

  // Volume
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = display.audioVolume
    }
  }, [display.audioVolume])

  // Cleanup
  useEffect(() => {
    return () => {
      audioRef.current?.pause()
    }
  }, [])

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black flex items-center justify-center select-none">
      {/* Background image */}
      {display.imageUrl && !imageError ? (
        <img
          src={display.imageUrl}
          alt=""
          onError={() => setImageError(true)}
          className="absolute inset-0 w-full h-full object-cover transition-opacity duration-1000"
          key={display.imageUrl}
        />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
          <div className="text-4xl tracking-[0.3em] text-stone-700 font-light uppercase">Aberkaer</div>
          <div className="text-stone-800 text-sm">
            {imageError ? 'Image indisponible' : 'En attente du Maître de Jeu...'}
          </div>
        </div>
      )}

      {/* Vignette overlay */}
      <div className="absolute inset-0 bg-radial from-transparent from-40% to-black/70 pointer-events-none" />

      {/* Caption (top left) */}
      {display.caption && (
        <div className="absolute top-6 left-6 bg-black/50 backdrop-blur-sm px-4 py-1.5 rounded text-stone-300 text-sm border border-white/10">
          {display.caption}
        </div>
      )}

      {/* Overlay narrative text (bottom center) */}
      {display.showOverlay && display.overlayText && (
        <div className="absolute bottom-0 left-0 right-0 px-8 py-8 text-center">
          <p className="inline-block bg-black/65 backdrop-blur-sm text-stone-100 text-lg leading-relaxed px-8 py-4 rounded border border-white/10 italic max-w-3xl">
            {display.overlayText}
          </p>
        </div>
      )}

      {/* Autoplay blocked: one tap unlocks audio for the rest of the session */}
      {audioBlocked && display.audioPlaying && display.audioUrl && (
        <button
          onClick={tryPlay}
          className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/70 backdrop-blur-sm border border-amber-800/60 text-amber-300 px-5 py-2.5 rounded-full text-sm hover:bg-black/90 transition-colors"
        >
          🔊 Toucher pour activer le son
        </button>
      )}

      {/* Audio indicator (bottom right, subtle) */}
      {display.audioPlaying && display.audioUrl && !audioBlocked && (
        <div className="absolute bottom-4 right-5 flex items-center gap-1.5 opacity-30">
          <AudioBars />
        </div>
      )}

      {/* Connection status (top right, very subtle) */}
      <div className={`absolute top-4 right-4 w-1.5 h-1.5 rounded-full transition-colors ${connected ? 'bg-green-500' : 'bg-stone-700'}`} />
    </div>
  )
}

function AudioBars() {
  return (
    <div className="flex items-end gap-0.5 h-4">
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="w-1 bg-white rounded-full animate-pulse"
          style={{ height: `${Math.random() * 60 + 40}%`, animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </div>
  )
}
