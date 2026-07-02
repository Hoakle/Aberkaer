// Les règles de la maison, en code : d20 + mod, Vérités (+2), DC fixes,
// critiques naturels, magie à coût de Fatigue, Jetons de Destin.

import type { RollResult, StatKey } from '../types'

export const STATS: { key: StatKey; label: string; icon: string }[] = [
  { key: 'vitalite', label: 'Vitalité', icon: '❤️' },
  { key: 'force', label: 'Force', icon: '⚔️' },
  { key: 'intelligence', label: 'Intelligence', icon: '✨' },
  { key: 'agilite', label: 'Agilité', icon: '🤸' },
  { key: 'chance', label: 'Chance', icon: '🍀' },
  { key: 'sagesse', label: 'Sagesse', icon: '🧘' },
]

export const statLabel = (key: StatKey) => STATS.find((s) => s.key === key)!.label

// Modificateur = (Score − 10) ÷ 2, arrondi à l'inférieur
export const mod = (score: number) => Math.floor((score - 10) / 2)
export const fmtMod = (m: number) => (m >= 0 ? `+${m}` : `${m}`)

export const TRUTH_BONUS = 2
export const TOKEN_MAX = 5
export const TOKEN_START = 3

export const DC_LEVELS = [
  { label: 'Facile', dc: 10 },
  { label: 'Normal', dc: 13 },
  { label: 'Difficile', dc: 16 },
  { label: 'Extrême', dc: 19 },
]

export const MAGIC_AMBITIONS = [
  { label: 'Petite', hint: 'lumière, bruit, illusion légère', dc: 10 },
  { label: 'Moyenne', hint: 'transformer, déplacer, tromper', dc: 13 },
  { label: 'Grande', hint: 'explosion, soin important, contrôle', dc: 16 },
  { label: 'Extrême', hint: 'changer le cours d\'une scène', dc: 19 },
]

// Coût en Fatigue d'un sort : succès 1, échec 2, échec critique 3
// (succès critique : 1, effet amplifié)
export const magicFatigueCost = (outcome: RollResult['outcome']) =>
  outcome === 'fumble' ? 3 : outcome === 'failure' ? 2 : 1

export const rollD20 = () => 1 + Math.floor(Math.random() * 20)

// Les critiques naturels ignorent modificateurs et DC.
export function rollOutcome(die: number, total: number, dc: number | null): RollResult['outcome'] {
  if (die === 20) return 'crit'
  if (die === 1) return 'fumble'
  if (dc === null) return 'open'
  return total >= dc ? 'success' : 'failure'
}

export const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))
