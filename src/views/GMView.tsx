import { useEffect, useState } from 'react'
import NPCPanel from '../components/gm/NPCPanel'
import RulesPanel from '../components/gm/RulesPanel'
import NotesPanel from '../components/gm/NotesPanel'
import DisplayControl from '../components/gm/DisplayControl'
import CampaignMenu from '../components/gm/CampaignMenu'
import PartyPanel from '../components/gm/PartyPanel'
import DicePanel from '../components/gm/DicePanel'
import CombatPanel from '../components/gm/CombatPanel'
import ClocksPanel from '../components/gm/ClocksPanel'
import MapPanel from '../components/gm/MapPanel'
import HandoutsPanel from '../components/gm/HandoutsPanel'
import MediaPanel from '../components/gm/MediaPanel'
import CampaignPanel from '../components/gm/CampaignPanel'
import SearchPalette from '../components/gm/SearchPalette'
import { useBroadcastReceiver, useBroadcastSender } from '../hooks/useBroadcast'
import { useAdoptServerDisplay } from '../hooks/useTableSync'
import { useGMStore } from '../store/gmStore'

type Tab =
  | 'display'
  | 'party'
  | 'dice'
  | 'combat'
  | 'clocks'
  | 'map'
  | 'handouts'
  | 'media'
  | 'campaign'
  | 'npcs'
  | 'rules'
  | 'notes'

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'display', label: 'Écran joueurs', icon: '🖥' },
  { id: 'party', label: 'PJ', icon: '🎭' },
  { id: 'dice', label: 'Dés', icon: '🎲' },
  { id: 'combat', label: 'Combat', icon: '⚔️' },
  { id: 'clocks', label: 'Horloges', icon: '⏳' },
  { id: 'map', label: 'Carte', icon: '🗺' },
  { id: 'handouts', label: 'Documents', icon: '📜' },
  { id: 'media', label: 'Médias', icon: '🎨' },
  { id: 'campaign', label: 'Campagne', icon: '📔' },
  { id: 'npcs', label: 'PNJ', icon: '👤' },
  { id: 'rules', label: 'Règles', icon: '📖' },
  { id: 'notes', label: 'Notes', icon: '📝' },
]

export default function GMView() {
  const [tab, setTab] = useState<Tab>('display')
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const send = useBroadcastSender()

  // Ctrl+K / Cmd+K ouvre la recherche ; les [[wikilinks]] aussi.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setSearchQuery('')
        setSearchOpen(true)
      }
    }
    const onWikiSearch = (e: Event) => {
      setSearchQuery((e as CustomEvent<string>).detail)
      setSearchOpen(true)
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('aberkaer:search', onWikiSearch)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('aberkaer:search', onWikiSearch)
    }
  }, [])

  // Une vue joueurs qui s'ouvre (ou se recharge) demande l'état courant :
  // on lui renvoie l'affichage complet.
  useBroadcastReceiver((msg) => {
    if (msg.type === 'SYNC_REQUEST') {
      send({ type: 'DISPLAY_UPDATE', payload: useGMStore.getState().display })
    }
  })

  // Si le serveur tient déjà un état d'affichage (l'écran MJ a été rechargé
  // en cours de partie), on l'adopte au lieu de repartir des valeurs par défaut.
  useAdoptServerDisplay((state) => useGMStore.getState().updateDisplay(state))

  // Heartbeat : permet à la vue joueurs de détecter la perte du MJ.
  useEffect(() => {
    const id = setInterval(() => send({ type: 'PING' }), 5000)
    return () => clearInterval(id)
  }, [send])

  return (
    <div className="min-h-screen flex flex-col bg-stone-950">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-2 border-b border-stone-800 bg-stone-900/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <span className="text-amber-500 font-semibold tracking-wider text-sm uppercase">Aberkaer</span>
          <span className="text-stone-600 text-xs">— Écran de Maître de Jeu</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setSearchQuery('')
              setSearchOpen(true)
            }}
            title="Recherche globale (Ctrl+K)"
            className="text-xs px-3 py-1 rounded border border-stone-700 text-stone-400 hover:text-stone-200 hover:border-stone-600 transition-colors"
          >
            🔍 Rechercher <kbd className="text-stone-600">Ctrl+K</kbd>
          </button>
          <CampaignMenu />
          <a
            href="/player"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs px-3 py-1 rounded border border-stone-700 text-stone-400 hover:text-stone-200 hover:border-stone-600 transition-colors"
          >
            Vue joueurs ↗
          </a>
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        {/* Sidebar tabs */}
        <nav className="w-36 flex-shrink-0 border-r border-stone-800 bg-stone-900/40 flex flex-col py-2 gap-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-3 py-2.5 text-sm transition-colors rounded mx-1 text-left ${
                tab === t.id
                  ? 'bg-stone-800 text-stone-100 border border-stone-700'
                  : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/50'
              }`}
            >
              <span>{t.icon}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </nav>

        {/* Main panel */}
        <main className="flex-1 p-4 overflow-y-auto">
          {tab === 'display' && <DisplayControl />}
          {tab === 'party' && <PartyPanel />}
          {tab === 'dice' && <DicePanel />}
          {tab === 'combat' && <CombatPanel />}
          {tab === 'clocks' && <ClocksPanel />}
          {tab === 'map' && <MapPanel />}
          {tab === 'handouts' && <HandoutsPanel />}
          {tab === 'media' && <MediaPanel />}
          {tab === 'campaign' && <CampaignPanel />}
          {tab === 'npcs' && <NPCPanel />}
          {tab === 'rules' && <RulesPanel />}
          {tab === 'notes' && <NotesPanel />}
        </main>
      </div>

      {searchOpen && (
        <SearchPalette
          query={searchQuery}
          setQuery={setSearchQuery}
          onClose={() => setSearchOpen(false)}
          onNavigate={(target) => setTab(target)}
        />
      )}
    </div>
  )
}
