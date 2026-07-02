import { useId, useState } from 'react'
import { useGMStore } from '../../store/gmStore'
import Markdown from '../Markdown'
import {
  generateName,
  generateRumor,
  generateWeather,
  generateEncounter,
  ISLAND_NAMES,
} from '../../game/generators'
import type { SessionLog, TimelineEvent } from '../../types'

const LOG_TEMPLATE = `## Résumé

## Moments forts

## À suivre
`

const THREADS: { id: TimelineEvent['thread']; label: string; cls: string }[] = [
  { id: 'valdrek', label: 'Meurtre d\'Edric', cls: 'bg-amber-900/60 text-amber-300' },
  { id: 'fond', label: 'Œil du Fond', cls: 'bg-purple-900/60 text-purple-300' },
  { id: 'autre', label: 'Autre', cls: 'bg-stone-700 text-stone-300' },
]

const threadStyle = (id: TimelineEvent['thread']) => THREADS.find((t) => t.id === id)!

export default function CampaignPanel() {
  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      <JournalSection />
      <TimelineSection />
      <GeneratorsSection />
    </div>
  )
}

// ─── Journal de sessions ─────────────────────────────────────────────────────

function JournalSection() {
  const { sessionLogs, addSessionLog, updateSessionLog, deleteSessionLog } = useGMStore()
  const [editingId, setEditingId] = useState<string | 'new' | null>(null)

  const editing = editingId && editingId !== 'new' ? sessionLogs.find((l) => l.id === editingId) : null
  const sorted = [...sessionLogs].sort((a, b) => b.date.localeCompare(a.date))

  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-stone-200">📔 Journal de sessions</h2>
        <button
          onClick={() => setEditingId('new')}
          className="px-3 py-1.5 rounded bg-amber-900/40 hover:bg-amber-800/50 text-amber-300 text-sm font-medium border border-amber-800/40 transition-colors"
        >
          + Nouvelle session
        </button>
      </div>

      {editingId && (
        <LogForm
          initial={
            editing ?? { date: new Date().toISOString().slice(0, 10), title: '', content: LOG_TEMPLATE }
          }
          onSave={(data) => {
            if (editingId === 'new') addSessionLog(data)
            else updateSessionLog(editingId, data)
            setEditingId(null)
          }}
          onCancel={() => setEditingId(null)}
          onDelete={
            editing
              ? () => {
                  deleteSessionLog(editing.id)
                  setEditingId(null)
                }
              : undefined
          }
        />
      )}

      {sorted.length === 0 && !editingId && (
        <p className="text-stone-500 text-sm">
          Aucune session consignée. En fin de partie : résumé, moments forts, et ce qu'il faut
          préparer pour la prochaine.
        </p>
      )}

      {sorted.map((log) => (
        <div key={log.id} className="rounded border border-stone-800 bg-stone-900/50 p-3">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs text-stone-500">{log.date}</span>
            <span className="text-sm font-medium text-stone-200 flex-1">{log.title}</span>
            <button
              onClick={() => setEditingId(log.id)}
              className="px-2 py-0.5 rounded border border-stone-700 text-stone-400 hover:text-stone-200 text-xs transition-colors"
            >
              ✎
            </button>
          </div>
          <Markdown content={log.content} className="text-xs text-stone-400" />
        </div>
      ))}
    </section>
  )
}

