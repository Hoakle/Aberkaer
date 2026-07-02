import { useEffect, useRef, useState } from 'react'
import { usePlayerSync } from '../hooks/useTableSync'
import { useGMStore } from '../store/gmStore'
import { fmtMod } from '../game/rules'
import type { PlayerDisplay, RollResult } from '../types'

export default function PlayerView() {
  const storeDisplay = useGMStore((s) => s.display)
  const [display, setDisplay] = useState<PlayerDisplay>(storeDisplay)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [audioReady, setAudioReady] = useState(false)
  const [audioBlocked, setAudioBlocked] = useState(false)
  const [imageError, setImageError] = useState(false)

  // Réception des mises à jour : serveur local (multi-appareils) +
  // BroadcastChannel (repli même navigateur).
  const connected = usePlayerSync((msg) => {
    if (msg.type === 'DISPLAY_UPDATE') {
      setDisplay((prev) => ({ ...prev, ...msg.payload }))
    }
  })

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

  const showImage = Boolean(display.imageUrl) && !imageError

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black flex items-center justify-center select-none">
      {/* Background image, avec fondu au noir entre deux scènes */}
      <FadeImage url={showImage ? display.imageUrl : ''} onError={() => setImageError(true)} />
      {!showImage && (
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

      {/* Horloges de campagne (top right, under the connection dot) */}
      {display.clocks?.length > 0 && (
        <div className="absolute top-6 right-6 flex flex-col items-end gap-1.5">
          {display.clocks.map((clock) => (
            <div
              key={clock.label}
              className="bg-black/50 backdrop-blur-sm px-3 py-1 rounded border border-amber-900/40 text-amber-200/90 text-sm"
            >
              {clock.label} — <span className="font-semibold">J-{clock.value}</span>
            </div>
          ))}
        </div>
      )}

      {/* Jet de dés (animation centrale) */}
      {display.lastRoll && <RollOverlay roll={display.lastRoll} />}

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

// Fondu au noir : l'image courante s'éteint (500 ms), puis la nouvelle
// s'allume une fois chargée. `url` vide = simple fondu vers le noir.
function FadeImage({ url, onError }: { url: string; onError: () => void }) {
  const [src, setSrc] = useState(url)
  const [visible, setVisible] = useState(Boolean(url))

  useEffect(() => {
    if (url === src) return
    setVisible(false)
    const t = setTimeout(() => setSrc(url), 500)
    return () => clearTimeout(t)
  }, [url, src])

  if (!src) return null
  return (
    <img
      src={src}
      alt=""
      onLoad={() => {
        if (src === url) setVisible(true)
      }}
      onError={onError}
      className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
    />
  )
}

const ROLL_STYLE: Record<RollResult['outcome'], { label: string; cls: string; ring: string }> = {
  crit: { label: '✨ Critique !', cls: 'text-amber-300', ring: 'border-amber-500/70' },
  fumble: { label: '💀 Échec critique !', cls: 'text-red-500', ring: 'border-red-700/70' },
  success: { label: 'Réussite', cls: 'text-green-400', ring: 'border-green-700/70' },
  failure: { label: 'Échec', cls: 'text-red-400', ring: 'border-red-800/70' },
  open: { label: '', cls: 'text-stone-200', ring: 'border-stone-600/70' },
}

// Le jet du MJ apparaît au centre de l'écran quelques secondes puis s'efface.
function RollOverlay({ roll }: { roll: RollResult }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    setVisible(true)
    const t = setTimeout(() => setVisible(false), 6000)
    return () => clearTimeout(t)
  }, [roll.id])

  const style = ROLL_STYLE[roll.outcome]
  return (
    <div
      className={`absolute inset-0 flex items-center justify-center pointer-events-none transition-opacity duration-700 ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <div
        key={roll.id}
        className={`animate-roll-pop bg-black/75 backdrop-blur-md border-2 ${style.ring} rounded-xl px-10 py-6 text-center`}
      >
        <p className="text-stone-400 text-sm mb-1">{roll.title}</p>
        <p className="text-7xl font-bold text-stone-50 leading-none">{roll.total}</p>
        <p className="text-stone-500 text-sm mt-2">d20 : {roll.die} {fmtMod(roll.bonus)}</p>
        {style.label && <p className={`text-xl font-semibold mt-1 ${style.cls}`}>{style.label}</p>}
      </div>
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
