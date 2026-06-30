import { createJSONStorage } from 'zustand/middleware'
import type { StateStorage } from 'zustand/middleware'

// Tries the local file API (dev server only), falls back to localStorage.
const hybridStorage: StateStorage = {
  getItem: async (_name) => {
    try {
      const res = await fetch('/api/campaign')
      if (res.ok) {
        const text = await res.text()
        if (text && text !== 'null') return text
      }
    } catch {}
    return localStorage.getItem('aberkaer-gm')
  },
  setItem: async (_name, value) => {
    try {
      const res = await fetch('/api/campaign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: value,
      })
      if (res.ok) return
    } catch {}
    localStorage.setItem('aberkaer-gm', value)
  },
  removeItem: (_name) => {
    localStorage.removeItem('aberkaer-gm')
  },
}

export const campaignStorage = createJSONStorage(() => hybridStorage)
