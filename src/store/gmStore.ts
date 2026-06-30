import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { NPC, RuleSection, SessionNote, PlayerDisplay } from '../types'

interface GMStore {
  npcs: NPC[]
  rules: RuleSection[]
  notes: SessionNote[]
  display: PlayerDisplay

  // NPC actions
  addNPC: (npc: Omit<NPC, 'id'>) => void
  updateNPC: (id: string, data: Partial<NPC>) => void
  deleteNPC: (id: string) => void

  // Rules actions
  addRule: (rule: Omit<RuleSection, 'id'>) => void
  updateRule: (id: string, data: Partial<RuleSection>) => void
  deleteRule: (id: string) => void

  // Notes actions
  addNote: (note: Omit<SessionNote, 'id'>) => void
  updateNote: (id: string, data: Partial<SessionNote>) => void
  deleteNote: (id: string) => void

  // Display actions
  updateDisplay: (data: Partial<PlayerDisplay>) => void
}

const uid = () => Math.random().toString(36).slice(2, 9)

const defaultNPCs: NPC[] = [
  {
    id: uid(),
    name: 'Maëlys la Grise',
    role: 'Marchande de secrets',
    stats: 'Persuasion +5 / Tromperie +7 / Perception +4',
    description: 'Femme d\'une cinquantaine d\'années, cheveux argentés, regard perçant. Toujours vêtue de gris, elle fréquente les tavernes de basse réputation.',
    secrets: 'Agent double au service du Conseil de l\'Ombre. Connaît la véritable identité du Roi Fantôme.',
    imageUrl: '',
  },
]

const defaultRules: RuleSection[] = [
  {
    id: uid(),
    title: 'Jets de dés',
    content: `**Jet standard** : 2d6 + modificateur vs difficulté
• Facile : 8 | Moyen : 11 | Difficile : 14 | Héroïque : 17

**Avantage** : lancer 3d6, garder les 2 meilleurs
**Désavantage** : lancer 3d6, garder les 2 plus faibles

**Critique** : double 6 → réussite éclatante
**Échec critique** : double 1 → complication`,
  },
  {
    id: uid(),
    title: 'Combat',
    content: `**Initiative** : d6 + Réflexes
**Action** : Attaquer OU se déplacer OU une action spéciale
**Réaction** : 1 par tour (parade, esquive, contre-attaque)

**Attaque** : d20 + bonus vs Défense cible
**Dégâts** : arme + Force (mêlée) / Dextérité (distance)
**Critique** : 20 naturel = dégâts max + effet`,
  },
]

const defaultNotes: SessionNote[] = [
  {
    id: uid(),
    title: 'Objectifs de session',
    content: '- Les joueurs enquêtent sur la disparition du marchand\n- Révéler l\'existence de la guilde des Ombres\n- Hook : lettre anonyme dans les affaires de la victime',
    category: 'objectif',
  },
]

export const useGMStore = create<GMStore>()(
  persist(
    (set) => ({
      npcs: defaultNPCs,
      rules: defaultRules,
      notes: defaultNotes,
      display: {
        imageUrl: '',
        caption: '',
        audioUrl: '',
        audioPlaying: false,
        audioVolume: 0.5,
        overlayText: '',
        showOverlay: false,
      },

      addNPC: (npc) => set((s) => ({ npcs: [...s.npcs, { ...npc, id: uid() }] })),
      updateNPC: (id, data) =>
        set((s) => ({ npcs: s.npcs.map((n) => (n.id === id ? { ...n, ...data } : n)) })),
      deleteNPC: (id) => set((s) => ({ npcs: s.npcs.filter((n) => n.id !== id) })),

      addRule: (rule) => set((s) => ({ rules: [...s.rules, { ...rule, id: uid() }] })),
      updateRule: (id, data) =>
        set((s) => ({ rules: s.rules.map((r) => (r.id === id ? { ...r, ...data } : r)) })),
      deleteRule: (id) => set((s) => ({ rules: s.rules.filter((r) => r.id !== id) })),

      addNote: (note) => set((s) => ({ notes: [...s.notes, { ...note, id: uid() }] })),
      updateNote: (id, data) =>
        set((s) => ({ notes: s.notes.map((n) => (n.id === id ? { ...n, ...data } : n)) })),
      deleteNote: (id) => set((s) => ({ notes: s.notes.filter((n) => n.id !== id) })),

      updateDisplay: (data) => set((s) => ({ display: { ...s.display, ...data } })),
    }),
    { name: 'aberkaer-gm' }
  )
)
