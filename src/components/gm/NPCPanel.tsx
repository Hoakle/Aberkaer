import { useState } from 'react'
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

export default function NPCPanel() {
  const { npcs, addNPC, updateNPC, deleteNPC } = useGMStore()
  const [selected, setSelected] = useState<string | null>(null)
  const [editing, setEditing] = useState<Omit<NPC, 'id'>>(emptyNPC)
  const [isCreating, setIsCreating] = useState(false)

  const openCreate = () => {
    setSelected(null)
    setEditing(emptyNPC)
    setIsCreating(true)
  }

  const openEdit = (npc: NPC) => {
    setIsCreating(false)
    setSelected(npc.id)
    setEditing({ name: npc.name, role: npc.role, stats: npc.stats, description: npc.description, secrets: npc.secrets, imageUrl: npc.imageUrl })
  }

  const save = () => {
    if (isCreating) {
      addNPC(editing)
      setIsCreating(false)
    } else if (selected) {
      updateNPC(selected, editing)
    }
    setSelected(null)
  }

  const cancel = () => {
    setSelected(null)
    setIsCreating(false)
  }

  const activeNPC = selected ? npcs.find((n) => n.id === selected) : null
  const showForm = isCreating || !!selected

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
        <div className="flex flex-col gap-1 overflow-y-auto">
          {npcs.map((npc) => (
            <button
              key={npc.id}
              onClick={() => openEdit(npc)}
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
        {showForm ? (
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Nom" value={editing.name} onChange={(v) => setEditing((e) => ({ ...e, name: v }))} />
              <Field label="Rôle" value={editing.role} onChange={(v) => setEditing((e) => ({ ...e, role: v }))} />
            </div>
            <Field label="Stats / Compétences" value={editing.stats} onChange={(v) => setEditing((e) => ({ ...e, stats: v }))} />
            <TextArea label="Description (visible aux joueurs)" value={editing.description} rows={3} onChange={(v) => setEditing((e) => ({ ...e, description: v }))} />
            <TextArea label="Secrets (MJ uniquement)" value={editing.secrets} rows={3} onChange={(v) => setEditing((e) => ({ ...e, secrets: v }))} redBorder />
            <Field label="URL de l'image" value={editing.imageUrl} onChange={(v) => setEditing((e) => ({ ...e, imageUrl: v }))} placeholder="https://..." />
            {editing.imageUrl && (
              <img src={editing.imageUrl} alt="preview" className="h-32 w-full object-cover rounded border border-stone-700" />
            )}
            <div className="flex gap-2">
              <button onClick={save} className="px-4 py-1.5 rounded bg-amber-700 hover:bg-amber-600 text-sm font-medium transition-colors">
                Sauvegarder
              </button>
              <button onClick={cancel} className="px-4 py-1.5 rounded bg-stone-800 hover:bg-stone-700 text-sm transition-colors">
                Annuler
              </button>
              {!isCreating && activeNPC && (
                <button
                  onClick={() => { deleteNPC(activeNPC.id); cancel() }}
                  className="ml-auto px-4 py-1.5 rounded bg-red-950 hover:bg-red-900 text-red-400 text-sm transition-colors"
                >
                  Supprimer
                </button>
              )}
            </div>
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

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-stone-400">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="bg-stone-900 border border-stone-700 rounded px-3 py-1.5 text-sm text-stone-100 focus:outline-none focus:border-amber-600"
      />
    </div>
  )
}

function TextArea({ label, value, onChange, rows = 4, redBorder }: { label: string; value: string; onChange: (v: string) => void; rows?: number; redBorder?: boolean }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-stone-400">{label}</label>
      <textarea
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
