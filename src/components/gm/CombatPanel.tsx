import { useId, useState } from 'react'
import { useGMStore } from '../../store/gmStore'
import type { Combatant } from '../../types'

// Les stats des PNJ sont du texte libre ; on y pêche « HP : 12 ».
function parseNpcHp(stats: string): number {
  const m = stats.match(/HP\s*:?\s*(\d+)/i)
  return m ? Number(m[1]) : 10
}

export default function CombatPanel() {
  const {
    characters,
    npcs,
    combat,
    combatAdd,
    combatRemove,
    combatUpdate,
    combatAdjustHp,
    combatMove,
    combatNextTurn,
    combatEnd,
  } = useGMStore()

  const inCombat = (name: string) => combat.combatants.some((c) => c.name === name)

  return (
    <div className="flex flex-col gap-4 max-w-3xl">
      {combat.combatants.length > 0 && (
        <>
          <div className="flex items-center gap-3">
            <span className="text-sm text-stone-300 font-medium">Round {combat.round}</span>
            <button
              onClick={combatNextTurn}
              className="px-5 py-2 rounded bg-amber-700 hover:bg-amber-600 text-sm font-semibold transition-colors"
            >
              Tour suivant →
            </button>
            <button
              onClick={combatEnd}
              className="ml-auto px-3 py-1.5 rounded border border-red-900/60 text-red-400 hover:bg-red-950/40 text-xs transition-colors"
            >
              Terminer le combat
            </button>
          </div>

          <div className="flex flex-col gap-1.5">
            {combat.combatants.map((c, i) => (
              <CombatantRow
                key={c.id}
                combatant={c}
                isTurn={i === combat.turnIndex}
                onHp={(d) => combatAdjustHp(c.id, d)}
                onNote={(note) => combatUpdate(c.id, { note })}
                onMove={(dir) => combatMove(c.id, dir)}
                onRemove={() => combatRemove(c.id)}
              />
            ))}
          </div>
        </>
      )}

      {combat.combatants.length === 0 && (
        <p className="text-stone-500 text-sm">
          Aucun combat en cours. Ajoute des combattants — l'ordre de la liste est l'ordre des tours.
        </p>
      )}

      {/* Ajout de combattants */}
      <div className="grid md:grid-cols-3 gap-3">
        <AddBlock title="Ajouter un PJ">
          {characters.length === 0 && <Hint>Aucun PJ (onglet 🎭)</Hint>}
          {characters.map((ch) => (
            <button
              key={ch.id}
              disabled={inCombat(ch.name)}
              onClick={() =>
                combatAdd({
                  name: ch.name,
                  hp: ch.hp,
                  maxHp: ch.stats.vitalite,
                  isPC: true,
                  characterId: ch.id,
                  note: '',
                })
              }
              className={ADD_BTN}
            >
              {ch.name} <span className="text-stone-500">({ch.hp} HP)</span>
            </button>
          ))}
        </AddBlock>

        <AddBlock title="Ajouter un PNJ">
          {npcs.map((npc) => {
            const hp = parseNpcHp(npc.stats)
            return (
              <button
                key={npc.id}
                disabled={inCombat(npc.name)}
                onClick={() => combatAdd({ name: npc.name, hp, maxHp: hp, isPC: false, note: '' })}
                className={ADD_BTN}
              >
                {npc.name} <span className="text-stone-500">({hp} HP)</span>
              </button>
            )
          })}
        </AddBlock>

        <ManualAdd onAdd={(name, hp) => combatAdd({ name, hp, maxHp: hp, isPC: false, note: '' })} />
      </div>
    </div>
  )
}

const ADD_BTN =
  'text-left px-2 py-1.5 rounded bg-stone-900 hover:bg-stone-800 disabled:opacity-40 disabled:cursor-not-allowed border border-stone-800 text-stone-300 text-xs transition-colors'

