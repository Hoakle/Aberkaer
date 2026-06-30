import { useEffect, useRef, useState } from 'react'
import { useBroadcastReceiver } from '../hooks/useBroadcast'
import { useGMStore } from '../store/gmStore'
import type { PlayerDisplay } from '../types'

export default function PlayerView() {
  const storeDisplay = useGMStore((s) => s.display)
  const [display, setDisplay] = useState<PlayerDisplay>(storeDisplay)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [audioReady, setAudioReady] = useState(false)
  const [connected, setConnected] = useState(false)

  // Receive updates from GM tab
  useBroadcastReceiver((msg) => {
    if (msg.type === 'DISPLAY_UPDATE') {
      setDisplay((prev) => ({ ...prev, ...msg.payload }))
      setConnected(true)
    } else if (msg.type === 'PING') {
      setConnected(true)
    }
  })

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

  // Play/pause
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    if (display.audioPlaying) {
      audio.play().catch(() => {})
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
      {display.imageUrl ? (
        <img
          src={display.imageUrl}
          alt=""
          className="absolute inset-0 w-full h-full object-cover transition-opacity duration-1000"
          key={display.imageUrl}
        />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
          <div className="text-4xl tracking-[0.3em] text-stone-700 font-light uppercase">Aberkaer</div>
          <div className="text-stone-800 text-sm">En attente du Maître de Jeu...</div>
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

      {/* Audio indicator (bottom right, subtle) */}
      {display.audioPlaying && display.audioUrl && (
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
