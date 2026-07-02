import { useEffect, useMemo, useRef } from 'react'
import { useGMStore } from '../../store/gmStore'

// Un onglet cible par type de résultat (doit correspondre aux ids de GMView)
export type SearchTab =
  | 'party'
  | 'npcs'
  | 'rules'
  | 'notes'
  | 'handouts'
  | 'clocks'
  | 'map'
  | 'campaign'

interface SearchResult {
  icon: string
  kind: string
  title: string
  excerpt: string
  tab: SearchTab
}

function excerptAround(text: string, query: string): string {
  const clean = text.replace(/\s+/g, ' ').trim()
  const i = clean.toLowerCase().indexOf(query)
  if (i === -1) return clean.slice(0, 100)
  const start = Math.max(0, i - 45)
  return (
    (start > 0 ? '…' : '') + clean.slice(start, Math.min(clean.length, i + query.length + 60)) + '…'
  )
}

// Cherche dans toute la campagne : la fiche d'Omric, la note qui le mentionne
// et l'événement de timeline ressortent d'un seul Ctrl+K.
function useSearchResults(query: string): SearchResult[] {
  const store = useGMStore()
  return useMemo(() => {
    const q = query.trim().toLowerCase()
    if (q.length < 2) return []
    const results: SearchResult[] = []
    const grab = (fields: string[], make: (matched: string) => SearchResult) => {
      const matched = fields.find((f) => f.toLowerCase().includes(q))
      if (matched !== undefined) results.push(make(matched))
    }

    for (const npc of store.npcs) {
      grab([npc.name, npc.role, npc.description, npc.secrets, npc.stats], (m) => ({
        icon: '👤', kind: 'PNJ', title: npc.name, excerpt: excerptAround(m, q), tab: 'npcs',
      }))
    }
    for (const c of store.characters) {
      grab([c.name, c.player, c.notes, ...c.truths], (m) => ({
        icon: '🎭', kind: 'PJ', title: c.name, excerpt: excerptAround(m, q), tab: 'party',
      }))
    }
    for (const rule of store.rules) {
      grab([rule.title, rule.content], (m) => ({
        icon: '📖', kind: 'Règle', title: rule.title, excerpt: excerptAround(m, q), tab: 'rules',
      }))
    }
    for (const note of store.notes) {
      grab([note.title, note.content], (m) => ({
        icon: '📝', kind: 'Note', title: note.title, excerpt: excerptAround(m, q), tab: 'notes',
      }))
    }
    for (const h of store.handouts) {
      grab([h.title, h.content], (m) => ({
        icon: '📜', kind: 'Document', title: h.title, excerpt: excerptAround(m, q), tab: 'handouts',
      }))
    }
    for (const log of store.sessionLogs) {
      grab([log.title, log.content], (m) => ({
        icon: '📔', kind: 'Session', title: `${log.date} — ${log.title}`, excerpt: excerptAround(m, q), tab: 'campaign',
      }))
    }
    for (const e of store.timeline) {
      grab([e.title, e.playersKnow, e.truth, e.when], (m) => ({
        icon: '🧵', kind: 'Timeline', title: `${e.when} — ${e.title}`, excerpt: excerptAround(m, q), tab: 'campaign',
      }))
    }
    for (const clock of store.clocks) {
      grab([clock.label], () => ({
        icon: '⏳', kind: 'Horloge', title: `${clock.label} — J-${clock.value}`, excerpt: '', tab: 'clocks',
      }))
    }
    for (const pin of store.mapPins) {
      grab([pin.label, pin.note], (m) => ({
        icon: '📍', kind: 'Repère', title: pin.label, excerpt: excerptAround(m, q), tab: 'map',
      }))
    }
    return results.slice(0, 20)
  }, [store, query])
}

export default function SearchPalette({
  query,
  setQuery,
  onClose,
  onNavigate,
}: {
  query: string
  setQuery: (q: string) => void
  onClose: () => void
  onNavigate: (tab: SearchTab) => void
}) {
  const results = useSearchResults(query)
  const inputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    inputRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-start justify-center pt-24" onClick={onClose}>
      <div
        className="w-full max-w-xl mx-4 rounded-lg border border-stone-700 bg-stone-900 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Chercher un PNJ, une note, une règle, un secret… (Échap pour fermer)"
          aria-label="Recherche globale"
          className="w-full bg-stone-950 px-4 py-3 text-sm text-stone-100 focus:outline-none border-b border-stone-800"
        />
        <div className="max-h-96 overflow-y-auto">
          {results.map((r, i) => (
            <button
              key={`${r.kind}-${r.title}-${i}`}
              onClick={() => {
                onNavigate(r.tab)
                onClose()
              }}
              className="w-full text-left px-4 py-2.5 hover:bg-stone-800/70 transition-colors border-b border-stone-800/50 last:border-b-0"
            >
              <div className="flex items-center gap-2">
                <span>{r.icon}</span>
                <span className="text-sm text-stone-200 font-medium">{r.title}</span>
                <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-stone-800 text-stone-500 uppercase tracking-wider">
                  {r.kind}
                </span>
              </div>
              {r.excerpt && <p className="text-xs text-stone-500 mt-0.5 pl-6">{r.excerpt}</p>}
            </button>
          ))}
          {query.trim().length >= 2 && results.length === 0 && (
            <p className="text-sm text-stone-500 text-center py-6">Aucun résultat pour « {query} »</p>
          )}
          {query.trim().length < 2 && (
            <p className="text-xs text-stone-600 text-center py-6">
              Tape au moins 2 caractères — la recherche couvre PNJ, PJ, règles, notes, documents,
              journal, timeline, horloges et repères de carte.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
