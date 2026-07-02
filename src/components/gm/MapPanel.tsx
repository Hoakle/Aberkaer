import { useId, useState } from 'react'
import { useGMStore } from '../../store/gmStore'
import { usePushDisplay } from '../../hooks/useTableSync'
import AberkaerMap from '../AberkaerMap'
import type { PlayerDisplay } from '../../types'

export default function MapPanel() {
  const { mapPins, tide, addMapPin, updateMapPin, deleteMapPin, setTide, display } = useGMStore()
  const pushDisplay = usePushDisplay()
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const shown = display.map?.visible ?? false
  const selectedPin = selectedId ? mapPins.find((p) => p.id === selectedId) : null

  const buildPlayerMap = (): PlayerDisplay['map'] => {
    const s = useGMStore.getState()
    return {
      visible: true,
      tide: s.tide,
      pins: s.mapPins.filter((p) => p.showToPlayers).map(({ x, y, label }) => ({ x, y, label })),
    }
  }

  const push = (map: PlayerDisplay['map']) => {
    useGMStore.getState().updateDisplay({ map })
    pushDisplay({ map })
  }

  // Toute modification est re-poussée si la carte est affichée aux joueurs.
  const withSync = (fn: () => void) => () => {
    fn()
    if (useGMStore.getState().display.map?.visible) push(buildPlayerMap())
  }

  const addPin = (x: number, y: number) => {
    withSync(() => addMapPin({ x, y, label: 'Repère', note: '', showToPlayers: false }))()
    const pins = useGMStore.getState().mapPins
    setSelectedId(pins[pins.length - 1]?.id ?? null)
  }

  return (
    <div className="flex flex-col gap-3 max-w-4xl">
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => (shown ? push(null) : push(buildPlayerMap()))}
          className={`px-4 py-1.5 rounded border text-sm font-medium transition-colors ${
            shown
              ? 'border-amber-700 bg-amber-950/40 text-amber-300 hover:bg-amber-900/40'
              : 'bg-stone-800 hover:bg-stone-700 border-stone-700 text-stone-200'
          }`}
        >
          {shown ? '👁 Carte affichée — masquer' : '🗺 Montrer la carte aux joueurs'}
        </button>
        <button
          onClick={withSync(() => setTide(useGMStore.getState().tide === 'haute' ? 'basse' : 'haute'))}
          className="px-4 py-1.5 rounded border border-stone-700 bg-stone-900 hover:bg-stone-800 text-stone-300 text-sm transition-colors"
        >
          {tide === 'haute' ? '🌊 Marée haute' : '🏖 Marée basse — chemins découverts'}
        </button>
        <span className="text-xs text-stone-500 ml-auto">
          Clique sur la carte pour ajouter un repère
        </span>
      </div>

      <div className="rounded border border-stone-800 overflow-hidden">
        <AberkaerMap
          pins={mapPins}
          tide={tide}
          onMapClick={addPin}
          onPinClick={setSelectedId}
          selectedId={selectedId}
          className="w-full"
        />
      </div>

      {selectedPin && (
        <PinEditor
          key={selectedPin.id}
          label={selectedPin.label}
          note={selectedPin.note}
          showToPlayers={selectedPin.showToPlayers}
          onChange={(data) => withSync(() => updateMapPin(selectedPin.id, data))()}
          onDelete={() => {
            withSync(() => deleteMapPin(selectedPin.id))()
            setSelectedId(null)
          }}
          onClose={() => setSelectedId(null)}
        />
      )}

      {mapPins.length > 0 && !selectedPin && (
        <p className="text-xs text-stone-500">
          {mapPins.length} repère(s) — les gris pointillés ne sont pas visibles des joueurs.
          Clique sur un repère pour l'éditer.
        </p>
      )}
    </div>
  )
}

function PinEditor({
  label,
  note,
  showToPlayers,
  onChange,
  onDelete,
  onClose,
}: {
  label: string
  note: string
  showToPlayers: boolean
  onChange: (data: { label?: string; note?: string; showToPlayers?: boolean }) => void
  onDelete: () => void
  onClose: () => void
}) {
  const labelId = useId()
  const noteId = useId()
  return (
    <div className="rounded border border-stone-700 bg-stone-900/60 p-3 flex flex-col gap-2">
      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-1">
          <label htmlFor={labelId} className="text-xs text-stone-400">Nom du repère</label>
          <input
            id={labelId}
            value={label}
            onChange={(e) => onChange({ label: e.target.value })}
            className="bg-stone-900 border border-stone-700 rounded px-3 py-1.5 text-sm text-stone-100 focus:outline-none focus:border-amber-600"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor={noteId} className="text-xs text-stone-400">Note (MJ uniquement)</label>
          <input
            id={noteId}
            value={note}
            onChange={(e) => onChange({ note: e.target.value })}
            className="bg-stone-900 border border-stone-700 rounded px-3 py-1.5 text-sm text-stone-100 focus:outline-none focus:border-amber-600"
          />
        </div>
      </div>
      <div className="flex gap-2 items-center">
        <button
          onClick={() => onChange({ showToPlayers: !showToPlayers })}
          aria-pressed={showToPlayers}
          className={`px-3 py-1 rounded border text-xs transition-colors ${
            showToPlayers
              ? 'border-amber-700 text-amber-300 bg-amber-950/40'
              : 'border-stone-700 text-stone-500 hover:text-stone-300'
          }`}
        >
          {showToPlayers ? '👁 Visible des joueurs' : '👁 Caché des joueurs'}
        </button>
        <button onClick={onClose} className="px-3 py-1 rounded bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs transition-colors">
          Fermer
        </button>
        <button onClick={onDelete} className="ml-auto px-3 py-1 rounded bg-red-950 hover:bg-red-900 text-red-400 text-xs transition-colors">
          Supprimer le repère
        </button>
      </div>
    </div>
  )
}
