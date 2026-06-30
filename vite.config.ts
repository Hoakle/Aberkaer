import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import fs from 'node:fs'
import path from 'node:path'

const DATA_FILE = path.resolve(__dirname, 'campaign-data.json')

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'campaign-data-api',
      configureServer(server) {
        server.middlewares.use('/api/campaign', (req, res) => {
          res.setHeader('Content-Type', 'application/json')
          if (req.method === 'GET') {
            res.end(fs.existsSync(DATA_FILE) ? fs.readFileSync(DATA_FILE, 'utf-8') : 'null')
          } else if (req.method === 'POST') {
            let body = ''
            req.on('data', (chunk: Buffer) => { body += chunk.toString() })
            req.on('end', () => { fs.writeFileSync(DATA_FILE, body); res.end('"ok"') })
          } else {
            res.statusCode = 405
            res.end('"Method Not Allowed"')
          }
        })
      },
    },
  ],
})
