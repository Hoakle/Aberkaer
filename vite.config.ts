import { defineConfig } from 'vite'
import type { Connect } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import fs from 'node:fs'
import path from 'node:path'
import type { ServerResponse } from 'node:http'

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

const campaignMiddleware: Connect.NextHandleFunction = (req, res: ServerResponse) => {
  res.setHeader('Content-Type', 'application/json')
  if (req.method === 'GET') {
    res.end(fs.existsSync(DATA_FILE) ? fs.readFileSync(DATA_FILE, 'utf-8') : 'null')
  } else if (req.method === 'POST') {
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
      backupCurrentFile()
      fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true })
      fs.writeFileSync(DATA_FILE, body)
      res.end('"ok"')
    })
  } else if (req.method === 'DELETE') {
    backupCurrentFile()
    if (fs.existsSync(DATA_FILE)) fs.unlinkSync(DATA_FILE)
    res.end('"ok"')
  } else {
    res.statusCode = 405
    res.end('"Method Not Allowed"')
  }
}

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'campaign-data-api',
      configureServer(server) {
        server.middlewares.use('/api/campaign', campaignMiddleware)
      },
      // Même API en mode production (npm start = build + preview) :
      // sans ça, la persistance fichier n'existerait qu'en dev.
      configurePreviewServer(server) {
        server.middlewares.use('/api/campaign', campaignMiddleware)
      },
    },
  ],
})
