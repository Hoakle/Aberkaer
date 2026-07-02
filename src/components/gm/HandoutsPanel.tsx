import { useId, useState } from 'react'
import { useGMStore } from '../../store/gmStore'
import { usePushDisplay } from '../../hooks/useTableSync'
import Markdown from '../Markdown'
import type { Handout } from '../../types'

const emptyHandout: Omit<Handout, 'id'> = { title: '', content: '', imageUrl: '' }

// Documents à remettre aux joueurs : lettres, avis, cartes au trésor...
// « Montrer » les affiche en rendu parchemin sur l'écran joueurs.
export default function HandoutsPanel() {
  const { handouts, addHandout, updateHandout, deleteHandout, display } = useGMStore()
  const pushDisplay = usePushDisplay()
  const [editingId, setEditingId] = useState<string | 'new' | null>(null)

  const shownTitle = display.handout?.title ?? null

  const push = (handout: { title: string; content: string; imageUrl: string } | null) => {
    useGMStore.getState().updateDisplay({ handout })
    pushDisplay({ handout })
  }

  const editingHandout = editingId && editingId !== 'new' ? handouts.find((h) => h.id === editingId) : null

  return (
    <div className="flex flex-col gap-3 max-w-3xl">
      <div className="flex items-center justify-between gap-2">
        <button
          onClick={() => setEditingId('new')}
          className="px-3 py-1.5 rounded bg-amber-900/40 hover:bg-amber-800/50 text-amber-300 text-sm font-medium border border-amber-800/40 transition-colors"
        >
          + Nouveau document
        </button>
        {shownTitle && (
          <button
            onClick={() => push(null)}
            className="px-3 py-1.5 rounded border border-amber-700 bg-amber-950/40 text-amber-300 text-sm transition-colors hover:bg-amber-900/40"
          >
            Masquer « {shownTitle} »
          </button>
        )}
      </div>

      {editingId && (
        <HandoutForm
          initial={editingHandout ?? emptyHandout}
          onSave={(data) => {
            if (editingId === 'new') addHandout(data)
            else updateHandout(editingId, data)
            setEditingId(null)
          }}
          onCancel={() => setEditingId(null)}
          onDelete={
            editingHandout
              ? () => {
                  if (shownTitle === editingHandout.title) push(null)
                  deleteHandout(editingHandout.id)
                  setEditingId(null)
                }
              : undefined
          }
        />
      )}

      <div className="flex flex-col gap-2">
        {handouts.map((h) => (
          <div key={h.id} className="rounded border border-stone-800 bg-stone-900/50 p-3 flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-stone-200 flex-1">📜 {h.title}</span>
              {shownTitle === h.title ? (
                <button
                  onClick={() => push(null)}
                  className="px-3 py-1 rounded border border-amber-700 bg-amber-950/40 text-amber-300 text-xs transition-colors"
                >
                  👁 Affiché — masquer
                </button>
              ) : (
                <button
                  onClick={() => push({ title: h.title, content: h.content, imageUrl: h.imageUrl })}
                  className="px-3 py-1 rounded bg-stone-800 hover:bg-stone-700 border border-stone-700 text-stone-300 text-xs transition-colors"
                >
                  Montrer aux joueurs
                </button>
              )}
              <button
                onClick={() => setEditingId(h.id)}
                className="px-2 py-1 rounded border border-stone-700 text-stone-400 hover:text-stone-200 text-xs transition-colors"
              >
                ✎
              </button>
            </div>
            {/* Aperçu parchemin compact */}
            <div className="rounded bg-[#efe3c8] text-stone-900 px-4 py-3 font-serif text-sm max-h-40 overflow-y-auto">
              {h.imageUrl && <img src={h.imageUrl} alt="" className="max-h-24 rounded mb-2" />}
              <Markdown content={h.content} />
            </div>
          </div>
        ))}
        {handouts.length === 0 && (
          <p className="text-stone-500 text-sm text-center py-4">Aucun document préparé.</p>
        )}
      </div>
    </div>
  )
}

function HandoutForm({
  initial,
  onSave,
  onCancel,
  onDelete,
}: {
  initial: Omit<Handout, 'id'>
  onSave: (data: Omit<Handout, 'id'>) => void
  onCancel: () => void
  onDelete?: () => void
}) {
  const [form, setForm] = useState({ ...initial })
  const titleId = useId()
  const contentId = useId()
  const imageId = useId()

  return (
    <div className="rounded border border-stone-700 bg-stone-900/60 p-3 flex flex-col gap-2">
      <div className="flex flex-col gap-1">
        <label htmlFor={titleId} className="text-xs text-stone-400">Titre du document</label>
        <input
          id={titleId}
          value={form.title}
          onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          className="bg-stone-900 border border-stone-700 rounded px-3 py-1.5 text-sm text-stone-100 focus:outline-none focus:border-amber-600"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor={contentId} className="text-xs text-stone-400">Contenu (Markdown : *italique*, **gras**, titres #, listes -)</label>
        <textarea
          id={contentId}
          value={form.content}
          onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
          rows={8}
          className="bg-stone-900 border border-stone-700 rounded px-3 py-2 text-sm text-stone-100 focus:outline-none focus:border-amber-600 font-mono resize-y"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor={imageId} className="text-xs text-stone-400">Image (optionnel — URL ou /media/...)</label>
        <input
          id={imageId}
          value={form.imageUrl}
          onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value }))}
          placeholder="/media/carte-au-tresor.jpg"
          className="bg-stone-900 border border-stone-700 rounded px-3 py-1.5 text-sm text-stone-100 focus:outline-none focus:border-amber-600"
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
