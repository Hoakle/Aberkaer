import { useCallback, useEffect } from 'react'
import { useGMStore } from '../store/gmStore'
import { usePushDisplay } from './useTableSync'
import type { PlayerDisplay } from '../types'

// Joue la scène N de la file : image + légende + texte, et lance
// l'ambiance si la scène en définit une (sinon l'ambiance en cours continue).
export function useScenePlayer() {
  const pushDisplay = usePushDisplay()

  return useCallback(
    (index: number): boolean => {
      const s = useGMStore.getState()
      const scene = s.scenes[index]
      if (!scene) return false
      s.setSceneIndex(index)
      const patch: Partial<PlayerDisplay> = {
        imageUrl: scene.imageUrl,
        caption: scene.caption,
        overlayText: scene.overlayText,
        showOverlay: Boolean(scene.overlayText),
        curtain: false,
        ...(scene.audioUrl ? { audioUrl: scene.audioUrl, audioPlaying: true } : {}),
      }
      s.updateDisplay(patch)
      pushDisplay(patch)
      return true
    },
    [pushDisplay]
  )
}

// Raccourcis clavier de l'écran MJ (inactifs dans les champs de saisie) :
//   B      → rideau (coupe image + son)
//   Espace → play/pause de l'ambiance
//   → / ←  → scène suivante / précédente de la file
//   1 à 9  → jouer directement la scène N
export function useGMShortcuts() {
  const pushDisplay = usePushDisplay()
  const playScene = useScenePlayer()

  useEffect(() => {
    const push = (patch: Partial<PlayerDisplay>) => {
      useGMStore.getState().updateDisplay(patch)
      pushDisplay(patch)
    }

    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return
      const target = e.target as HTMLElement
      if (target.closest('input, textarea, select, [contenteditable="true"]')) return

      const s = useGMStore.getState()
      if (e.key === 'b' || e.key === 'B') {
        e.preventDefault()
        push({ curtain: !s.display.curtain })
      } else if (e.key === ' ') {
        // Espace active aussi les boutons focus — on ne le vole pas dans ce cas.
        if (target.closest('button, a')) return
        e.preventDefault()
        push({ audioPlaying: !s.display.audioPlaying })
      } else if (e.key === 'ArrowRight') {
        if (playScene(Math.min(s.scenes.length - 1, s.sceneIndex + 1))) e.preventDefault()
      } else if (e.key === 'ArrowLeft') {
        if (playScene(Math.max(0, s.sceneIndex - 1))) e.preventDefault()
      } else if (/^[1-9]$/.test(e.key)) {
        if (playScene(Number(e.key) - 1)) e.preventDefault()
      }
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [pushDisplay, playScene])
}
