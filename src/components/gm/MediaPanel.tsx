import { useEffect, useRef, useState } from 'react'
import { useGMStore } from '../../store/gmStore'
import { usePushDisplay } from '../../hooks/useTableSync'
import { uid } from '../../utils/uid'
import type { PlayerDisplay } from '../../types'

interface MediaItem {
  name: string
  url: string
  kind: 'image' | 'audio'
  size: number
}

const prettyName = (name: string) => name.replace(/\.[^.]+$/, '')
const prettySize = (size: number) =>
  size > 1_000_000 ? `${(size / 1_000_000).toFixed(1)} Mo` : `${Math.round(size / 1000)} ko`

// Bibliothèque locale : les images et sons vivent dans media/ sur la machine
// du MJ — aucune dépendance à internet pendant la partie.
export default function MediaPanel() {
  const [items, setItems] = useState<MediaItem[]>([])
  const [serverDown, setServerDown] = useState(false)
  const [filter, setFilter] = useState('')
  const [uploading, setUploading] = useState(false)
  const fileInput = useRef<HTMLInputElement | null>(null)
  const pushDisplay = usePushDisplay()

  const push = (patch: Partial<PlayerDisplay>) => {
    useGMStore.getState().updateDisplay(patch)
    pushDisplay(patch)
  }

  const refresh = () =>
    fetch('/api/media')
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((list: MediaItem[]) => {
        setItems(list)
        setServerDown(false)
      })
      .catch(() => setServerDown(true))

  useEffect(() => {
    void refresh()
  }, [])

  const upload = async (files: FileList) => {
    setUploading(true)
    for (const file of Array.from(files)) {
      await fetch(`/api/media?name=${encodeURIComponent(file.name)}`, {
        method: 'POST',
        body: file,
      }).catch(() => {})
    }
    setUploading(false)
    void refresh()
  }

  const remove = async (item: MediaItem) => {
    if (!window.confirm(`Supprimer « ${item.name} » de la bibliothèque ?`)) return
    await fetch(`/api/media/${encodeURIComponent(item.name)}`, { method: 'DELETE' }).catch(() => {})
    void refresh()
  }

  const visible = items.filter((i) => i.name.toLowerCase().includes(filter.toLowerCase()))
  const images = visible.filter((i) => i.kind === 'image')
  const audios = visible.filter((i) => i.kind === 'audio')

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => fileInput.current?.click()}
          disabled={uploading}
          className="px-3 py-1.5 rounded bg-amber-900/40 hover:bg-amber-800/50 disabled:opacity-50 text-amber-300 text-sm font-medium border border-amber-800/40 transition-colors"
        >
          {uploading ? 'Envoi en cours...' : '⬆ Ajouter des fichiers'}
        </button>
        <input
          ref={fileInput}
          type="file"
          multiple
          accept="image/*,audio/*"
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) void upload(e.target.files)
            e.target.value = ''
          }}
        />
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filtrer..."
          aria-label="Filtrer les médias"
          className="flex-1 min-w-40 max-w-60 bg-stone-900 border border-stone-700 rounded px-3 py-1.5 text-sm text-stone-100 focus:outline-none focus:border-amber-600"
        />
        <span className="text-xs text-stone-500">{items.length} fichier(s) dans media/</span>
      </div>

      {serverDown && (
        <p className="text-sm text-red-400">
          ⚠ Bibliothèque indisponible — le serveur local ne répond pas.
        </p>
      )}

      {/* Images */}
      <section className="flex flex-col gap-2">
        <p className="text-xs font-medium text-stone-400 uppercase tracking-wider">Images ({images.length})</p>
        {images.length === 0 && <p className="text-xs text-stone-600">Aucune image. Ajoute tes illustrations de scènes, portraits, lieux…</p>}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {images.map((item) => (
            <div key={item.name} className="rounded border border-stone-800 bg-stone-900/60 overflow-hidden flex flex-col">
              <img src={item.url} alt={item.name} loading="lazy" className="h-24 w-full object-cover" />
              <div className="p-1.5 flex flex-col gap-1">
                <p className="text-xs text-stone-300 truncate" title={item.name}>{prettyName(item.name)}</p>
                <div className="flex gap-1">
                  <button
                    onClick={() => push({ imageUrl: item.url, caption: prettyName(item.name) })}
                    title={`Afficher ${item.name} aux joueurs`}
                    className="flex-1 px-1.5 py-1 rounded bg-stone-800 hover:bg-stone-700 border border-stone-700 text-stone-300 text-xs transition-colors"
                  >
                    🖥 Afficher
                  </button>
                  <button
                    onClick={() => remove(item)}
                    title={`Supprimer ${item.name}`}
                    className="px-1.5 py-1 rounded bg-black/20 hover:bg-red-900/60 text-stone-500 text-xs transition-colors"
                  >
                    ×
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Audio */}
      <section className="flex flex-col gap-2">
        <p className="text-xs font-medium text-stone-400 uppercase tracking-wider">Sons ({audios.length})</p>
        {audios.length === 0 && (
          <p className="text-xs text-stone-600">
            Aucun son. « Ambiance » joue en boucle avec fondu enchaîné, « Effet » se joue une fois
            par-dessus (tonnerre, cloche, porte…).
          </p>
        )}
        <div className="flex flex-col gap-1">
          {audios.map((item) => (
            <div key={item.name} className="flex items-center gap-2 rounded border border-stone-800 bg-stone-900/50 px-2 py-1.5">
              <span className="text-sm text-stone-300 flex-1 truncate" title={item.name}>
                🎵 {prettyName(item.name)}
              </span>
              <span className="text-xs text-stone-600">{prettySize(item.size)}</span>
              <button
                onClick={() => push({ audioUrl: item.url, audioPlaying: true })}
                title={`Jouer ${item.name} en ambiance`}
                className="px-2 py-1 rounded bg-green-950/60 hover:bg-green-900/60 border border-green-900/50 text-green-300 text-xs transition-colors"
              >
                ▶ Ambiance
              </button>
              <button
                onClick={() => push({ sfx: { id: uid(), url: item.url } })}
                title={`Jouer ${item.name} en effet one-shot`}
                className="px-2 py-1 rounded bg-purple-950/60 hover:bg-purple-900/60 border border-purple-900/50 text-purple-300 text-xs transition-colors"
              >
                💥 Effet
              </button>
              <button
                onClick={() => remove(item)}
                title={`Supprimer ${item.name}`}
                className="px-2 py-1 rounded bg-black/20 hover:bg-red-900/60 text-stone-500 text-xs transition-colors"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