function CombatantRow({
  combatant: c,
  isTurn,
  onHp,
  onNote,
  onMove,
  onRemove,
}: {
  combatant: Combatant
  isTurn: boolean
  onHp: (delta: number) => void
  onNote: (note: string) => void
  onMove: (dir: -1 | 1) => void
  onRemove: () => void
}) {
  const dead = c.hp <= 0
  return (
    <div
      className={`flex items-center gap-2 rounded border px-2 py-1.5 ${
        isTurn ? 'border-amber-700 bg-amber-950/20' : 'border-stone-800 bg-stone-900/50'
      } ${dead ? 'opacity-60' : ''}`}
    >
      <span className={`w-4 text-center text-amber-400 ${isTurn ? '' : 'invisible'}`}>▶</span>
      <span className={`text-sm font-medium flex-shrink-0 ${dead ? 'line-through text-stone-500' : 'text-stone-200'}`}>
        {c.name}
      </span>
      {c.isPC && <span className="text-[10px] px-1 rounded bg-blue-950/60 text-blue-300 border border-blue-900/40">PJ</span>}
      {dead && <span className="text-xs">💀</span>}

      <div className="flex items-center gap-1 ml-auto flex-shrink-0">
        <button onClick={() => onHp(-1)} title={`-1 HP ${c.name}`} className={HP_BTN}>−</button>
        <span className="text-xs text-stone-300 w-14 text-center">{c.hp} / {c.maxHp}</span>
        <button onClick={() => onHp(1)} title={`+1 HP ${c.name}`} className={HP_BTN}>+</button>
      </div>

      <input
        value={c.note}
        onChange={(e) => onNote(e.target.value)}
        placeholder="note..."
        className="w-36 bg-stone-950 border border-stone-800 rounded px-2 py-0.5 text-xs text-stone-300 focus:outline-none focus:border-stone-600"
      />

      <div className="flex gap-0.5 flex-shrink-0">
        <button onClick={() => onMove(-1)} title={`Monter ${c.name}`} className={ORDER_BTN}>↑</button>
        <button onClick={() => onMove(1)} title={`Descendre ${c.name}`} className={ORDER_BTN}>↓</button>
        <button onClick={onRemove} title={`Retirer ${c.name}`} className={`${ORDER_BTN} hover:bg-red-900/60`}>×</button>
      </div>
    </div>
  )
}

const HP_BTN =
  'w-6 h-6 rounded bg-stone-800 hover:bg-stone-700 border border-stone-700 text-stone-300 text-sm leading-none transition-colors'
const ORDER_BTN =
  'w-6 h-6 rounded bg-black/20 hover:bg-black/40 text-stone-400 text-xs transition-colors'

function AddBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded border border-stone-800 bg-stone-950/40 p-2 flex flex-col gap-1">
      <p className="text-xs text-stone-500 uppercase tracking-wider mb-1">{title}</p>
      {children}
    </div>
  )
}

function Hint({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-stone-600">{children}</p>
}

function ManualAdd({ onAdd }: { onAdd: (name: string, hp: number) => void }) {
  const [name, setName] = useState('')
  const [hp, setHp] = useState(10)
  const nameId = useId()
  const hpId = useId()

  const add = () => {
    if (!name.trim()) return
    onAdd(name.trim(), Math.max(1, hp))
    setName('')
  }

  return (
    <div className="rounded border border-stone-800 bg-stone-950/40 p-2 flex flex-col gap-1.5">
      <p className="text-xs text-stone-500 uppercase tracking-wider mb-1">Ajout manuel</p>
      <label htmlFor={nameId} className="sr-only">Nom du combattant</label>
      <input
        id={nameId}
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && add()}
        placeholder="Nom (ex. Golem de vase)"
        className="bg-stone-900 border border-stone-700 rounded px-2 py-1.5 text-xs text-stone-100 focus:outline-none focus:border-amber-600"
      />
      <div className="flex gap-1.5">
        <label htmlFor={hpId} className="sr-only">HP du combattant</label>
        <input
          id={hpId}
          type="number"
          min={1}
          value={hp}
          onChange={(e) => setHp(Number(e.target.value))}
          className="w-16 bg-stone-900 border border-stone-700 rounded px-2 py-1.5 text-xs text-stone-100 focus:outline-none focus:border-amber-600"
        />
        <button
          onClick={add}
          className="flex-1 px-2 py-1.5 rounded bg-stone-800 hover:bg-stone-700 border border-stone-700 text-stone-300 text-xs transition-colors"
        >
          + Ajouter
        </button>
      </div>
    </div>
  )
}
