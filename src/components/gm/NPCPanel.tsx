import { useId, useState } from 'react'
import { useGMStore } from '../../store/gmStore'
import type { NPC } from '../../types'

const emptyNPC: Omit<NPC, 'id'> = {
  name: '',
  role: '',
  stats: '',
  description: '',
  secrets: '',
  imageUrl: '',
}

type Mode = 'read' | 'edit' | 'create'

export default function NPCPanel() {
  const { npcs, addNPC, updateNPC, deleteNPC } = useGMStore()
  const [selected, setSelected] = useState<string | null>(null)
  const [mode, setMode] = useState<Mode>('read')
  const [editing, setEditing] = useState<Omit<NPC, 'id'>>(emptyNPC)
  const [nameError, setNameError] = useState(false)
  const [showGraph, setShowGraph] = useState(false)

  const activeNPC = selected ? npcs.find((n) => n.id === selected) : null

  const openCreate = () => {
    setSelected(null)
    setEditing(emptyNPC)
    setNameError(false)
    setMode('create')
  }

  const openRead = (npc: NPC) => {
    setSelected(npc.id)
    setMode('read')
  }

  const openEdit = () => {
    if (!activeNPC) return
    const { id: _id, ...data } = activeNPC
    setEditing(data)
    setNameError(false)
    setMode('edit')
  }

  const save = () => {
    if (!editing.name.trim()) {
      setNameError(true)
      return
    }
    if (mode === 'create') {
      addNPC(editing)
      setSelected(null)
      setMode('read')
    } else if (selected) {
      updateNPC(selected, editing)
      setMode('read')
    }
  }

  const cancel = () => {
    setMode('read')
    if (mode === 'create') setSelected(null)
  }

  if (showGraph) {
    return (
      <div className="flex flex-col gap-2 max-w-3xl">
        <div className="flex items-center justify-between">
          <p className="text-xs text-stone-500">
            Relations déduites des mentions croisées dans les rôles, descriptions et secrets.
            Clique sur un PNJ pour ouvrir sa fiche.
          </p>
          <button
            onClick={() => setShowGraph(false)}
            className="px-3 py-1.5 rounded border border-stone-700 text-stone-300 hover:bg-stone-800 text-xs transition-colors"
          >
            ← Retour à la liste
          </button>
        </div>
        <RelationGraph
          npcs={npcs}
          onSelect={(id) => {
            setShowGraph(false)
            const npc = npcs.find((n) => n.id === id)
            if (npc) openRead(npc)
          }}
        />
      </div>
    )
  }

  return (
    <div className="flex gap-3 h-full min-h-0">
      {/* List */}
      <div className="w-48 flex-shrink-0 flex flex-col gap-1">
        <button
          onClick={openCreate}
          className="w-full text-left px-3 py-2 rounded bg-amber-900/40 hover:bg-amber-800/50 text-amber-300 text-sm font-medium border border-amber-800/40 transition-colors"
        >
          + Nouveau PNJ
        </button>
        <button
          onClick={() => setShowGraph(true)}
          className="w-full text-left px-3 py-2 rounded bg-stone-900 hover:bg-stone-800 text-stone-400 hover:text-stone-200 text-sm border border-stone-800 transition-colors"
        >
          🕸 Relations
        </button>
        <div className="flex flex-col gap-1 overflow-y-auto">
          {npcs.map((npc) => (
            <button
              key={npc.id}
              onClick={() => openRead(npc)}
              className={`w-full text-left px-3 py-2 rounded text-sm transition-colors border ${
                selected === npc.id
                  ? 'bg-stone-700 border-stone-500 text-stone-100'
                  : 'bg-stone-900 border-stone-800 text-stone-300 hover:bg-stone-800'
              }`}
            >
              <div className="font-medium truncate">{npc.name}</div>
              <div className="text-xs text-stone-500 truncate">{npc.role}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Detail / Form */}
      <div className="flex-1 min-w-0 overflow-y-auto">
        {mode !== 'read' ? (
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              <Field
                label="Nom *"
                value={editing.name}
                onChange={(v) => { setEditing((e) => ({ ...e, name: v })); if (v.trim()) setNameError(false) }}
                error={nameError ? 'Le nom est requis' : undefined}
              />
              <Field label="Rôle" value={editing.role} onChange={(v) => setEditing((e) => ({ ...e, role: v }))} />
            </div>
            <TextArea label="Stats / Compétences" value={editing.stats} rows={2} onChange={(v) => setEditing((e) => ({ ...e, stats: v }))} />
            <TextArea label="Description (visible aux joueurs)" value={editing.description} rows={3} onChange={(v) => setEditing((e) => ({ ...e, description: v }))} />
            <TextArea label="Secrets (MJ uniquement)" value={editing.secrets} rows={3} onChange={(v) => setEditing((e) => ({ ...e, secrets: v }))} redBorder />
            <Field label="URL de l'image" value={editing.imageUrl} onChange={(v) => setEditing((e) => ({ ...e, imageUrl: v }))} placeholder="https://..." />
            {editing.imageUrl && <NPCImage url={editing.imageUrl} className="h-32 w-full object-cover rounded border border-stone-700" />}
            <div className="flex gap-2">
              <button onClick={save} className="px-4 py-1.5 rounded bg-amber-700 hover:bg-amber-600 text-sm font-medium transition-colors">
                Sauvegarder
              </button>
              <button onClick={cancel} className="px-4 py-1.5 rounded bg-stone-800 hover:bg-stone-700 text-sm transition-colors">
                Annuler
              </button>
              {mode === 'edit' && activeNPC && (
                <button
                  onClick={() => { deleteNPC(activeNPC.id); setSelected(null); setMode('read') }}
                  className="ml-auto px-4 py-1.5 rounded bg-red-950 hover:bg-red-900 text-red-400 text-sm transition-colors"
                >
                  Supprimer
                </button>
              )}
            </div>
          </div>
        ) : activeNPC ? (
          <div className="flex flex-col gap-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className="text-lg font-semibold text-amber-200">{activeNPC.name}</h2>
                <p className="text-sm text-stone-400">{activeNPC.role}</p>
              </div>
              <button
                onClick={openEdit}
                className="px-3 py-1 rounded border border-stone-700 text-stone-400 hover:text-stone-200 hover:border-stone-600 text-xs transition-colors flex-shrink-0"
              >
                ✎ Modifier
              </button>
            </div>
            {activeNPC.imageUrl && (
              <NPCImage url={activeNPC.imageUrl} className="h-40 w-full object-cover rounded border border-stone-700" />
            )}
            {activeNPC.stats && (
              <ReadBlock label="Stats / Compétences">
                <pre className="whitespace-pre-wrap font-mono text-xs text-stone-300">{activeNPC.stats}</pre>
              </ReadBlock>
            )}
            {activeNPC.description && (
              <ReadBlock label="Description (visible aux joueurs)">
                <p className="whitespace-pre-wrap text-sm text-stone-200 leading-relaxed">{activeNPC.description}</p>
              </ReadBlock>
            )}
            {activeNPC.secrets && (
              <div className="rounded border border-red-900/50 bg-red-950/20 p-3">
                <p className="text-xs text-red-400 uppercase tracking-wider mb-1">🔒 Secrets — MJ uniquement</p>
                <p className="whitespace-pre-wrap text-sm text-red-200/90 leading-relaxed">{activeNPC.secrets}</p>
              </div>
            )}
          </div>
        ) : (
          <div className="text-stone-500 text-sm pt-4 text-center">
            Sélectionne un PNJ ou crée-en un nouveau.
          </div>
        )}
      </div>
    </div>
  )
}

// Le nom « court » d'un PNJ pour détecter les mentions : « Frère Omric » se
// fait appeler Omric, Isla « La Nœud » simplement Isla.
function shortName(name: string): string {
  const words = name.replace(/["«»]/g, ' ').split(/\s+/).filter((w) => w.length >= 4)
  return words[words.length > 1 && ['Frère', 'Lord', 'Dame', 'Grand'].includes(words[0]) ? 1 : 0] ?? name
}

function RelationGraph({ npcs, onSelect }: { npcs: NPC[]; onSelect: (id: string) => void }) {
  const n = npcs.length
  const cx = 50
  const cy = 38
  const radius = 28
  const positions = npcs.map((npc, i) => {
    const angle = (i / Math.max(1, n)) * 2 * Math.PI - Math.PI / 2
    return { npc, x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) }
  })

  const textOf = (npc: NPC) => `${npc.role} ${npc.description} ${npc.secrets}`.toLowerCase()
  const edges: { a: number; b: number }[] = []
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const nameI = shortName(npcs[i].name).toLowerCase()
      const nameJ = shortName(npcs[j].name).toLowerCase()
      if (textOf(npcs[i]).includes(nameJ) || textOf(npcs[j]).includes(nameI)) {
        edges.push({ a: i, b: j })
      }
    }
  }

  if (n === 0) return <p className="text-stone-500 text-sm text-center py-8">Aucun PNJ.</p>

  return (
    <svg viewBox="0 0 100 76" className="w-full rounded border border-stone-800 bg-stone-950" role="img" aria-label="Graphe de relations des PNJ">
      {edges.map((e) => (
        <line
          key={`${e.a}-${e.b}`}
          x1={positions[e.a].x}
          y1={positions[e.a].y}
          x2={positions[e.b].x}
          y2={positions[e.b].y}
          stroke="#57534e"
          strokeWidth="0.35"
          opacity="0.8"
        />
      ))}
      {positions.map(({ npc, x, y }) => (
        <g key={npc.id} onClick={() => onSelect(npc.id)} className="cursor-pointer">
          <circle cx={x} cy={y} r="3" fill="#292524" stroke="#b45309" strokeWidth="0.4" />
          <text x={x} y={y + 0.9} textAnchor="middle" fontSize="2.6">👤</text>
          <text x={x} y={y + 6} textAnchor="middle" fontSize="2.3" fill="#e7e5e4" fontWeight="600">
            {npc.name}
          </text>
        </g>
      ))}
    </svg>
  )
}

function ReadBlock({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded border border-stone-800 bg-stone-900/60 p-3">
      <p className="text-xs text-stone-500 uppercase tracking-wider mb-1">{label}</p>
      {children}
    </div>
  )
}

function NPCImage({ url, className }: { url: string; className: string }) {
  const [error, setError] = useState(false)
  const [lastUrl, setLastUrl] = useState(url)
  if (url !== lastUrl) {
    setLastUrl(url)
    setError(false)
  }
  if (error) {
    return (
      <div className={`${className} flex items-center justify-center bg-stone-900 text-stone-600 text-xs`}>
        Image introuvable — vérifie l'URL
      </div>
    )
  }
  return <img src={url} alt="" onError={() => setError(true)} className={className} key={url} />
}

function Field({ label, value, onChange, placeholder, error }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; error?: string }) {
  const id = useId()
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-xs text-stone-400">{label}</label>
      <input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`bg-stone-900 border rounded px-3 py-1.5 text-sm text-stone-100 focus:outline-none ${
          error ? 'border-red-700 focus:border-red-500' : 'border-stone-700 focus:border-amber-600'
        }`}
      />
      {error && <span className="text-xs text-red-400">{error}</span>}
    </div>
  )
}

function TextArea({ label, value, onChange, rows = 4, redBorder }: { label: string; value: string; onChange: (v: string) => void; rows?: number; redBorder?: boolean }) {
  const id = useId()
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-xs text-stone-400">{label}</label>
      <textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        className={`bg-stone-900 border rounded px-3 py-1.5 text-sm text-stone-100 focus:outline-none resize-y ${
          redBorder ? 'border-red-900/60 focus:border-red-600' : 'border-stone-700 focus:border-amber-600'
        }`}
      />
    </div>
  )
}
