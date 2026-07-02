import { defineConfig } from 'vite'
import type { Connect, ViteDevServer, PreviewServer } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import type { ServerResponse } from 'node:http'

// ─── Persistance de la campagne ──────────────────────────────────────────────

// Surchargeable pour les tests (fichier de données jetable).
const DATA_FILE = process.env.ABERKAER_DATA_FILE
  ? path.resolve(process.env.ABERKAER_DATA_FILE)
  : path.resolve(__dirname, 'campaign-data.json')
const BACKUP_DIR = path.join(path.dirname(DATA_FILE), 'backups')
// Au plus un snapshot toutes les 10 minutes, on garde les 20 derniers.
const BACKUP_MIN_INTERVAL_MS = 10 * 60 * 1000
const BACKUP_KEEP = 20

function listBackups(): string[] {
  if (!fs.existsSync(BACKUP_DIR)) return []
  return fs
    .readdirSync(BACKUP_DIR)
    .filter((f) => f.startsWith('campaign-') && f.endsWith('.json'))
    .sort()
}

// Avant d'écraser campaign-data.json, on en garde une copie horodatée.
function backupCurrentFile() {
  if (!fs.existsSync(DATA_FILE)) return
  const backups = listBackups()
  const last = backups[backups.length - 1]
  if (last && Date.now() - fs.statSync(path.join(BACKUP_DIR, last)).mtimeMs < BACKUP_MIN_INTERVAL_MS) {
    return
  }
  fs.mkdirSync(BACKUP_DIR, { recursive: true })
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  fs.copyFileSync(DATA_FILE, path.join(BACKUP_DIR, `campaign-${stamp}.json`))
  for (const old of listBackups().slice(0, -BACKUP_KEEP)) {
    fs.unlinkSync(path.join(BACKUP_DIR, old))
  }
}

function readJsonBody(req: Connect.IncomingMessage, onJson: (body: string) => void, res: ServerResponse) {
  let body = ''
  req.on('data', (chunk: Buffer) => { body += chunk.toString() })
  req.on('end', () => {
    try {
      JSON.parse(body)
    } catch {
      res.statusCode = 400
      res.end('"Invalid JSON"')
      return
    }
    onJson(body)
  })
}

const campaignMiddleware: Connect.NextHandleFunction = (req, res: ServerResponse) => {
  res.setHeader('Content-Type', 'application/json')
  if (req.method === 'GET') {
    res.end(fs.existsSync(DATA_FILE) ? fs.readFileSync(DATA_FILE, 'utf-8') : 'null')
  } else if (req.method === 'POST') {
    readJsonBody(req, (body) => {
      backupCurrentFile()
      fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true })
      fs.writeFileSync(DATA_FILE, body)
      res.end('"ok"')
    }, res)
  } else if (req.method === 'DELETE') {
    backupCurrentFile()
    if (fs.existsSync(DATA_FILE)) fs.unlinkSync(DATA_FILE)
    res.end('"ok"')
  } else {
    res.statusCode = 405
    res.end('"Method Not Allowed"')
  }
}

// ─── Hub de synchronisation MJ → joueurs (SSE) ───────────────────────────────
// L'état d'affichage vit en mémoire serveur : n'importe quel appareil du
// réseau local qui ouvre /player reçoit l'état courant puis les mises à jour.

let displayState: Record<string, unknown> | null = null
const sseClients = new Set<ServerResponse>()

function sseBroadcast(msg: object) {
  const data = `data: ${JSON.stringify(msg)}\n\n`
  for (const client of sseClients) client.write(data)
}

const eventsMiddleware: Connect.NextHandleFunction = (req, res: ServerResponse) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  })
  res.write('retry: 2000\n\n')
  // Nouvel écran : il reçoit immédiatement l'état courant (ou un simple
  // ping si rien n'a encore été diffusé).
  const first = displayState ? { type: 'DISPLAY_UPDATE', payload: displayState } : { type: 'PING' }
  res.write(`data: ${JSON.stringify(first)}\n\n`)
  sseClients.add(res)
  req.on('close', () => sseClients.delete(res))
}

const displayMiddleware: Connect.NextHandleFunction = (req, res: ServerResponse) => {
  res.setHeader('Content-Type', 'application/json')
  if (req.method === 'GET') {
    // Permet à un écran MJ qui se (re)charge d'adopter l'état en cours.
    res.end(JSON.stringify(displayState))
  } else if (req.method === 'POST') {
    readJsonBody(req, (body) => {
      const patch = JSON.parse(body) as Record<string, unknown>
      displayState = { ...(displayState ?? {}), ...patch }
      sseBroadcast({ type: 'DISPLAY_UPDATE', payload: patch })
      res.end('"ok"')
    }, res)
  } else if (req.method === 'DELETE') {
    // Réinitialise la scène (utilisé par les tests).
    displayState = null
    res.end('"ok"')
  } else {
    res.statusCode = 405
    res.end('"Method Not Allowed"')
  }
}

// Adresses IP locales, pour construire l'URL à ouvrir depuis la TV/tablette.
const infoMiddleware: Connect.NextHandleFunction = (_req, res: ServerResponse) => {
  res.setHeader('Content-Type', 'application/json')
  const ips: string[] = []
  for (const net of Object.values(os.networkInterfaces())) {
    for (const iface of net ?? []) {
      if (iface.family === 'IPv4' && !iface.internal) ips.push(iface.address)
    }
  }
  res.end(JSON.stringify({ ips }))
}

function attachApi(server: ViteDevServer | PreviewServer) {
  server.middlewares.use('/api/campaign', campaignMiddleware)
  server.middlewares.use('/api/events', eventsMiddleware)
  server.middlewares.use('/api/display', displayMiddleware)
  server.middlewares.use('/api/info', infoMiddleware)

  // Heartbeat : les écrans joueurs détectent la perte du serveur.
  const heartbeat = setInterval(() => sseBroadcast({ type: 'PING' }), 5000)
  server.httpServer?.on('close', () => {
    clearInterval(heartbeat)
    for (const client of sseClients) client.end()
    sseClients.clear()
  })
}

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'aberkaer-local-api',
      configureServer: attachApi,
      // Même API en mode production (npm start = build + preview) :
      // sans ça, la persistance fichier n'existerait qu'en dev.
      configurePreviewServer: attachApi,
    },
  ],
  // Écoute sur toutes les interfaces : la vue joueurs doit être accessible
  // depuis les autres appareils du réseau local (TV, tablette).
  server: { host: true },
  preview: { host: true },
})
