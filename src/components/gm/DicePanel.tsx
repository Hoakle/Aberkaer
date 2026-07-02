import { useId, useState } from 'react'
import { useGMStore } from '../../store/gmStore'
import { usePushDisplay } from '../../hooks/useTableSync'
import {
  STATS,
  statLabel,
  mod,
  fmtMod,
  TRUTH_BONUS,
  DC_LEVELS,
  MAGIC_AMBITIONS,
  magicFatigueCost,
  rollD20,
  rollOutcome,
} from '../../game/rules'
import { uid } from '../../utils/uid'
import type { Character, RollResult, StatKey } from '../../types'

const OUTCOME_STYLE: Record<RollResult['outcome'], { label: string; cls: string }> = {
  crit: { label: '✨ Critique !', cls: 'text-amber-300' },
  fumble: { label: '💀 Échec critique !', cls: 'text-red-500' },
  success: { label: 'Réussite', cls: 'text-green-400' },
  failure: { label: 'Échec', cls: 'text-red-400' },
  open: { label: 'Jet libre', cls: 'text-stone-300' },
}

export default function DicePanel() {
  const { characters, adjustCharacter, updateDisplay } = useGMStore()
  const pushDisplay = usePushDisplay()
  const [showToPlayers, setShowToPlayers] = useState(false)

  // Diffuse le jet sur l'écran joueurs (animation) si l'option est active.
  const publish = (res: RollResult) => {
    if (!showToPlayers) return
    updateDisplay({ lastRoll: res })
    pushDisplay({ lastRoll: res })
  }

  return (
    <div className="flex flex-col gap-4 max-w-3xl">
      <label className="flex items-center gap-2 text-sm text-stone-300 cursor-pointer">
        <input
          type="checkbox"
          checked={showToPlayers}
          onChange={(e) => setShowToPlayers(e.target.checked)}
          className="accent-amber-500"
        />
        Montrer les jets aux joueurs (animation sur l'écran)
      </label>

      <SimpleRoll characters={characters} adjustCharacter={adjustCharacter} publish={publish} />
      <MagicRoll characters={characters} adjustCharacter={adjustCharacter} publish={publish} />
      <DuelRoll characters={characters} />
    </div>
  )
}

// ─── Jet simple ──────────────────────────────────────────────────────────────

function SimpleRoll({
  characters,
  adjustCharacter,
  publish,
}: {
  characters: Character[]
  adjustCharacter: (id: string, field: 'hp' | 'fatigue' | 'tokens', delta: number) => void
  publish: (res: RollResult) => void
}) {
  const [charId, setCharId] = useState('')
  const [statKey, setStatKey] = useState<StatKey>('force')
  const [manualMod, setManualMod] = useState(0)
  const [truth, setTruth] = useState(false)
  const [dc, setDc] = useState<number | null>(13)
  const [result, setResult] = useState<RollResult | null>(null)

  const character = characters.find((c) => c.id === charId)
  const baseMod = character ? mod(character.stats[statKey]) : manualMod
  const bonus = baseMod + (truth ? TRUTH_BONUS : 0)

  const doRoll = () => {
    const die = rollD20()
    const total = die + bonus
    const res: RollResult = {
      id: uid(),
      title: `${character?.name ?? 'Jet'} — ${statLabel(statKey)}`,
      die,
      bonus,
      total,
      dc,
      outcome: rollOutcome(die, total, dc),
    }
    setResult(res)
    publish(res)
  }

  // Jetons de Destin : relancer le d20 OU +5 au résultat (après le lancer).
  const spendReroll = () => {
    if (!character || character.tokens <= 0 || !result) return
    adjustCharacter(character.id, 'tokens', -1)
    const die = rollD20()
    const total = die + result.bonus
    const res: RollResult = { ...result, id: uid(), die, total, outcome: rollOutcome(die, total, result.dc) }
    setResult(res)
    publish(res)
  }
  const spendPlus5 = () => {
    if (!character || character.tokens <= 0 || !result) return
    adjustCharacter(character.id, 'tokens', -1)
    const total = result.total + 5
    const res: RollResult = { ...result, id: uid(), total, outcome: rollOutcome(result.die, total, result.dc) }
    setResult(res)
    publish(res)
  }

  return (
    <Section title="🎲 Jet simple" subtitle="d20 + modificateur, +2 si une Vérité s'applique à l'intention">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 items-end">
        <CharacterSelect characters={characters} value={charId} onChange={setCharId} />
        <StatSelect value={statKey} onChange={setStatKey} character={character} />
        {!character && <NumberField label="Modificateur manuel" value={manualMod} onChange={setManualMod} />}
        <DCSelect value={dc} onChange={setDc} />
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <label className="flex items-center gap-2 text-sm text-stone-300 cursor-pointer">
          <input type="checkbox" checked={truth} onChange={(e) => setTruth(e.target.checked)} className="accent-amber-500" />
          Vérité applicable (+{TRUTH_BONUS})
        </label>
        <button
          onClick={doRoll}
          className="px-5 py-2 rounded bg-amber-700 hover:bg-amber-600 text-sm font-semibold transition-colors"
        >
          Lancer le jet (d20 {fmtMod(bonus)})
        </button>
      </div>

      {result && (
        <RollResultCard result={result}>
          {character && (
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-stone-500">
                Jetons de Destin : {character.tokens}
              </span>
              <button onClick={spendReroll} disabled={character.tokens <= 0} className={TOKEN_BTN}>
                🪙 Relancer
              </button>
              <button onClick={spendPlus5} disabled={character.tokens <= 0} className={TOKEN_BTN}>
                🪙 +5
              </button>
            </div>
          )}
        </RollResultCard>
      )}
    </Section>
  )
}

// ─── Assistant magie ─────────────────────────────────────────────────────────

function MagicRoll({
  characters,
  adjustCharacter,
  publish,
}: {
  characters: Character[]
  adjustCharacter: (id: string, field: 'hp' | 'fatigue' | 'tokens', delta: number) => void
  publish: (res: RollResult) => void
}) {
  const [charId, setCharId] = useState('')
  const [ambitionIdx, setAmbitionIdx] = useState(0)
  const [truth, setTruth] = useState(false)
  const [outcome, setOutcome] = useState<{ res: RollResult; cost: number; fatigue: number; max: number } | null>(null)
  const ambitionSelectId = useId()

  const character = characters.find((c) => c.id === charId)
  const ambition = MAGIC_AMBITIONS[ambitionIdx]

  const castSpell = () => {
    if (!character) return
    const bonus = mod(character.stats.intelligence) + (truth ? TRUTH_BONUS : 0)
    const die = rollD20()
    const total = die + bonus
    const rollRes = rollOutcome(die, total, ambition.dc)
    const cost = magicFatigueCost(rollRes)
    adjustCharacter(character.id, 'fatigue', cost)
    const fatigue = Math.min(character.fatigue + cost, character.stats.intelligence)
    const res: RollResult = {
      id: uid(),
      title: `${character.name} — Sort (${ambition.label.toLowerCase()})`,
      die,
      bonus,
      total,
      dc: ambition.dc,
      outcome: rollRes,
    }
    setOutcome({ res, cost, fatigue, max: character.stats.intelligence })
    publish(res)
  }

  return (
    <Section
      title="✨ Magie"
      subtitle="Jet d'Intelligence contre la DC de l'ambition — le sort coûte toujours de la Fatigue"
    >
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 items-end">
        <CharacterSelect characters={characters} value={charId} onChange={setCharId} required />
        <div className="flex flex-col gap-1">
          <label htmlFor={ambitionSelectId} className="text-xs text-stone-400">Ambition du sort</label>
          <select
            id={ambitionSelectId}
            value={ambitionIdx}
            onChange={(e) => setAmbitionIdx(Number(e.target.value))}
            className={SELECT_CLS}
          >
            {MAGIC_AMBITIONS.map((a, i) => (
              <option key={a.label} value={i}>
                {a.label} (DC {a.dc}) — {a.hint}
              </option>
            ))}
          </select>
        </div>
        <label className="flex items-center gap-2 text-sm text-stone-300 cursor-pointer pb-2">
          <input type="checkbox" checked={truth} onChange={(e) => setTruth(e.target.checked)} className="accent-amber-500" />
          Vérité applicable (+{TRUTH_BONUS})
        </label>
      </div>

      {character && (
        <p className="text-xs text-stone-500">
          {character.name} : Int {fmtMod(mod(character.stats.intelligence))} · Fatigue {character.fatigue} / {character.stats.intelligence}
        </p>
      )}

      <button
        onClick={castSpell}
        disabled={!character}
        className="self-start px-5 py-2 rounded bg-purple-800 hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-semibold transition-colors"
      >
        Lancer le sort
      </button>
      {!character && characters.length === 0 && (
        <p className="text-xs text-stone-500">Ajoute d'abord un PJ dans l'onglet 🎭 pour suivre sa Fatigue.</p>
      )}

      {outcome && (
        <RollResultCard result={outcome.res}>
          <p className="text-sm text-purple-300 mt-1">
            Coût : {outcome.cost} Fatigue → <strong>{outcome.fatigue} / {outcome.max}</strong>
            {outcome.res.outcome === 'fumble' && ' · + complication narrative'}
            {outcome.res.outcome === 'crit' && ' · effet amplifié'}
          </p>
          {outcome.fatigue >= outcome.max && (
            <p className="text-sm text-red-400 font-semibold mt-1">
              💥 Effondrement — plus de magie jusqu'au repos
            </p>
          )}
        </RollResultCard>
      )}
    </Section>
  )
}

// ─── Duel ────────────────────────────────────────────────────────────────────

interface DuelSide {
  charId: string
  statKey: StatKey
  manualMod: number
  label: string
}

const emptySide = (label: string): DuelSide => ({ charId: '', statKey: 'force', manualMod: 0, label })

function DuelRoll({ characters }: { characters: Character[] }) {
  const [sideA, setSideA] = useState(() => emptySide('Camp A'))
  const [sideB, setSideB] = useState(() => emptySide('Camp B'))
  const [duel, setDuel] = useState<{ a: DuelOutcome; b: DuelOutcome } | null>(null)

  const rollSide = (side: DuelSide): DuelOutcome => {
    const char = characters.find((c) => c.id === side.charId)
    const bonus = char ? mod(char.stats[side.statKey]) : side.manualMod
    const die = rollD20()
    return { name: char?.name ?? side.label, statKey: side.statKey, die, bonus, total: die + bonus }
  }

  const doDuel = () => setDuel({ a: rollSide(sideA), b: rollSide(sideB) })

  return (
    <Section title="⚔️ Duel" subtitle="Deux jets opposés — le plus haut l'emporte, égalité = impasse">
      <div className="grid grid-cols-2 gap-3">
        <DuelSideForm side={sideA} onChange={setSideA} characters={characters} />
        <DuelSideForm side={sideB} onChange={setSideB} characters={characters} />
      </div>
      <button
        onClick={doDuel}
        className="self-start px-5 py-2 rounded bg-red-900 hover:bg-red-800 text-sm font-semibold transition-colors"
      >
        Lancer le duel
      </button>
      {duel && (
        <div className="grid grid-cols-2 gap-3">
          <DuelResultCard outcome={duel.a} state={duelState(duel.a, duel.b)} />
          <DuelResultCard outcome={duel.b} state={duelState(duel.b, duel.a)} />
        </div>
      )}
    </Section>
  )
}

interface DuelOutcome {
  name: string
  statKey: StatKey
  die: number
  bonus: number
  total: number
}

const duelState = (self: DuelOutcome, other: DuelOutcome) =>
  self.total > other.total ? 'win' : self.total < other.total ? 'lose' : 'tie'

function DuelResultCard({ outcome, state }: { outcome: DuelOutcome; state: 'win' | 'lose' | 'tie' }) {
  const style =
    state === 'win'
      ? 'border-green-800 bg-green-950/30'
      : state === 'lose'
        ? 'border-stone-800 bg-stone-900/40 opacity-70'
        : 'border-amber-800 bg-amber-950/20'
  return (
    <div className={`rounded border p-3 text-center ${style}`}>
      <p className="text-sm text-stone-300">{outcome.name} — {statLabel(outcome.statKey)}</p>
      <p className="text-3xl font-bold text-stone-100 my-1">{outcome.total}</p>
      <p className="text-xs text-stone-500">d20 : {outcome.die} {fmtMod(outcome.bonus)}</p>
      <p className="text-sm font-medium mt-1">
        {state === 'win' ? '🏆 L\'emporte' : state === 'tie' ? '🤝 Impasse' : ''}
      </p>
    </div>
  )
}

function DuelSideForm({ side, onChange, characters }: { side: DuelSide; onChange: (s: DuelSide) => void; characters: Character[] }) {
  const char = characters.find((c) => c.id === side.charId)
  return (
    <div className="rounded border border-stone-800 bg-stone-950/40 p-2 flex flex-col gap-2">
      <p className="text-xs text-stone-500 uppercase tracking-wider">{side.label}</p>
      <CharacterSelect characters={characters} value={side.charId} onChange={(v) => onChange({ ...side, charId: v })} />
      <StatSelect value={side.statKey} onChange={(v) => onChange({ ...side, statKey: v })} character={char} />
      {!char && (
        <NumberField label="Modificateur manuel" value={side.manualMod} onChange={(v) => onChange({ ...side, manualMod: v })} />
      )}
    </div>
  )
}

// ─── Briques partagées ───────────────────────────────────────────────────────

const SELECT_CLS =
  'bg-stone-900 border border-stone-700 rounded px-2 py-1.5 text-sm text-stone-100 focus:outline-none focus:border-amber-600 w-full'
const TOKEN_BTN =
  'px-2 py-1 rounded bg-amber-950/60 hover:bg-amber-900/60 disabled:opacity-40 disabled:cursor-not-allowed border border-amber-900/50 text-amber-300 text-xs transition-colors'

function Section({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <section className="rounded border border-stone-800 bg-stone-900/40 p-3 flex flex-col gap-3">
      <div>
        <h2 className="text-sm font-semibold text-stone-200">{title}</h2>
        <p className="text-xs text-stone-500">{subtitle}</p>
      </div>
      {children}
    </section>
  )
}

function RollResultCard({ result, children }: { result: RollResult; children?: React.ReactNode }) {
  const style = OUTCOME_STYLE[result.outcome]
  return (
    <div className="rounded border border-stone-700 bg-stone-950/70 p-3 flex items-center gap-4">
      <div className="text-center">
        <div className="text-4xl font-bold text-stone-100">{result.total}</div>
        <div className="text-xs text-stone-500">d20 : {result.die} {fmtMod(result.bonus)}</div>
      </div>
      <div className="flex-1">
        <p className="text-sm text-stone-400">{result.title}</p>
        <p className={`text-lg font-semibold ${style.cls}`}>
          {style.label}
          {result.dc !== null && result.outcome !== 'crit' && result.outcome !== 'fumble' && (
            <span className="text-stone-500 text-sm font-normal"> · vs DC {result.dc}</span>
          )}
        </p>
        {children}
      </div>
    </div>
  )
}

function CharacterSelect({
  characters,
  value,
  onChange,
  required,
}: {
  characters: Character[]
  value: string
  onChange: (v: string) => void
  required?: boolean
}) {
  const id = useId()
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-xs text-stone-400">Personnage</label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className={SELECT_CLS}>
        <option value="">{required ? '— choisir un PJ —' : '— manuel —'}</option>
        {characters.map((c) => (
          <option key={c.id} value={c.id}>{c.name}</option>
        ))}
      </select>
    </div>
  )
}

function StatSelect({ value, onChange, character }: { value: StatKey; onChange: (v: StatKey) => void; character?: Character | null }) {
  const id = useId()
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-xs text-stone-400">Stat</label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value as StatKey)} className={SELECT_CLS}>
        {STATS.map((s) => (
          <option key={s.key} value={s.key}>
            {s.icon} {s.label}{character ? ` (${fmtMod(mod(character.stats[s.key]))})` : ''}
          </option>
        ))}
      </select>
    </div>
  )
}

function DCSelect({ value, onChange }: { value: number | null; onChange: (v: number | null) => void }) {
  const id = useId()
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-xs text-stone-400">Difficulté (DC)</label>
      <select
        id={id}
        value={value === null ? '' : String(value)}
        onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
        className={SELECT_CLS}
      >
        <option value="">Sans DC (jet libre)</option>
        {DC_LEVELS.map((d) => (
          <option key={d.dc} value={d.dc}>{d.label} — DC {d.dc}</option>
        ))}
      </select>
    </div>
  )
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  const id = useId()
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-xs text-stone-400">{label}</label>
      <input
        id={id}
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className={SELECT_CLS}
      />
    </div>
  )
}
