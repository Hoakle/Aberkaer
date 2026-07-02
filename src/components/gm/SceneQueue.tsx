import { useId, useState } from 'react'
import { useGMStore } from '../../store/gmStore'
import { useScenePlayer } from '../../hooks/useScenePlayer'
import type { Scene } from '../../types'

const emptyScene: Omit<Scene, 'id'> = {
  name: '',
  imageUrl: '',
  audioUrl: '',
  caption: '',
  overlayText: '',
}

// La séance se prépare avant la table : une liste ordonnée de scènes
// (image + son + texte) qu'on déroule ensuite au clavier (→) pendant le jeu.
export default function SceneQueue() {
  const { scenes, sceneIndex, addScene, updateScene, deleteScene, moveScene } = useGMStore()
  const playScene = useScenePlayer()
  const [editingId, setEditingId] = useState<string | 'new' | null>(null)

  const editing = editingId && editingId !== 'new' ? scenes.find((s) => s.id === editingId) : null

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-stone-400 uppercase tracking-wider">
          File de scènes
        </p>
        <button
          onClick={() => setEditingId('new')}
          className="px-3 py-1 rounded bg-stone-800 hover:bg-stone-700 border border-stone-700 text-stone-300 text-xs transition-colors"
        >
          + Scène
        </button>
      </div>
      <p className="text-xs text-stone-600">
        Raccourcis (hors champs de saisie) : <kbd>→</kbd>/<kbd>←</kbd> scène suivante/précédente ·{' '}
        <kbd>1</kbd>–<kbd>9</kbd> scène directe · <kbd>Espace</kbd> play/pause · <kbd>B</kbd> rideau
      </p>

      {editingId && (
        <SceneForm
          initial={editing ?? emptyScene}
          onSave={(data) => {
            if (editingId === 'new') addScene(data)
            else updateScene(editingId, data)
            setEditingId(null)
          }}
          onCancel={() => setEditingId(null)}
          onDelete={
            editing
              ? () => {
                  deleteScene(editing.id)
                  setEditingId(null)
                }
              : undefined
          }
        />
      )}

      <div className="flex flex-col gap-1">
        {scenes.map((scene, i) => (
          <div
            key={scene.id}
            className={`flex items-center gap-2 rounded border px-2 py-1.5 ${
              i === sceneIndex ? 'border-amber-700 bg-amber-950/20' : 'border-stone-800 bg-stone-900/50'
            }`}
          >
            <span className="text-xs text-stone-600 w-4 text-center">{i < 9 ? i + 1 : '·'}</span>
            <button
              onClick={() => playScene(i)}
              title={`Jouer la scène ${scene.name}`}
              className="px-2 py-0.5 rounded bg-green-950/60 hover:bg-green-900/60 border border-green-900/50 text-green-300 text-xs transition-colors"
            >
              ▶
            </button>
            <span className="text-sm text-stone-200 flex-1 truncate">{scene.name}</span>
            <span className="text-xs text-stone-600">
              {scene.imageUrl && '🖼'} {scene.audioUrl && '🎵'} {scene.overlayText && '💬'}
            </span>
            <span className="flex gap-0.5">
              <button onClick={() => moveScene(scene.id, -1)} title={`Monter ${scene.name}`} className={SC_BTN}>↑</button>
              <button onClick={() => moveScene(scene.id, 1)} title={`Descendre ${scene.name}`} className={SC_BTN}>↓</button>
              <button onClick={() => setEditingId(scene.id)} title={`Modifier ${scene.name}`} className={SC_BTN}>✎</button>
            </span>
          </div>
        ))}
        {scenes.length === 0 && (
          <p className="text-xs text-stone-600 text-center py-2">
            Aucune scène préparée — ajoute image, son et texte à l'avance, déroule au clavier pendant la partie.
          </p>
        )}
      </div>
    </div>
  )
}

const SC_BTN =
  'w-6 h-6 rounded bg-black/20 hover:bg-black/40 text-stone-500 hover:text-stone-300 text-xs transition-colors'

function SceneForm({
  initial,
  onSave,
  onCancel,
  onDelete,
}: {
  initial: Omit<Scene, 'id'>
  onSave: (data: Omit<Scene, 'id'>) => void
  onCancel: () => void
  onDelete?: () => void
}) {
  const [form, setForm] = useState({ ...initial })
  const nameId = useId()
  const imageId = useId()
  const audioId = useId()
  const captionId = useId()
  const textId = useId()

  return (
    <div className="rounded border border-stone-700 bg-stone-900/60 p-3 flex flex-col gap-2">
      <div className="grid grid-cols-2 gap-2">
        <Field id={nameId} label="Nom de la scène *" value={form.name} onChange={(v) => setForm((f) => ({ ...f, name: v }))} placeholder="ex. Arrivée au temple" />
        <Field id={captionId} label="Légende (affichée aux joueurs)" value={form.caption} onChange={(v) => setForm((f) => ({ ...f, caption: v }))} />
        <Field id={imageId} label="Image (URL ou /media/…)" value={form.imageUrl} onChange={(v) => setForm((f) => ({ ...f, imageUrl: v }))} placeholder="/media/temple.jpg" />
        <Field id={audioId} label="Ambiance (URL ou /media/… — vide = inchangée)" value={form.audioUrl} onChange={(v) => setForm((f) => ({ ...f, audioUrl: v }))} placeholder="/media/chants.mp3" />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor={textId} className="text-xs text-stone-400">Texte d'ambiance</label>
        <textarea
          id={textId}
          value={form.overlayText}
          onChange={(e) => setForm((f) => ({ ...f, overlayText: e.target.value }))}
          rows={2}
          className="bg-stone-900 border border-stone-700 rounded px-3 py-1.5 text-sm text-stone-100 focus:outline-none focus:border-amber-600 resize-y"
        />
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => form.name.trim() && onSave(form)}
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

function Field({ id, label, value, onChange, placeholder }: { id: string; label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-xs text-stone-400">{label}</label>
      <input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="bg-stone-900 border border-stone-700 rounded px-3 py-1.5 text-sm text-stone-100 focus:outline-none focus:border-amber-600"
      />
    </div>
  )
}
