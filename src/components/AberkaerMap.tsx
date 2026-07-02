import type { Tide } from '../types'

// Carte stylisée d'Aberkaer : les 7 îles dans le delta du fleuve.
// Coordonnées dans un viewBox 100 × 70 — les pins utilisent le même repère.

interface Island {
  name: string
  icon: string
  x: number
  y: number
  rx: number
  ry: number
}

const ISLANDS: Island[] = [
  { name: 'Île du Négoce', icon: '🏪', x: 30, y: 13, rx: 13, ry: 7 },
  { name: 'Île Haute', icon: '💰', x: 68, y: 12, rx: 11, ry: 6 },
  { name: 'Vieille Ville', icon: '🏚️', x: 21, y: 31, rx: 10, ry: 6.5 },
  { name: 'Île du Temple', icon: '⛪', x: 73, y: 30, rx: 9, ry: 5.5 },
  { name: 'Basse Ville', icon: '🏰', x: 39, y: 45, rx: 10, ry: 6 },
  { name: 'Île des Plaisirs', icon: '🎭', x: 64, y: 48, rx: 9.5, ry: 5.5 },
  { name: 'Roz Fall', icon: '🌑', x: 27, y: 61, rx: 6.5, ry: 4 },
]

const island = (name: string) => ISLANDS.find((i) => i.name === name)!

// Ponts permanents
const BRIDGES: [Island, Island][] = [
  [island('Île du Négoce'), island('Île Haute')], // grand pont nord
  [island('Île du Négoce'), island('Vieille Ville')],
  [island('Vieille Ville'), island('Basse Ville')], // vieux pont
  [island('Île Haute'), island('Île du Temple')],
]

// Chemins vaseux découverts à marée basse
const TIDE_PATHS: [Island, Island][] = [
  [island('Vieille Ville'), island('Basse Ville')],
  [island('Basse Ville'), island('Île des Plaisirs')],
]

export interface DisplayPin {
  id?: string
  x: number
  y: number
  label: string
  showToPlayers?: boolean
}

export default function AberkaerMap({
  pins,
  tide,
  onMapClick,
  onPinClick,
  selectedId,
  className,
}: {
  pins: DisplayPin[]
  tide: Tide
  onMapClick?: (x: number, y: number) => void
  onPinClick?: (id: string) => void
  selectedId?: string | null
  className?: string
}) {
  const handleClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!onMapClick) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 70
    onMapClick(Math.round(x * 10) / 10, Math.round(y * 10) / 10)
  }

  return (
    <svg
      viewBox="0 0 100 70"
      data-map
      onClick={handleClick}
      className={`${className ?? ''} ${onMapClick ? 'cursor-crosshair' : ''}`}
      role="img"
      aria-label="Carte des 7 îles d'Aberkaer"
    >
      <defs>
        <radialGradient id="water" cx="50%" cy="45%" r="75%">
          <stop offset="0%" stopColor="#12263f" />
          <stop offset="100%" stopColor="#0a1622" />
        </radialGradient>
      </defs>

      {/* Le fleuve */}
      <rect x="0" y="0" width="100" height="70" fill="url(#water)" />

      {/* Chemins à marée basse (vase découverte) */}
      {tide === 'basse' &&
        TIDE_PATHS.map(([a, b], i) => (
          <line
            key={`tide-${i}`}
            x1={a.x}
            y1={a.y}
            x2={b.x}
            y2={b.y}
            stroke="#8a7a55"
            strokeWidth="1.6"
            strokeDasharray="2.2 1.4"
            opacity="0.75"
          />
        ))}

      {/* Ponts */}
      {BRIDGES.map(([a, b], i) => (
        <line key={`bridge-${i}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#57534e" strokeWidth="0.9" opacity="0.9" />
      ))}

      {/* Les îles */}
      {ISLANDS.map((isl) => (
        <g key={isl.name}>
          <ellipse
            cx={isl.x}
            cy={isl.y}
            rx={isl.rx}
            ry={isl.ry}
            fill={isl.name === 'Roz Fall' ? '#1f1c1a' : '#2b2422'}
            stroke="#6b5f4e"
            strokeWidth="0.4"
          />
          <text x={isl.x} y={isl.y - 0.6} textAnchor="middle" fontSize="3.4">
            {isl.icon}
          </text>
          <text x={isl.x} y={isl.y + 3.2} textAnchor="middle" fontSize="2.4" fill="#d6d3d1" fontWeight="600">
            {isl.name}
          </text>
        </g>
      ))}

      {/* Repères */}
      {pins.map((pin, i) => {
        const key = pin.id ?? `pin-${i}`
        const selected = pin.id != null && pin.id === selectedId
        return (
          <g
            key={key}
            onClick={(e) => {
              if (!onPinClick || !pin.id) return
              e.stopPropagation()
              onPinClick(pin.id)
            }}
            className={onPinClick ? 'cursor-pointer' : ''}
          >
            <circle
              cx={pin.x}
              cy={pin.y}
              r={selected ? 1.6 : 1.2}
              fill={pin.showToPlayers === false ? '#78716c' : '#f59e0b'}
              stroke={selected ? '#fde68a' : '#0a1622'}
              strokeWidth="0.4"
            />
            {pin.showToPlayers === false && (
              <circle cx={pin.x} cy={pin.y} r="2.1" fill="none" stroke="#78716c" strokeWidth="0.3" strokeDasharray="0.8 0.6" />
            )}
            <text x={pin.x} y={pin.y - 2} textAnchor="middle" fontSize="2.2" fill="#fbbf24" fontWeight="600">
              {pin.label}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