function LogForm({
  initial,
  onSave,
  onCancel,
  onDelete,
}: {
  initial: Omit<SessionLog, 'id'>
  onSave: (data: Omit<SessionLog, 'id'>) => void
  onCancel: () => void
  onDelete?: () => void
}) {
  const [form, setForm] = useState({ ...initial })
  const dateId = useId()
  const titleId = useId()
  const contentId = useId()

  return (
    <div className="rounded border border-stone-700 bg-stone-900/60 p-3 flex flex-col gap-2">
      <div className="flex gap-2">
        <div className="flex flex-col gap-1">
          <label htmlFor={dateId} className="text-xs text-stone-400">Date</label>
          <input
            id={dateId}
            type="date"
            value={form.date}
            onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
            className="bg-stone-900 border border-stone-700 rounded px-2 py-1.5 text-sm text-stone-100 focus:outline-none focus:border-amber-600"
          />
        </div>
        <div className="flex flex-col gap-1 flex-1">
          <label htmlFor={titleId} className="text-xs text-stone-400">Titre de la session</label>
          <input
            id={titleId}
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            placeholder="ex. Session 1 — La lettre cachetée"
            className="bg-stone-900 border border-stone-700 rounded px-3 py-1.5 text-sm text-stone-100 focus:outline-none focus:border-amber-600"
          />
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor={contentId} className="text-xs text-stone-400">Compte rendu (Markdown)</label>
        <textarea
          id={contentId}
          value={form.content}
          onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
          rows={8}
          className="bg-stone-900 border border-stone-700 rounded px-3 py-2 text-sm text-stone-100 focus:outline-none focus:border-amber-600 font-mono resize-y"
        />
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => form.title.trim() && onSave(form)}
          className="px-4 py-1.5 rounded bg-amber-700 hover:bg-amber-600 text-sm font-medium transition-colors"
        >
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

// ─── Timeline de l'intrigue ──────────────────────────────────────────────────

function TimelineSection() {
  const { timeline, addTimelineEvent, updateTimelineEvent, deleteTimelineEvent, moveTimelineEvent } =
    useGMStore()
  const [editingId, setEditingId] = useState<string | 'new' | null>(null)

  const editing = editingId && editingId !== 'new' ? timeline.find((e) => e.id === editingId) : null

  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-stone-200">🧵 Timeline de l'intrigue</h2>
        <button
          onClick={() => setEditingId('new')}
          className="px-3 py-1.5 rounded bg-stone-800 hover:bg-stone-700 border border-stone-700 text-stone-300 text-sm transition-colors"
        >
          + Événement
        </button>
      </div>
      <p className="text-xs text-stone-500">
        Deux colonnes de vérité : ce que les joueurs savent, et ce qui s'est vraiment passé.
      </p>

      {editingId && (
        <EventForm
          initial={editing ?? { when: '', title: '', playersKnow: '', truth: '', thread: 'autre' }}
          onSave={(data) => {
            if (editingId === 'new') addTimelineEvent(data)
            else updateTimelineEvent(editingId, data)
            setEditingId(null)
          }}
          onCancel={() => setEditingId(null)}
          onDelete={
            editing
              ? () => {
                  deleteTimelineEvent(editing.id)
                  setEditingId(null)
                }
              : undefined
          }
        />
      )}

      <div className="flex flex-col">
        {timeline.map((event, i) => (
          <div key={event.id} className="flex gap-3">
            {/* Fil vertical */}
            <div className="flex flex-col items-center w-4 flex-shrink-0">
              <div className={`w-2 h-2 rounded-full mt-2 ${event.thread === 'valdrek' ? 'bg-amber-500' : event.thread === 'fond' ? 'bg-purple-500' : 'bg-stone-500'}`} />
              {i < timeline.length - 1 && <div className="w-px flex-1 bg-stone-800" />}
            </div>
            <div className="flex-1 pb-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-stone-500 font-medium">{event.when}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded ${threadStyle(event.thread).cls}`}>
                  {threadStyle(event.thread).label}
                </span>
                <span className="text-sm text-stone-200 font-medium">{event.title}</span>
                <span className="ml-auto flex gap-0.5">
                  <button onClick={() => moveTimelineEvent(event.id, -1)} title={`Monter ${event.title}`} className={TL_BTN}>↑</button>
                  <button onClick={() => moveTimelineEvent(event.id, 1)} title={`Descendre ${event.title}`} className={TL_BTN}>↓</button>
                  <button onClick={() => setEditingId(event.id)} title={`Modifier ${event.title}`} className={TL_BTN}>✎</button>
                </span>
              </div>
              {event.playersKnow && (
                <p className="text-xs text-stone-400 mt-0.5">👥 Les joueurs savent : {event.playersKnow}</p>
              )}
              {event.truth && (
                <p className="text-xs text-red-300/80 mt-0.5">🔒 Vérité : {event.truth}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

const TL_BTN =
  'w-5 h-5 rounded bg-black/20 hover:bg-black/40 text-stone-500 hover:text-stone-300 text-xs transition-colors'

function EventForm({
  initial,
  onSave,
  onCancel,
  onDelete,
}: {
  initial: Omit<TimelineEvent, 'id'>
  onSave: (data: Omit<TimelineEvent, 'id'>) => void
  onCancel: () => void
  onDelete?: () => void
}) {
  const [form, setForm] = useState({ ...initial })
  const whenId = useId()
  const titleId = useId()
  const knowId = useId()
  const truthId = useId()
  const threadId = useId()

  return (
    <div className="rounded border border-stone-700 bg-stone-900/60 p-3 flex flex-col gap-2">
      <div className="grid grid-cols-3 gap-2">
        <div className="flex flex-col gap-1">
          <label htmlFor={whenId} className="text-xs text-stone-400">Quand</label>
          <input
            id={whenId}
            value={form.when}
            onChange={(e) => setForm((f) => ({ ...f, when: e.target.value }))}
            placeholder="ex. J-10, il y a 3 jours"
            className={TL_INPUT}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor={titleId} className="text-xs text-stone-400">Événement</label>
          <input id={titleId} value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} className={TL_INPUT} />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor={threadId} className="text-xs text-stone-400">Fil</label>
          <select
            id={threadId}
            value={form.thread}
            onChange={(e) => setForm((f) => ({ ...f, thread: e.target.value as TimelineEvent['thread'] }))}
            className={TL_INPUT}
          >
            {THREADS.map((t) => (
              <option key={t.id} value={t.id}>{t.label}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor={knowId} className="text-xs text-stone-400">Ce que les joueurs savent</label>
        <input id={knowId} value={form.playersKnow} onChange={(e) => setForm((f) => ({ ...f, playersKnow: e.target.value }))} className={TL_INPUT} />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor={truthId} className="text-xs text-stone-400">La vérité (MJ uniquement)</label>
        <input id={truthId} value={form.truth} onChange={(e) => setForm((f) => ({ ...f, truth: e.target.value }))} className={TL_INPUT} />
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => form.title.trim() && onSave(form)}
          className="px-4 py-1.5 rounded bg-amber-700 hover:bg-amber-600 text-sm font-medium transition-colors"
        >
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

const TL_INPUT =
  'bg-stone-900 border border-stone-700 rounded px-2 py-1.5 text-sm text-stone-100 focus:outline-none focus:border-amber-600'

// ─── Générateurs ─────────────────────────────────────────────────────────────

interface Generated {
  icon: string
  text: string
}

function GeneratorsSection() {
  const [results, setResults] = useState<Generated[]>([])
  const [island, setIsland] = useState(ISLAND_NAMES[0])
  const islandId = useId()

  const add = (icon: string, text: string) => setResults((r) => [{ icon, text }, ...r].slice(0, 6))

  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-sm font-semibold text-stone-200">🎁 Générateurs</h2>
      <div className="flex items-center gap-2 flex-wrap">
        <button onClick={() => add('🪪', generateName())} className={GEN_BTN}>Nom de PNJ</button>
        <button onClick={() => add('🗣', generateRumor())} className={GEN_BTN}>Rumeur de taverne</button>
        <button onClick={() => add('🌦', generateWeather())} className={GEN_BTN}>Météo du fleuve</button>
        <span className="flex items-center gap-1">
          <button onClick={() => add('⚡', generateEncounter(island))} className={GEN_BTN}>Rencontre</button>
          <label htmlFor={islandId} className="sr-only">Île de la rencontre</label>
          <select
            id={islandId}
            value={island}
            onChange={(e) => setIsland(e.target.value)}
            className="bg-stone-900 border border-stone-700 rounded px-2 py-1.5 text-xs text-stone-300 focus:outline-none focus:border-amber-600"
          >
            {ISLAND_NAMES.map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        </span>
      </div>
      <div className="flex flex-col gap-1" aria-label="Résultats des générateurs">
        {results.map((r, i) => (
          <p key={`${i}-${r.text}`} className={`text-sm rounded border border-stone-800 bg-stone-900/50 px-3 py-2 ${i === 0 ? 'text-stone-100' : 'text-stone-500'}`}>
            {r.icon} {r.text}
          </p>
        ))}
      </div>
    </section>
  )
}

const GEN_BTN =
  'px-3 py-1.5 rounded bg-stone-800 hover:bg-stone-700 border border-stone-700 text-stone-300 text-sm transition-colors'
