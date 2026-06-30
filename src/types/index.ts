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
  | { type: 'AUDIO_COMMAND'; payload: { action: 'play' | 'pause' | 'volume'; value?: number } }
  | { type: 'PING' }
  | { type: 'PONG' }
