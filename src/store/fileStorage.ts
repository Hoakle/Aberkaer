import { createJSONStorage } from 'zustand/middleware'
import type { StateStorage } from 'zustand/middleware'

const LOCAL_KEY = 'aberkaer-gm'
// Le store écrit à chaque frappe : on regroupe les écritures serveur.
const WRITE_DEBOUNCE_MS = 500

let pendingValue: string | null = null
let writeTimer: ReturnType<typeof setTimeout> | null = null

async function postToServer(value: string) {
  try {
    await fetch('/api/campaign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: value,
    })
  } catch {
    // Serveur absent : le repli localStorage a déjà été écrit.
  }
}

function scheduleServerWrite(value: string) {
  pendingValue = value
  if (writeTimer) clearTimeout(writeTimer)
  writeTimer = setTimeout(() => {
    writeTimer = null
    if (pendingValue === null) return
    const toWrite = pendingValue
    pendingValue = null
    void postToServer(toWrite)
  }, WRITE_DEBOUNCE_MS)
}

// Si l'onglet se ferme pendant la fenêtre de debounce, on ne perd rien :
// sendBeacon survit au déchargement de la page.
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    if (pendingValue !== null) {
      navigator.sendBeacon('/api/campaign', new Blob([pendingValue], { type: 'application/json' }))
      pendingValue = null
    }
  })
}

// Tries the local file API, falls back to localStorage.
const hybridStorage: StateStorage = {
  getItem: async (_name) => {
    try {
      const res = await fetch('/api/campaign')
      if (res.ok) {
        const text = await res.text()
        // Serveur joignable : sa réponse fait foi. « null » = campagne vierge,
        // on N'utilise PAS le repli localStorage (il peut contenir les données
        // d'une autre campagne).
        return text && text !== 'null' ? text : null
      }
    } catch {}
    return localStorage.getItem(LOCAL_KEY)
  },
  setItem: (_name, value) => {
    // localStorage tout de suite (garantie locale), serveur en différé.
    localStorage.setItem(LOCAL_KEY, value)
    scheduleServerWrite(value)
  },
  removeItem: async (_name) => {
    pendingValue = null
    if (writeTimer) clearTimeout(writeTimer)
    localStorage.removeItem(LOCAL_KEY)
    try {
      await fetch('/api/campaign', { method: 'DELETE' })
    } catch {}
  },
}

export const campaignStorage = createJSONStorage(() => hybridStorage)
