export interface NPC {
  id: string
  name: string
  role: string
  stats: string
  description: string
  secrets: string
  imageUrl: string
}

export interface RuleSection {
  id: string
  title: string
  content: string
}

export interface SessionNote {
  id: string
  title: string
  content: string
  category: 'objectif' | 'hook' | 'reminder' | 'autre'
}

// ─── Système de jeu ──────────────────────────────────────────────────────────

export type StatKey = 'vitalite' | 'force' | 'intelligence' | 'agilite' | 'chance' | 'sagesse'

export interface Character {
  id: string
  name: string
  player: string // nom du joueur autour de la table
  stats: Record<StatKey, number>
  hp: number // courant — max = score de Vitalité
  fatigue: number // courante — max = score d'Intelligence
  tokens: number // Jetons de Destin, 0..5
  truths: string[] // les 3 Vérités
  notes: string
}

export interface CampaignClock {
  id: string
  label: string
  value: number // affiché « J-N »
  showToPlayers: boolean
}

export interface Combatant {
  id: string
  name: string
  hp: number
  maxHp: number
  isPC: boolean
  characterId?: string // pour refléter les HP sur la fiche du PJ
  note: string
}

export interface CombatState {
  round: number
  turnIndex: number
  combatants: Combatant[]
}

export interface RollResult {
  id: string
  title: string // « Kara — Agilité », « Kara — Sort »...
  die: number // résultat brut du d20
  bonus: number // tout ce qui s'ajoute au dé (mod + Vérité...)
  total: number
  dc: number | null
  outcome: 'crit' | 'fumble' | 'success' | 'failure' | 'open'
}

// ─── Immersion ───────────────────────────────────────────────────────────────

export interface Handout {
  id: string
  title: string
  content: string // Markdown
  imageUrl: string // optionnel : document-image
}

export type Tide = 'haute' | 'basse'

export interface MapPin {
  id: string
  x: number // coordonnées dans le viewBox de la carte (0-100 / 0-70)
  y: number
  label: string
  note: string // MJ uniquement
  showToPlayers: boolean
}

// ─── Écran joueurs ───────────────────────────────────────────────────────────

export interface PlayerClock {
  label: string
  value: number
}

export interface PlayerDisplay {
  imageUrl: string
  caption: string
  audioUrl: string
  audioPlaying: boolean
  audioVolume: number
  overlayText: string
  showOverlay: boolean
  clocks: PlayerClock[]
  lastRoll: RollResult | null
  // Effet sonore one-shot — un nouvel id relance la lecture
  sfx: { id: string; url: string } | null
  // Document montré aux joueurs (rendu « parchemin »)
  handout: { title: string; content: string; imageUrl: string } | null
  // Carte d'Aberkaer avec les repères visibles des joueurs
  map: { visible: boolean; tide: Tide; pins: { x: number; y: number; label: string }[] } | null
}

export type BroadcastMessage =
  | { type: 'DISPLAY_UPDATE'; payload: Partial<PlayerDisplay> }
  // Envoyé par la vue joueurs à l'ouverture pour récupérer l'état courant
  | { type: 'SYNC_REQUEST' }
  // Heartbeat émis par la vue MJ toutes les 5 s
  | { type: 'PING' }
