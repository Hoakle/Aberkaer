import { useId, useState } from 'react'
import { useGMStore } from '../../store/gmStore'
import { usePushDisplay } from '../../hooks/useTableSync'

export default function ClocksPanel() {
  const { clocks, addClock, deleteClock, adjustClock, updateClock } = useGMStore()
  const pushDisplay = usePushDisplay()
  const [label, setLabel] = useState('')
  const [value, setValue] = useState(10)
  const labelId = useId()
  const valueId = useId()

  // Après chaque changement, les horloges marquées visibles sont poussées
  // sur l'écran joueurs.
  const syncPlayers = () => {
    const state = useGMStore.getState()
    const visible = state.clocks
      .filter((c) => c.showToPlayers)
      .map(({ label, value }) => ({ label, value }))
    state.updateDisplay({ clocks: visible })
    pushDisplay({ clocks: visible })
  }

  const withSync = (fn: () => void) => () => {
    fn()
    syncPlayers()
  }

  const add = withSync(() => {
    if (!label.trim()) return
    addClock({ label: label.trim(), value: Math.max(0, value), showToPlayers: false })
    setLabel('')
  })

  return (
    <div className="flex flex-col gap-4 max-w-2xl">
      <p className="text-xs text-stone-500">
        Compte à rebours de la campagne — ex. les jours restants avant le solstice. Décrémente en
        fin de session. L'œil rend l'horloge visible sur l'écran joueurs.
      </p>

      <div className="flex flex-col gap-2">
        {clocks.map((clock) => (
          <div
            key={clock.id}
            className="flex items-center gap-3 rounded border border-stone-800 bg-stone-900/50 px-3 py-2"
          >
            <input
              value={clock.label}
              onChange={(e) => updateClock(clock.id, { label: e.target.value })}
              onBlur={syncPlayers}
              aria-label={`Nom de l'horloge ${clock.label}`}
              className="flex-1 bg-transparent text-sm text-stone-200 focus:outline-none focus:bg-stone-950 rounded px-1 py-0.5"
            />
            <div className="flex items-center gap-1.5">
              <button onClick={withSync(() => adjustClock(clock.id, -1))} title={`-1 ${clock.label}`} className={BTN}>−</button>
              <span className="text-lg font-semibold text-amber-300 w-14 text-center">J-{clock.value}</span>
              <button onClick={withSync(() => adjustClock(clock.id, 1))} title={`+1 ${clock.label}`} className={BTN}>+</button>
            </div>
            <button
              onClick={withSync(() => updateClock(clock.id, { showToPlayers: !clock.showToPlayers }))}
              title={clock.showToPlayers ? `Masquer ${clock.label} aux joueurs` : `Montrer ${clock.label} aux joueurs`}
              aria-pressed={clock.showToPlayers}
              className={`px-2.5 py-1 rounded border text-xs transition-colors ${
                clock.showToPlayers
                  ? 'border-amber-700 text-amber-300 bg-amber-950/40'
                  : 'border-stone-700 text-stone-500 hover:text-stone-300'
              }`}
            >
              {clock.showToPlayers ? '👁 Visible' : '👁 Cachée'}
            </button>
            <button
              onClick={withSync(() => deleteClock(clock.id))}
              title={`Supprimer ${clock.label}`}
              className="w-6 h-6 rounded bg-black/20 hover:bg-red-900/60 text-stone-400 text-xs transition-colors"
            >
              ×
            </button>
          </div>
        ))}
        {clocks.length === 0 && (
          <p className="text-stone-500 text-sm text-center py-4">Aucune horloge.</p>
        )}
      </div>

      <div className="flex items-end gap-2 rounded border border-stone-800 bg-stone-950/40 p-3">
        <div className="flex flex-col gap-1 flex-1">
          <label htmlFor={labelId} className="text-xs text-stone-400">Nouvelle horloge</label>
          <input
            id={labelId}
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && add()}
            placeholder="ex. Ultimatum de la Guilde"
            className="bg-stone-900 border border-stone-700 rounded px-3 py-1.5 text-sm text-stone-100 focus:outline-none focus:border-amber-600"
          />
        </div>
        <div className="flex flex-col gap-1 w-20">
          <label htmlFor={valueId} className="text-xs text-stone-400">Jours</label>
          <input
            id={valueId}
            type="number"
            min={0}
            value={value}
            onChange={(e) => setValue(Number(e.target.value))}
            className="bg-stone-900 border border-stone-700 rounded px-2 py-1.5 text-sm text-stone-100 focus:outline-none focus:border-amber-600"
          />
        </div>
        <button
          onClick={add}
          className="px-4 py-1.5 rounded bg-amber-900/40 hover:bg-amber-800/50 text-amber-300 text-sm font-medium border border-amber-800/40 transition-colors"
        >
          + Ajouter
        </button>
      </div>
    </div>
  )
}

const BTN =
  'w-6 h-6 rounded bg-stone-800 hover:bg-stone-700 border border-stone-700 text-stone-300 text-sm leading-none transition-colors'
