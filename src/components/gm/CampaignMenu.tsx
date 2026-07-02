import { useEffect, useRef, useState } from 'react'
import { useGMStore } from '../../store/gmStore'
import type {
  NPC,
  RuleSection,
  SessionNote,
  Character,
  CampaignClock,
  CombatState,
  Handout,
  MapPin,
  Tide,
  SessionLog,
  TimelineEvent,
} from '../../types'

interface CampaignExport {
  npcs: NPC[]
  rules: RuleSection[]
  notes: SessionNote[]
  characters: Character[]
  clocks: CampaignClock[]
  combat: CombatState
  handouts: Handout[]
  mapPins: MapPin[]
  tide: Tide
  sessionLogs: SessionLog[]
  timeline: TimelineEvent[]
}

// Accepte notre export direct { npcs, rules, notes, ... } mais aussi le format
// zustand-persist de campaign-data.json ({ state: {...}, version }), y compris
// les exports antérieurs sans personnages/horloges/combat.
function parseCampaignFile(raw: string): CampaignExport | null {
  try {
    let data = JSON.parse(raw)
    if (data && typeof data === 'object' && 'state' in data) data = data.state
    if (!data || !Array.isArray(data.npcs) || !Array.isArray(data.rules) || !Array.isArray(data.notes)) {
      return null
    }
    return {
      npcs: data.npcs,
      rules: data.rules,
      notes: data.notes,
      characters: Array.isArray(data.characters) ? data.characters : [],
      clocks: Array.isArray(data.clocks) ? data.clocks : [],
      combat:
        data.combat && Array.isArray(data.combat.combatants)
          ? data.combat
          : { round: 1, turnIndex: 0, combatants: [] },
      handouts: Array.isArray(data.handouts) ? data.handouts : [],
      mapPins: Array.isArray(data.mapPins) ? data.mapPins : [],
      tide: data.tide === 'basse' ? 'basse' : 'haute',
      sessionLogs: Array.isArray(data.sessionLogs) ? data.sessionLogs : [],
      timeline: Array.isArray(data.timeline) ? data.timeline : [],
    }
  } catch {
    return null
  }
}

interface CampaignInfo {
  id: string
  name: string
}

export default function CampaignMenu() {
  const fileInput = useRef<HTMLInputElement | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [campaigns, setCampaigns] = useState<CampaignInfo[]>([])
  const [active, setActive] = useState('')

  useEffect(() => {
    fetch('/api/campaigns')
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data: { active: string; campaigns: CampaignInfo[] }) => {
        setCampaigns(data.campaigns)
        setActive(data.active)
      })
      .catch(() => {})
  }, [])

  const campaignAction = async (body: object) => {
    const res = await fetch('/api/campaigns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).catch(() => null)
    // Les données de la nouvelle campagne se chargent au rechargement.
    if (res?.ok) window.location.reload()
  }

  const onCampaignChange = (value: string) => {
    if (value === '__new') {
      const name = window.prompt('Nom de la nouvelle campagne :')
      if (name?.trim()) void campaignAction({ action: 'create', name })
    } else if (value === '__archive') {
      const name = campaigns.find((c) => c.id === active)?.name ?? active
      if (window.confirm(`Archiver la campagne « ${name} » ?\nSes données partent dans campaigns/archive/ — rien n'est supprimé.`)) {
        void campaignAction({ action: 'archive', id: active })
      }
    } else if (value !== active) {
      void campaignAction({ action: 'select', id: value })
    }
  }

  const flash = (msg: string) => {
    setFeedback(msg)
    setTimeout(() => setFeedback(null), 3000)
  }

  const exportCampaign = () => {
    const {
      npcs, rules, notes, characters, clocks, combat, handouts, mapPins, tide, sessionLogs, timeline,
    } = useGMStore.getState()
    const blob = new Blob(
      [
        JSON.stringify(
          { npcs, rules, notes, characters, clocks, combat, handouts, mapPins, tide, sessionLogs, timeline },
          null,
          2
        ),
      ],
      { type: 'application/json' }
    )
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
      `Remplacer la campagne actuelle par « ${file.name} » ?\n(${parsed.npcs.length} PNJ, ${parsed.rules.length} règles, ${parsed.notes.length} notes, ${parsed.characters.length} PJ, ${parsed.clocks.length} horloges)\n\nPense à exporter d'abord si tu veux garder l'état actuel.`
    )
    if (!ok) return
    useGMStore.setState({
      npcs: parsed.npcs,
      rules: parsed.rules,
      notes: parsed.notes,
      characters: parsed.characters,
      clocks: parsed.clocks,
      combat: parsed.combat,
      handouts: parsed.handouts,
      mapPins: parsed.mapPins,
      tide: parsed.tide,
      sessionLogs: parsed.sessionLogs,
      timeline: parsed.timeline,
    })
    flash('✓ Campagne importée')
  }

  return (
    <div className="flex items-center gap-2">
      {feedback && <span className="text-xs text-stone-400">{feedback}</span>}
      {campaigns.length > 0 && (
        <select
          value={active}
          onChange={(e) => onCampaignChange(e.target.value)}
          aria-label="Campagne active"
          title="Changer de campagne"
          className="text-xs bg-stone-900 border border-stone-700 rounded px-2 py-1 text-stone-300 focus:outline-none focus:border-amber-600 max-w-40"
        >
          {campaigns.map((c) => (
            <option key={c.id} value={c.id}>📖 {c.name}</option>
          ))}
          <option value="__new">➕ Nouvelle campagne…</option>
          <option value="__archive">🗄 Archiver la campagne…</option>
        </select>
      )}
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
