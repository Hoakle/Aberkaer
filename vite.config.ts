import { defineConfig } from 'vite'
import type { Connect, ViteDevServer, PreviewServer } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import type { ServerResponse } from 'node:http'

// ─── Persistance des campagnes (multi-campagnes) ─────────────────────────────
// Chaque campagne a son fichier JSON. La campagne historique « aberkaer »
// reste dans campaign-data.json, les autres vivent dans campaigns/<id>.json.
// campaigns/index.json retient la liste et la campagne active.

// Surchargeable pour les tests (fichiers de données jetables).
const DATA_FILE = process.env.ABERKAER_DATA_FILE
  ? path.resolve(process.env.ABERKAER_DATA_FILE)
  : path.resolve(__dirname, 'campaign-data.json')
const CAMPAIGNS_DIR = path.join(path.dirname(DATA_FILE), 'campaigns')
const CAMPAIGNS_INDEX = path.join(CAMPAIGNS_DIR, 'index.json')
const ARCHIVE_DIR = path.join(CAMPAIGNS_DIR, 'archive')
const BACKUP_DIR = path.join(path.dirname(DATA_FILE), 'backups')
// Au plus un snapshot toutes les 10 minutes, on garde les 20 derniers.
const BACKUP_MIN_INTERVAL_MS = 10 * 60 * 1000
const BACKUP_KEEP = 20

interface CampaignIndex {
  active: string
  campaigns: Record<string, string> // id → nom affiché
}

const defaultIndex = (): CampaignIndex => ({ active: 'aberkaer', campaigns: { aberkaer: 'Aberkaer' } })

function loadIndex(): CampaignIndex {
  try {
    const idx = JSON.parse(fs.readFileSync(CAMPAIGNS_INDEX, 'utf-8')) as CampaignIndex
    if (idx?.active && idx?.campaigns && Object.keys(idx.campaigns).length > 0 && idx.campaigns[idx.active]) {
      return idx
    }
  } catch {}
  return defaultIndex()
}

function saveIndex(idx: CampaignIndex) {
  fs.mkdirSync(CAMPAIGNS_DIR, { recursive: true })
  fs.writeFileSync(CAMPAIGNS_INDEX, JSON.stringify(idx, null, 2))
}

const campaignFile = (id: string) =>
  id === 'aberkaer' ? DATA_FILE : path.join(CAMPAIGNS_DIR, `${id}.json`)
const activeFile = () => campaignFile(loadIndex().active)

const slugify = (name: string) =>
  name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'campagne'

function listBackups(prefix: string): string[] {
  if (!fs.existsSync(BACKUP_DIR)) return []
  return fs
    .readdirSync(BACKUP_DIR)
    .filter((f) => f.startsWith(prefix) && f.endsWith('.json'))
    .sort()
}

