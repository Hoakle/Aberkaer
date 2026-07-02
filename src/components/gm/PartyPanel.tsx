import { useId, useState } from 'react'
import { useGMStore } from '../../store/gmStore'
import { STATS, mod, fmtMod, TOKEN_MAX, TOKEN_START } from '../../game/rules'
import type { Character, StatKey } from '../../types'

const emptyCharacter: Omit<Character, 'id'> = {
  name: '',
  player: '',
  stats: { vitalite: 10, force: 10, intelligence: 10, agilite: 10, chance: 10, sagesse: 10 },
  hp: 10,
  fatigue: 0,
  tokens: TOKEN_START,
  truths: ['', '', ''],
  notes: '',
}

export default function PartyPanel() {
  const { characters, addCharacter, updateCharacter, deleteCharacter, adjustCharacter } = useGMStore()
  const [editingId, setEditingId] = useState<string | 'new' | null>(null)

  const editingCharacter =
    editingId && editingId !== 'new' ? characters.find((c) => c.id === editingId) : null

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-stone-400 uppercase tracking-wider">
          L'équipe — {characters.length} PJ
        </p>
        <button
          onClick={() => setEditingId('new')}
          className="px-3 py-1.5 rounded bg-amber-900/40 hover:bg-amber-800/50 text-amber-300 text-sm font-medium border border-amber-800/40 transition-colors"
        >
          + Nouveau personnage
        </button>
      </div>

      {editingId && (
        <CharacterForm
          initial={editingCharacter ?? emptyCharacter}
          isNew={editingId === 'new'}
          onSave={(data) => {
            if (editingId === 'new') addCharacter(data)
            else updateCharacter(editingId, data)
            setEditingId(null)
          }}
          onCancel={() => setEditingId(null)}
          onDelete={
            editingCharacter
              ? () => {
                  deleteCharacter(editingCharacter.id)
                  setEditingId(null)
                }
              : undefined
          }
        />
      )}

      {characters.length === 0 && !editingId && (
        <div className="text-stone-500 text-sm text-center py-8">
          Aucun personnage. Ajoute les PJ de ta table pour suivre HP, Fatigue et Jetons de Destin
          d'un coup d'œil — et lancer leurs dés depuis l'onglet 🎲.
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
        {characters.map((c) => (
          <CharacterCard
            key={c.id}
            character={c}
            onAdjust={(field, delta) => adjustCharacter(c.id, field, delta)}
            onEdit={() => setEditingId(c.id)}
          />
        ))}
      </div>
    </div>
  )
}

function CharacterCard({
  character: c,
  onAdjust,
  onEdit,
}: {
  character: Character
  onAdjust: (field: 'hp' | 'fatigue' | 'tokens', delta: number) => void
  onEdit: () => void
}) {
  const collapsed = c.stats.intelligence > 0 && c.fatigue >= c.stats.intelligence
  return (
    <div aria-label={`Fiche de ${c.name}`} className="rounded border border-stone-800 bg-stone-900/60 p-3 flex flex-col gap-2.5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold text-amber-200">{c.name}</h3>
          {c.player && <p className="text-xs text-stone-500">joué par {c.player}</p>}
        </div>
        <button
          onClick={onEdit}
          className="px-2 py-0.5 rounded border border-stone-700 text-stone-400 hover:text-stone-200 hover:border-stone-600 text-xs transition-colors"
        >
          ✎
        </button>
      </div>

      {/* Les 6 stats */}
      <div className="grid grid-cols-6 gap-1 text-center">
        {STATS.map((s) => (
          <div key={s.key} className="rounded bg-stone-950/60 border border-stone-800 py-1" title={s.label}>
            <div className="text-[10px] leading-none">{s.icon}</div>
            <div className="text-sm text-stone-200 font-medium">{c.stats[s.key]}</div>
            <div className="text-[10px] text-stone-500">{fmtMod(mod(c.stats[s.key]))}</div>
          </div>
        ))}
      </div>

      {/* Compteurs */}
      <Gauge
        label="❤️ HP"
        value={c.hp}
        max={c.stats.vitalite}
        barClass={c.hp <= c.stats.vitalite / 3 ? 'bg-red-600' : 'bg-green-700'}
        minusTitle="-1 HP"
        plusTitle="+1 HP"
        onDelta={(d) => onAdjust('hp', d)}
      />
      <Gauge
        label="✨ Fatigue"
        value={c.fatigue}
        max={c.stats.intelligence}
        barClass="bg-purple-700"
        minusTitle="-1 Fatigue"
        plusTitle="+1 Fatigue"
        onDelta={(d) => onAdjust('fatigue', d)}
        warning={collapsed ? '💥 Effondrement — plus de magie jusqu\'au repos' : undefined}
      />
      <div className="flex items-center gap-2">
        <span className="text-xs text-stone-400 w-20 flex-shrink-0">🪙 Jetons</span>
        <button onClick={() => onAdjust('tokens', -1)} title="-1 Jeton" className={BTN_SM}>−</button>
        <div className="flex gap-1 flex-1">
          {Array.from({ length: TOKEN_MAX }, (_, i) => (
            <span key={i} className={`w-3.5 h-3.5 rounded-full border ${i < c.tokens ? 'bg-amber-500 border-amber-400' : 'bg-stone-900 border-stone-700'}`} />
          ))}
        </div>
        <button onClick={() => onAdjust('tokens', 1)} title="+1 Jeton" className={BTN_SM}>+</button>
      </div>

      {/* Vérités */}
      {c.truths.some((t) => t.trim()) && (
        <div className="border-t border-stone-800 pt-2 flex flex-col gap-0.5">
          {c.truths.filter((t) => t.trim()).map((t, i) => (
            <p key={i} className="text-xs text-stone-400 italic">« {t} »</p>
          ))}
        </div>
      )}
      {c.notes && <p className="text-xs text-stone-500 whitespace-pre-wrap">{c.notes}</p>}
    </div>
  )
}

const BTN_SM =
  'w-6 h-6 rounded bg-stone-800 hover:bg-stone-700 border border-stone-700 text-stone-300 text-sm leading-none transition-colors flex-shrink-0'

function Gauge({
  label,
  value,
  max,
  barClass,
  minusTitle,
  plusTitle,
  onDelta,
  warning,
}: {
  label: string
  value: number
  max: number
  barClass: string
  minusTitle: string
  plusTitle: string
  onDelta: (d: number) => void
  warning?: string
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <span className="text-xs text-stone-400 w-20 flex-shrink-0">{label}</span>
        <button onClick={() => onDelta(-1)} title={minusTitle} className={BTN_SM}>−</button>
        <div className="flex-1 h-2 rounded bg-stone-950 border border-stone-800 overflow-hidden">
          <div
            className={`h-full ${barClass} transition-all`}
            style={{ width: max > 0 ? `${(value / max) * 100}%` : '0%' }}
          />
        </div>
        <button onClick={() => onDelta(1)} title={plusTitle} className={BTN_SM}>+</button>
        <span className="text-xs text-stone-300 w-12 text-right">{value} / {max}</span>
      </div>
      {warning && <p className="text-xs text-red-400 font-medium">{warning}</p>}
    </div>
  )
}

function CharacterForm({
  initial,
  isNew,
  onSave,
  onCancel,
  onDelete,
}: {
  initial: Omit<Character, 'id'>
  isNew: boolean
  onSave: (data: Omit<Character, 'id'>) => void
  onCancel: () => void
  onDelete?: () => void
}) {
  const [form, setForm] = useState<Omit<Character, 'id'>>({ ...initial, stats: { ...initial.stats }, truths: [...initial.truths] })
  const [nameError, setNameError] = useState(false)

  const setStat = (key: StatKey, value: number) =>
    setForm((f) => ({ ...f, stats: { ...f.stats, [key]: value } }))

  const save = () => {
    if (!form.name.trim()) {
      setNameError(true)
      return
    }
    // À la création : HP au max. En édition, updateCharacter borne de toute façon.
    onSave({ ...form, hp: isNew ? form.stats.vitalite : form.hp })
  }

  return (
    <div className="rounded border border-stone-700 bg-stone-900/60 p-3 flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        <LabeledInput
          label="Nom du personnage *"
          value={form.name}
          onChange={(v) => { setForm((f) => ({ ...f, name: v })); if (v.trim()) setNameError(false) }}
          error={nameError ? 'Le nom est requis' : undefined}
        />
        <LabeledInput label="Joueur / Joueuse" value={form.player} onChange={(v) => setForm((f) => ({ ...f, player: v }))} />
      </div>

      <div>
        <p className="text-xs text-stone-400 mb-1">
          Stats — tableau standard : 15 · 14 · 13 · 12 · 10 · 8 (mod = (score − 10) ÷ 2 ↓)
        </p>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {STATS.map((s) => (
            <StatInput key={s.key} icon={s.icon} label={s.label} value={form.stats[s.key]} onChange={(v) => setStat(s.key, v)} />
          ))}
        </div>
        <p className="text-xs text-stone-500 mt-1">
          HP = Vitalité ({form.stats.vitalite}) · Fatigue max = Intelligence ({form.stats.intelligence})
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <p className="text-xs text-stone-400">Les 3 Vérités (+2 quand elles s'appliquent à l'intention)</p>
        {form.truths.map((t, i) => (
          <input
            key={i}
            value={t}
            onChange={(e) =>
              setForm((f) => ({ ...f, truths: f.truths.map((x, j) => (j === i ? e.target.value : x)) }))
            }
            placeholder={`Vérité ${i + 1} — ex. « J'ai grandi dans les ruelles de Roz Fall »`}
            className="bg-stone-900 border border-stone-700 rounded px-3 py-1.5 text-sm text-stone-100 focus:outline-none focus:border-amber-600"
          />
        ))}
      </div>

      <LabeledTextarea label="Notes" value={form.notes} onChange={(v) => setForm((f) => ({ ...f, notes: v }))} />

      <div className="flex gap-2">
        <button onClick={save} className="px-4 py-1.5 rounded bg-amber-700 hover:bg-amber-600 text-sm font-medium transition-colors">
          Sauvegarder
        </button>
        <button onClick={onCancel} className="px-4 py-1.5 rounded bg-stone-800 hover:bg-stone-700 text-sm transition-colors">
          Annuler
        </button>
        {onDelete && (
          <button onClick={onDelete} className="ml-auto px-4 py-1.5 rounded bg-red-950 hover:bg-red-900 text-red-400 text-sm transition-colors">
            Supprimer
          </button>
        )}
      </div>
    </div>
  )
}

function StatInput({ icon, label, value, onChange }: { icon: string; label: string; value: number; onChange: (v: number) => void }) {
  const id = useId()
  return (
    <div className="flex flex-col gap-0.5">
      <label htmlFor={id} className="text-xs text-stone-400">{icon} {label}</label>
      <input
        id={id}
        type="number"
        min={1}
        max={20}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="bg-stone-900 border border-stone-700 rounded px-2 py-1.5 text-sm text-stone-100 focus:outline-none focus:border-amber-600 w-full"
      />
      <span className="text-[10px] text-stone-500 text-center">{fmtMod(mod(value))}</span>
    </div>
  )
}

function LabeledInput({ label, value, onChange, error }: { label: string; value: string; onChange: (v: string) => void; error?: string }) {
  const id = useId()
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-xs text-stone-400">{label}</label>
      <input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`bg-stone-900 border rounded px-3 py-1.5 text-sm text-stone-100 focus:outline-none ${
          error ? 'border-red-700 focus:border-red-500' : 'border-stone-700 focus:border-amber-600'
        }`}
      />
      {error && <span className="text-xs text-red-400">{error}</span>}
    </div>
  )
}

function LabeledTextarea({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const id = useId()
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-xs text-stone-400">{label}</label>
      <textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={2}
        className="bg-stone-900 border border-stone-700 rounded px-3 py-1.5 text-sm text-stone-100 focus:outline-none focus:border-amber-600 resize-y"
      />
    </div>
  )
}
