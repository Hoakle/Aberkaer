import { useGMStore } from '../../store/gmStore'
import { usePushDisplay } from '../../hooks/useTableSync'
import PlayerAccess from './PlayerAccess'

const PRESET_IMAGES = [
  { label: 'Taverne', url: 'https://images.unsplash.com/photo-1547036967-23d11aacaee0?w=1920&q=80' },
  { label: 'Forêt', url: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=1920&q=80' },
  { label: 'Donjon', url: 'https://images.unsplash.com/photo-1518709766631-a6a7f45921c3?w=1920&q=80' },
  { label: 'Ville', url: 'https://images.unsplash.com/photo-1534430480872-3498386e7856?w=1920&q=80' },
]

const PRESET_AUDIO = [
  { label: 'Taverne', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' },
  { label: 'Combat', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3' },
  { label: 'Mystère', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3' },
]

export default function DisplayControl() {
  const { display, updateDisplay, npcs } = useGMStore()
  const pushDisplay = usePushDisplay()

  const push = (patch: Partial<typeof display>) => {
    updateDisplay(patch)
    pushDisplay(patch)
  }

  const pushNPC = (npc: { imageUrl: string; name: string; role: string }) => {
    push({
      imageUrl: npc.imageUrl,
      caption: `${npc.name} — ${npc.role}`,
      showOverlay: true,
      overlayText: '',
    })
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Preview */}
      <div className="relative w-full aspect-video rounded overflow-hidden border border-stone-700 bg-stone-950">
        {display.imageUrl ? (
          <img src={display.imageUrl} alt="preview" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-stone-600 text-sm">
            Aucune image affichée
          </div>
        )}
        {display.showOverlay && display.overlayText && (
          <div className="absolute bottom-0 left-0 right-0 bg-black/70 px-4 py-2 text-center text-sm">
            {display.overlayText}
          </div>
        )}
        {display.caption && (
          <div className="absolute top-2 left-2 bg-black/60 px-2 py-0.5 rounded text-xs text-stone-300">
            {display.caption}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Image controls */}
        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium text-stone-400 uppercase tracking-wider">Image</p>
          <input
            value={display.imageUrl}
            onChange={(e) => push({ imageUrl: e.target.value })}
            placeholder="URL de l'image..."
            className="bg-stone-900 border border-stone-700 rounded px-3 py-1.5 text-sm text-stone-100 focus:outline-none focus:border-amber-600"
          />
          <div className="flex flex-wrap gap-1">
            {PRESET_IMAGES.map((p) => (
              <button
                key={p.label}
                onClick={() => push({ imageUrl: p.url, caption: p.label })}
                className="px-2 py-1 rounded bg-stone-800 hover:bg-stone-700 text-xs text-stone-300 border border-stone-700 transition-colors"
              >
                {p.label}
              </button>
            ))}
            <button
              onClick={() => push({ imageUrl: '', caption: '' })}
              className="px-2 py-1 rounded bg-stone-900 hover:bg-stone-800 text-xs text-stone-500 border border-stone-800 transition-colors"
            >
              Vide
            </button>
          </div>

          {npcs.some((n) => n.imageUrl) && (
            <>
              <p className="text-xs text-stone-500 mt-1">Portraits de PNJ :</p>
              <div className="flex flex-wrap gap-1">
                {npcs.filter((n) => n.imageUrl).map((n) => (
                  <button
                    key={n.id}
                    onClick={() => pushNPC(n)}
                    className="px-2 py-1 rounded bg-amber-950/50 hover:bg-amber-900/50 text-xs text-amber-300 border border-amber-900/40 transition-colors"
                  >
                    {n.name}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Audio controls */}
        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium text-stone-400 uppercase tracking-wider">Ambiance sonore</p>
          <input
            value={display.audioUrl}
            onChange={(e) => push({ audioUrl: e.target.value })}
            placeholder="URL audio (MP3, OGG...)"
            className="bg-stone-900 border border-stone-700 rounded px-3 py-1.5 text-sm text-stone-100 focus:outline-none focus:border-amber-600"
          />
          <div className="flex flex-wrap gap-1">
            {PRESET_AUDIO.map((p) => (
              <button
                key={p.label}
                onClick={() => push({ audioUrl: p.url })}
                className="px-2 py-1 rounded bg-stone-800 hover:bg-stone-700 text-xs text-stone-300 border border-stone-700 transition-colors"
              >
                {p.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3 mt-1">
            <button
              onClick={() => push({ audioPlaying: !display.audioPlaying })}
              className={`px-4 py-1.5 rounded text-sm font-medium transition-colors border ${
                display.audioPlaying
                  ? 'bg-red-950/60 border-red-900/50 text-red-300 hover:bg-red-900/60'
                  : 'bg-green-950/60 border-green-900/50 text-green-300 hover:bg-green-900/60'
              }`}
            >
              {display.audioPlaying ? '⏸ Pause' : '▶ Play'}
            </button>
            <div className="flex items-center gap-2 flex-1">
              <span className="text-xs text-stone-500">Vol</span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={display.audioVolume}
                onChange={(e) => push({ audioVolume: Number(e.target.value) })}
                className="flex-1 accent-amber-500"
              />
              <span className="text-xs text-stone-500 w-8">{Math.round(display.audioVolume * 100)}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Overlay text */}
      <div className="flex flex-col gap-2">
        <p className="text-xs font-medium text-stone-400 uppercase tracking-wider">Texte d'ambiance (affiché aux joueurs)</p>
        <div className="flex gap-2">
          <textarea
            value={display.overlayText}
            onChange={(e) => push({ overlayText: e.target.value })}
            placeholder="Un texte narratif, une citation, une description..."
            rows={2}
            className="flex-1 bg-stone-900 border border-stone-700 rounded px-3 py-2 text-sm text-stone-100 focus:outline-none focus:border-amber-600 resize-none"
          />
          <button
            onClick={() => push({ showOverlay: !display.showOverlay })}
            className={`px-3 rounded text-sm font-medium transition-colors border ${
              display.showOverlay
                ? 'bg-amber-800/60 border-amber-700/50 text-amber-200'
                : 'bg-stone-800 border-stone-700 text-stone-400'
            }`}
          >
            {display.showOverlay ? 'Visible' : 'Caché'}
          </button>
        </div>
        {display.caption !== undefined && (
          <div className="flex gap-2">
            <input
              value={display.caption}
              onChange={(e) => push({ caption: e.target.value })}
              placeholder="Légende de l'image (facultatif)"
              className="flex-1 bg-stone-900 border border-stone-700 rounded px-3 py-1.5 text-sm text-stone-100 focus:outline-none focus:border-amber-600"
            />
          </div>
        )}
      </div>

      <PlayerAccess />
    </div>
  )
}
