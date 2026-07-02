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

export interface PlayerDisplay {
  imageUrl: string
  caption: string
  audioUrl: string
  audioPlaying: boolean
  audioVolume: number
  overlayText: string
  showOverlay: boolean
}

export type BroadcastMessage =
  | { type: 'DISPLAY_UPDATE'; payload: Partial<PlayerDisplay> }
  // Envoyé par la vue joueurs à l'ouverture pour récupérer l'état courant
  | { type: 'SYNC_REQUEST' }
  // Heartbeat émis par la vue MJ toutes les 5 s
  | { type: 'PING' }
