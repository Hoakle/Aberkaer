import { useState } from 'react'
import NPCPanel from '../components/gm/NPCPanel'
import RulesPanel from '../components/gm/RulesPanel'
import NotesPanel from '../components/gm/NotesPanel'
import DisplayControl from '../components/gm/DisplayControl'

type Tab = 'display' | 'npcs' | 'rules' | 'notes'

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'display', label: 'Écran joueurs', icon: '🖥' },
  { id: 'npcs', label: 'PNJ', icon: '👤' },
  { id: 'rules', label: 'Règles', icon: '📖' },
  { id: 'notes', label: 'Notes', icon: '📝' },
]

export default function GMView() {
  const [tab, setTab] = useState<Tab>('display')

  return (
    <div className="min-h-screen flex flex-col bg-stone-950">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-2 border-b border-stone-800 bg-stone-900/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <span className="text-amber-500 font-semibold tracking-wider text-sm uppercase">Aberkaer</span>
          <span className="text-stone-600 text-xs">— Écran de Maître de Jeu</span>
        </div>
        <a
          href="/player"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs px-3 py-1 rounded border border-stone-700 text-stone-400 hover:text-stone-200 hover:border-stone-600 transition-colors"
        >
          Vue joueurs ↗
        </a>
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
          {tab === 'npcs' && <NPCPanel />}
          {tab === 'rules' && <RulesPanel />}
          {tab === 'notes' && <NotesPanel />}
        </main>
      </div>
    </div>
  )
}
