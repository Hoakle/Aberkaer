import { useEffect, useState } from 'react'
import QRCode from 'qrcode'

interface AccessInfo {
  url: string
  qrDataUrl: string
}

// URL de la vue joueurs sur le réseau local + QR code : la TV ou la tablette
// de la table ouvre cette adresse et reçoit la scène en direct.
export default function PlayerAccess() {
  const [access, setAccess] = useState<AccessInfo | null>(null)
  const [showQR, setShowQR] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/info')
        if (!res.ok) return
        const { ips } = (await res.json()) as { ips: string[] }
        const ip = ips[0]
        if (!ip) return
        const port = window.location.port || '80'
        const url = `http://${ip}:${port}/player`
        const qrDataUrl = await QRCode.toDataURL(url, {
          margin: 1,
          width: 180,
          color: { dark: '#e7e5e4', light: '#00000000' },
        })
        if (!cancelled) setAccess({ url, qrDataUrl })
      } catch {
        // Pas de serveur (ou pas de réseau) : on garde juste le lien local.
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <a
          href="/player"
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 py-2 rounded border border-stone-600 text-stone-300 hover:bg-stone-800 text-sm text-center transition-colors"
        >
          ↗ Ouvrir la vue joueurs dans un nouvel onglet
        </a>
        {access && (
          <button
            onClick={() => setShowQR((v) => !v)}
            className={`px-4 py-2 rounded border text-sm transition-colors ${
              showQR
                ? 'border-amber-700 text-amber-300 bg-amber-950/40'
                : 'border-stone-600 text-stone-300 hover:bg-stone-800'
            }`}
          >
            ⌗ QR code
          </button>
        )}
      </div>
      {access && showQR && (
        <div className="flex items-center gap-4 p-4 rounded border border-stone-700 bg-stone-900/60">
          <img src={access.qrDataUrl} alt={`QR code vers ${access.url}`} className="w-36 h-36" />
          <div className="flex flex-col gap-1 text-sm">
            <p className="text-stone-300">Sur la TV, la tablette ou un téléphone du réseau local :</p>
            <code className="text-amber-300 text-base select-all">{access.url}</code>
            <p className="text-stone-500 text-xs">
              Scanner le QR code ou saisir l'adresse. L'appareil doit être sur le même réseau
              (Wi-Fi) que cette machine.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
