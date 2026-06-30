import { useState } from 'react'
import { useGMStore } from '../../store/gmStore'
import type { RuleSection } from '../../types'

const emptyRule: Omit<RuleSection, 'id'> = { title: '', content: '' }

export default function RulesPanel() {
  const { rules, addRule, updateRule, deleteRule } = useGMStore()
  const [selected, setSelected] = useState<string | null>(null)
  const [editing, setEditing] = useState<Omit<RuleSection, 'id'>>(emptyRule)
  const [isCreating, setIsCreating] = useState(false)

  const openCreate = () => {
    setSelected(null)
    setEditing(emptyRule)
    setIsCreating(true)
  }

  const openEdit = (rule: RuleSection) => {
    setIsCreating(false)
    setSelected(rule.id)
    setEditing({ title: rule.title, content: rule.content })
  }

  const save = () => {
    if (!editing.title.trim()) return
    if (isCreating) {
      addRule(editing)
      setIsCreating(false)
    } else if (selected) {
      updateRule(selected, editing)
    }
    setSelected(null)
  }

  const cancel = () => { setSelected(null); setIsCreating(false) }

  return (
    <div className="flex gap-3 h-full min-h-0">
      {/* List */}
      <div className="w-44 flex-shrink-0 flex flex-col gap-1">
        <button
          onClick={openCreate}
          className="w-full text-left px-3 py-2 rounded bg-blue-950/50 hover:bg-blue-900/50 text-blue-300 text-sm font-medium border border-blue-900/40 transition-colors"
        >
          + Nouvelle section
        </button>
        <div className="flex flex-col gap-1 overflow-y-auto">
          {rules.map((rule) => (
            <button
              key={rule.id}
              onClick={() => openEdit(rule)}
              className={`w-full text-left px-3 py-2 rounded text-sm transition-colors border ${
                selected === rule.id
                  ? 'bg-stone-700 border-stone-500 text-stone-100'
                  : 'bg-stone-900 border-stone-800 text-stone-300 hover:bg-stone-800'
              }`}
            >
              <div className="truncate">{rule.title}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Content area */}
      <div className="flex-1 min-w-0 overflow-y-auto">
        {isCreating || selected ? (
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-stone-400">Titre de la section</label>
              <input
                value={editing.title}
                onChange={(e) => setEditing((p) => ({ ...p, title: e.target.value }))}
                className="bg-stone-900 border border-stone-700 rounded px-3 py-1.5 text-sm text-stone-100 focus:outline-none focus:border-blue-600"
              />
            </div>
            <div className="flex flex-col gap-1 flex-1">
              <label className="text-xs text-stone-400">Contenu (Markdown basique supporté)</label>
              <textarea
                value={editing.content}
                onChange={(e) => setEditing((p) => ({ ...p, content: e.target.value }))}
                rows={12}
                className="bg-stone-900 border border-stone-700 rounded px-3 py-2 text-sm text-stone-100 focus:outline-none focus:border-blue-600 font-mono resize-y"
              />
            </div>
            <div className="flex gap-2">
              <button onClick={save} className="px-4 py-1.5 rounded bg-blue-800 hover:bg-blue-700 text-sm font-medium transition-colors">
                Sauvegarder
              </button>
              <button onClick={cancel} className="px-4 py-1.5 rounded bg-stone-800 hover:bg-stone-700 text-sm transition-colors">
                Annuler
              </button>
              {!isCreating && selected && (
                <button
                  onClick={() => { deleteRule(selected); cancel() }}
                  className="ml-auto px-4 py-1.5 rounded bg-red-950 hover:bg-red-900 text-red-400 text-sm transition-colors"
                >
                  Supprimer
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="text-stone-500 text-sm pt-4 text-center">
            Sélectionne une section ou crée-en une nouvelle.
          </div>
        )}
      </div>
    </div>
  )
}
