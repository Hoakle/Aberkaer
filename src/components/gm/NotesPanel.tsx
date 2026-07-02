import { useState } from 'react'
import { useGMStore } from '../../store/gmStore'
import Markdown from '../Markdown'
import type { SessionNote } from '../../types'

const CATEGORIES: SessionNote['category'][] = ['objectif', 'hook', 'reminder', 'autre']

const CATEGORY_STYLES: Record<SessionNote['category'], string> = {
  objectif: 'bg-green-950/50 border-green-900/40 text-green-300',
  hook: 'bg-purple-950/50 border-purple-900/40 text-purple-300',
  reminder: 'bg-amber-950/50 border-amber-900/40 text-amber-300',
  autre: 'bg-stone-800 border-stone-700 text-stone-300',
}

const CATEGORY_BADGE: Record<SessionNote['category'], string> = {
  objectif: 'bg-green-900/60 text-green-300',
  hook: 'bg-purple-900/60 text-purple-300',
  reminder: 'bg-amber-900/60 text-amber-300',
  autre: 'bg-stone-700 text-stone-300',
}

const emptyNote: Omit<SessionNote, 'id'> = { title: '', content: '', category: 'objectif' }

export default function NotesPanel() {
  const { notes, addNote, updateNote, deleteNote } = useGMStore()
  const [editing, setEditing] = useState<(Omit<SessionNote, 'id'> & { id?: string }) | null>(null)

  const save = () => {
    if (!editing) return
    if (editing.id) {
      updateNote(editing.id, editing)
    } else {
      addNote(editing)
    }
    setEditing(null)
  }

  return (
    <div className="flex flex-col gap-3 h-full min-h-0">
      <button
        onClick={() => setEditing({ ...emptyNote })}
        className="w-full text-left px-3 py-2 rounded bg-green-950/50 hover:bg-green-900/40 text-green-300 text-sm font-medium border border-green-900/40 transition-colors"
      >
        + Nouvelle note
      </button>

      {editing && (
        <div className="flex flex-col gap-2 p-3 rounded border border-stone-700 bg-stone-900/60">
          <div className="flex gap-2">
            <input
              value={editing.title}
              onChange={(e) => setEditing((p) => p && ({ ...p, title: e.target.value }))}
              placeholder="Titre de la note"
              className="flex-1 bg-stone-800 border border-stone-700 rounded px-3 py-1.5 text-sm text-stone-100 focus:outline-none focus:border-amber-600"
            />
            <select
              value={editing.category}
              onChange={(e) => setEditing((p) => p && ({ ...p, category: e.target.value as SessionNote['category'] }))}
              className="bg-stone-800 border border-stone-700 rounded px-2 py-1.5 text-sm text-stone-300 focus:outline-none focus:border-amber-600"
            >
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <textarea
            value={editing.content}
            onChange={(e) => setEditing((p) => p && ({ ...p, content: e.target.value }))}
            placeholder="Contenu de la note..."
            rows={5}
            className="bg-stone-800 border border-stone-700 rounded px-3 py-2 text-sm text-stone-100 focus:outline-none focus:border-amber-600 resize-y"
          />
          <div className="flex gap-2">
            <button onClick={save} className="px-4 py-1.5 rounded bg-amber-700 hover:bg-amber-600 text-sm font-medium transition-colors">
              Sauvegarder
            </button>
            <button onClick={() => setEditing(null)} className="px-4 py-1.5 rounded bg-stone-800 hover:bg-stone-700 text-sm transition-colors">
              Annuler
            </button>
          </div>
        </div>
      )}

      <div className="overflow-y-auto flex flex-col gap-2">
        {notes.map((note) => (
          <div key={note.id} className={`rounded border p-3 ${CATEGORY_STYLES[note.category]}`}>
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${CATEGORY_BADGE[note.category]}`}>
                    {note.category}
                  </span>
                  <span className="text-sm font-medium truncate">{note.title}</span>
                </div>
                <Markdown content={note.content} className="text-xs opacity-80" />
              </div>
              <div className="flex gap-1 flex-shrink-0">
                <button
                  onClick={() => setEditing({ ...note })}
                  className="text-xs px-2 py-1 rounded bg-black/20 hover:bg-black/40 transition-colors"
                >
                  ✎
                </button>
                <button
                  onClick={() => deleteNote(note.id)}
                  className="text-xs px-2 py-1 rounded bg-black/20 hover:bg-red-900/60 transition-colors"
                >
                  ×
                </button>
              </div>
            </div>
          </div>
        ))}
        {notes.length === 0 && (
          <div className="text-stone-500 text-sm text-center py-4">Aucune note pour cette session.</div>
        )}
      </div>
    </div>
  )
}
