import { defineConfig } from '@playwright/test'

// Les tests écrivent dans un fichier de données jetable, jamais
// dans le campaign-data.json de la vraie campagne.
const TEST_DATA_FILE = 'test-results/campaign-data.test.json'

export default defineConfig({
  testDir: 'tests',
  timeout: 30_000,
  // L'état d'affichage vit en mémoire du serveur partagé : pas de parallélisme.
  workers: 1,
  use: {
    baseURL: 'http://localhost:5199',
    // Permet d'utiliser un Chromium déjà présent sur la machine
    // (ex. environnement CI) au lieu de télécharger les navigateurs.
    launchOptions: process.env.CHROMIUM_PATH
      ? { executablePath: process.env.CHROMIUM_PATH }
      : {},
  },
  webServer: {
    command: 'vite --port 5199 --strictPort',
    url: 'http://localhost:5199',
    reuseExistingServer: false,
    env: { ABERKAER_DATA_FILE: TEST_DATA_FILE },
  },
})