// Avant d'écraser le fichier de la campagne active, on en garde une copie
// horodatée (par campagne).
function backupCurrentFile() {
  const id = loadIndex().active
  const file = campaignFile(id)
  if (!fs.existsSync(file)) return
  const prefix = `${id}-`
  const backups = listBackups(prefix)
  const last = backups[backups.length - 1]
  if (last && Date.now() - fs.statSync(path.join(BACKUP_DIR, last)).mtimeMs < BACKUP_MIN_INTERVAL_MS) {
    return
  }
  fs.mkdirSync(BACKUP_DIR, { recursive: true })
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  fs.copyFileSync(file, path.join(BACKUP_DIR, `${prefix}${stamp}.json`))
  for (const old of listBackups(prefix).slice(0, -BACKUP_KEEP)) {
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
  const file = activeFile()
  if (req.method === 'GET') {
    res.end(fs.existsSync(file) ? fs.readFileSync(file, 'utf-8') : 'null')
  } else if (req.method === 'POST') {
    readJsonBody(req, (body) => {
      backupCurrentFile()
      fs.mkdirSync(path.dirname(file), { recursive: true })
      fs.writeFileSync(file, body)
      res.end('"ok"')
    }, res)
  } else if (req.method === 'DELETE') {
    backupCurrentFile()
    if (fs.existsSync(file)) fs.unlinkSync(file)
    res.end('"ok"')
  } else {
    res.statusCode = 405
    res.end('"Method Not Allowed"')
  }
}

// Gestion des campagnes : lister, créer, changer, archiver.
const campaignsMiddleware: Connect.NextHandleFunction = (req, res: ServerResponse) => {
  res.setHeader('Content-Type', 'application/json')
  if (req.method === 'GET') {
    const idx = loadIndex()
    res.end(
      JSON.stringify({
        active: idx.active,
        campaigns: Object.entries(idx.campaigns).map(([id, name]) => ({ id, name })),
      })
    )
  } else if (req.method === 'POST') {
    readJsonBody(req, (body) => {
      const { action, name, id } = JSON.parse(body) as { action?: string; name?: string; id?: string }
      const idx = loadIndex()
      if (action === 'create' && typeof name === 'string' && name.trim()) {
        const base = slugify(name)
        let slug = base
        let n = 2
        while (idx.campaigns[slug]) slug = `${base}-${n++}`
        idx.campaigns[slug] = name.trim()
        idx.active = slug
        saveIndex(idx)
        resetSceneForCampaignChange()
        res.end(JSON.stringify({ active: idx.active }))
      } else if (action === 'select' && id && idx.campaigns[id]) {
        idx.active = id
        saveIndex(idx)
        resetSceneForCampaignChange()
        res.end(JSON.stringify({ active: idx.active }))
      } else if (action === 'archive' && id && idx.campaigns[id]) {
        const file = campaignFile(id)
        if (fs.existsSync(file)) {
          fs.mkdirSync(ARCHIVE_DIR, { recursive: true })
          fs.renameSync(file, path.join(ARCHIVE_DIR, `${id}.json`))
        }
        delete idx.campaigns[id]
        if (Object.keys(idx.campaigns).length === 0) idx.campaigns = { aberkaer: 'Aberkaer' }
        if (!idx.campaigns[idx.active]) idx.active = Object.keys(idx.campaigns)[0]
        saveIndex(idx)
        resetSceneForCampaignChange()
        res.end(JSON.stringify({ active: idx.active }))
      } else {
        res.statusCode = 400
        res.end('"Requête invalide"')
      }
    }, res)
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

// Changement de campagne : la scène en cours n'a plus de sens, les écrans
// joueurs rechargent leurs données.
function resetSceneForCampaignChange() {
  displayState = null
  sseBroadcast({ type: 'CAMPAIGN_CHANGED' })
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

// ─── Bibliothèque de médias locale ───────────────────────────────────────────
// Images et sons de la table, stockés dans media/ : plus besoin d'internet
// le soir de la partie.

const MEDIA_DIR = process.env.ABERKAER_MEDIA_DIR
  ? path.resolve(process.env.ABERKAER_MEDIA_DIR)
  : path.resolve(__dirname, 'media')

const MEDIA_MIME: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.wav': 'audio/wav',
  '.m4a': 'audio/mp4',
  '.flac': 'audio/flac',
}

function mediaKind(name: string): 'image' | 'audio' | null {
  const mime = MEDIA_MIME[path.extname(name).toLowerCase()]
  if (!mime) return null
  return mime.startsWith('image/') ? 'image' : 'audio'
}

const sanitizeMediaName = (raw: string) => path.basename(raw).replace(/[^\w.\-()À-ɏ ]/g, '_')

const mediaApiMiddleware: Connect.NextHandleFunction = (req, res: ServerResponse) => {
  res.setHeader('Content-Type', 'application/json')
  const url = new URL(req.url ?? '/', 'http://localhost')

  if (req.method === 'GET') {
    if (!fs.existsSync(MEDIA_DIR)) {
      res.end('[]')
      return
    }
    const items = fs
      .readdirSync(MEDIA_DIR)
      .filter((f) => mediaKind(f))
      .sort()
      .map((name) => ({
        name,
        url: `/media/${encodeURIComponent(name)}`,
        kind: mediaKind(name),
        size: fs.statSync(path.join(MEDIA_DIR, name)).size,
      }))
    res.end(JSON.stringify(items))
  } else if (req.method === 'POST') {
    const name = sanitizeMediaName(url.searchParams.get('name') ?? '')
    if (!name || !mediaKind(name)) {
      res.statusCode = 400
      res.end('"Nom de fichier manquant ou format non supporté"')
      return
    }
    const chunks: Buffer[] = []
    req.on('data', (chunk: Buffer) => chunks.push(chunk))
    req.on('end', () => {
      fs.mkdirSync(MEDIA_DIR, { recursive: true })
      fs.writeFileSync(path.join(MEDIA_DIR, name), Buffer.concat(chunks))
      res.end(JSON.stringify({ name, url: `/media/${encodeURIComponent(name)}` }))
    })
  } else if (req.method === 'DELETE') {
    const name = sanitizeMediaName(decodeURIComponent(url.pathname.replace(/^\//, '')))
    const file = path.join(MEDIA_DIR, name)
    if (name && fs.existsSync(file)) fs.unlinkSync(file)
    res.end('"ok"')
  } else {
    res.statusCode = 405
    res.end('"Method Not Allowed"')
  }
}

const mediaFilesMiddleware: Connect.NextHandleFunction = (req, res: ServerResponse, next) => {
  if (req.method !== 'GET') return next()
  const name = sanitizeMediaName(decodeURIComponent((req.url ?? '').split('?')[0].replace(/^\//, '')))
  const file = path.join(MEDIA_DIR, name)
  if (!name || !fs.existsSync(file)) {
    res.statusCode = 404
    res.end()
    return
  }
  res.setHeader('Content-Type', MEDIA_MIME[path.extname(name).toLowerCase()] ?? 'application/octet-stream')
  fs.createReadStream(file).pipe(res)
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
  server.middlewares.use('/api/campaigns', campaignsMiddleware)
  server.middlewares.use('/api/campaign', campaignMiddleware)
  server.middlewares.use('/api/events', eventsMiddleware)
  server.middlewares.use('/api/display', displayMiddleware)
  server.middlewares.use('/api/info', infoMiddleware)
  server.middlewares.use('/api/media', mediaApiMiddleware)
  server.middlewares.use('/media', mediaFilesMiddleware)

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
