import { useRef, useState } from 'react'
import { useGMStore } from '../../store/gmStore'
import type { NPC, RuleSection, SessionNote } from '../../types'

interface CampaignExport {
  npcs: NPC[]
  rules: RuleSection[]
  notes: SessionNote[]
}

// Accepte notre export direct { npcs, rules, notes } mais aussi le format
// zustand-persist de campaign-data.json ({ state: {...}, version }).
function parseCampaignFile(raw: string): CampaignExport | null {
  try {
    let data = JSON.parse(raw)
    if (data && typeof data === 'object' && 'state' in data) data = data.state
    if (!data || !Array.isArray(data.npcs) || !Array.isArray(data.rules) || !Array.isArray(data.notes)) {
      return null
    }
    return { npcs: data.npcs, rules: data.rules, notes: data.notes }
  } catch {
    return null
  }
}

export default function CampaignMenu() {
  const fileInput = useRef<HTMLInputElement | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)

  const flash = (msg: string) => {
    setFeedback(msg)
    setTimeout(() => setFeedback(null), 3000)
  }

  const exportCampaign = () => {
    const { npcs, rules, notes } = useGMStore.getState()
    const blob = new Blob([JSON.stringify({ npcs, rules, notes }, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `aberkaer-campagne-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const importCampaign = async (file: File) => {
    const parsed = parseCampaignFile(await file.text())
    if (!parsed) {
      flash('⚠ Fichier invalide')
      return
    }
    const ok = window.confirm(
      `Remplacer la campagne actuelle par « ${file.name} » ?\n(${parsed.npcs.length} PNJ, ${parsed.rules.length} règles, ${parsed.notes.length} notes)\n\nPense à exporter d'abord si tu veux garder l'état actuel.`
    )
    if (!ok) return
    useGMStore.setState({ npcs: parsed.npcs, rules: parsed.rules, notes: parsed.notes })
    flash('✓ Campagne importée')
  }

  return (
    <div className="flex items-center gap-2">
      {feedback && <span className="text-xs text-stone-400">{feedback}</span>}
      <button
        onClick={exportCampaign}
        title="Télécharger la campagne (PNJ, règles, notes) en JSON"
        className="text-xs px-3 py-1 rounded border border-stone-700 text-stone-400 hover:text-stone-200 hover:border-stone-600 transition-colors"
      >
        ⬇ Exporter
      </button>
      <button
        onClick={() => fileInput.current?.click()}
        title="Restaurer une campagne depuis un fichier JSON"
        className="text-xs px-3 py-1 rounded border border-stone-700 text-stone-400 hover:text-stone-200 hover:border-stone-600 transition-colors"
      >
        ⬆ Importer
      </button>
      <input
        ref={fileInput}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) void importCampaign(file)
          e.target.value = ''
        }}
      />
    </div>
  )
}
