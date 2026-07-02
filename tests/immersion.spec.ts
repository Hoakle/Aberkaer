import { test, expect } from '@playwright/test'

// PNG 1×1 pixel, pour les tests d'upload
const PIXEL = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64'
)

test.beforeEach(async ({ page }) => {
  await page.request.delete('/api/campaign')
  await page.request.delete('/api/display')
  await page.goto('/gm')
  await page.evaluate(() => localStorage.clear())
  await page.reload()
})

test('médias : upload, listing typé, service et suppression', async ({ request }) => {
  const up = await request.post('/api/media?name=test-pixel.png', { data: PIXEL })
  expect(up.ok()).toBeTruthy()

  const list = await (await request.get('/api/media')).json()
  const item = list.find((i: { name: string }) => i.name === 'test-pixel.png')
  expect(item).toBeTruthy()
  expect(item.kind).toBe('image')

  const served = await request.get('/media/test-pixel.png')
  expect(served.ok()).toBeTruthy()
  expect(served.headers()['content-type']).toContain('image/png')

  // Un format inconnu est refusé
  const bad = await request.post('/api/media?name=script.sh', { data: 'echo' })
  expect(bad.status()).toBe(400)

  expect((await request.delete('/api/media/test-pixel.png')).ok()).toBeTruthy()
  const after = await (await request.get('/api/media')).json()
  expect(after.some((i: { name: string }) => i.name === 'test-pixel.png')).toBeFalsy()
})

test('bibliothèque : une image uploadée se pousse vers l\'écran joueurs', async ({ page, context }) => {
  await page.request.post('/api/media?name=scene-taverne.png', { data: PIXEL })

  await page.getByRole('button', { name: 'Médias' }).click()
  await expect(page.getByText('scene-taverne')).toBeVisible()

  const player = await context.newPage()
  await player.goto('/player')

  await page.getByTitle('Afficher scene-taverne.png aux joueurs').click()
  // L'image devient le fond de la vue joueurs et la légende s'affiche côté MJ/joueurs
  await expect(player.locator('img[src*="scene-taverne.png"]')).toBeAttached()
  await expect(player.getByText('scene-taverne')).toBeVisible()

  await page.request.delete('/api/media/scene-taverne.png')
})

test('document : le parchemin de la lettre de Maren s\'affiche chez les joueurs', async ({ page, context }) => {
  const player = await context.newPage()
  await player.goto('/player')

  await page.getByRole('button', { name: 'Documents' }).click()
  await expect(page.getByText('Lettre cachetée — sceau des Valdrek')).toBeVisible()
  await page.getByRole('button', { name: 'Montrer aux joueurs' }).click()

  await expect(player.getByText('Lord Edric est mort', { exact: false })).toBeVisible()
  // Le Markdown est rendu (italique), pas affiché brut
  await expect(player.locator('em', { hasText: 'Lord Edric est mort' })).toBeVisible()

  await page.getByRole('button', { name: '👁 Affiché — masquer' }).click()
  await expect(player.getByText('Lord Edric est mort', { exact: false })).toHaveCount(0)
})

test('carte : îles, marée et repère visible côté joueurs', async ({ page, context }) => {
  const player = await context.newPage()
  await player.goto('/player')

  await page.getByRole('button', { name: 'Carte' }).click()
  await page.getByRole('button', { name: 'Montrer la carte aux joueurs' }).click()
  await expect(player.getByText('Roz Fall')).toBeVisible()
  await expect(player.getByText('Marée haute', { exact: false })).toBeVisible()

  // Marée basse poussée en direct
  await page.getByRole('button', { name: 'Marée haute' }).click()
  await expect(player.getByText('Marée basse', { exact: false })).toBeVisible()

  // Ajout d'un repère au clic, renommé et rendu visible
  await page.locator('svg[data-map]').click({ position: { x: 300, y: 200 } })
  await page.getByLabel('Nom du repère').fill('Taverne du Maelstrom')
  await page.getByRole('button', { name: 'Caché des joueurs' }).click()
  await expect(player.getByText('Taverne du Maelstrom')).toBeVisible()
})

test('markdown : le gras des notes est rendu', async ({ page }) => {
  await page.getByRole('button', { name: 'Notes' }).click()
  await page.getByRole('button', { name: '+ Nouvelle note' }).click()
  await page.getByPlaceholder('Titre de la note').fill('Test MD')
  await page.getByPlaceholder('Contenu de la note...').fill('Un **secret** important')
  await page.getByRole('button', { name: 'Sauvegarder' }).click()
  await expect(page.locator('strong', { hasText: 'secret' })).toBeVisible()
})
