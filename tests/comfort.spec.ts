import { test, expect } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.request.delete('/api/campaign')
  await page.request.delete('/api/display')
  await page.goto('/gm')
  await page.evaluate(() => localStorage.clear())
  await page.reload()
  // Attendre que l'app (et ses raccourcis clavier) soit montée
  await expect(page.getByRole('button', { name: '⏹ Rideau' })).toBeVisible()
})

test('rideau : B coupe la scène côté joueurs, B la restaure', async ({ page, context }) => {
  const player = await context.newPage()
  await player.goto('/player')

  // Une scène est affichée
  await page.getByPlaceholder('Un texte narratif, une citation, une description...')
    .fill('Le golem émerge de la vase.')
  await page.getByRole('button', { name: 'Caché' }).click()
  await expect(player.getByText('Le golem émerge de la vase.')).toBeVisible()

  // B → rideau : le noir recouvre la scène
  await page.keyboard.press('b')
  await expect(page.getByRole('button', { name: 'Rideau baissé — relever' })).toBeVisible()
  await expect(player.locator('[data-curtain="down"]')).toBeVisible()
  await expect(player.locator('[data-curtain="down"]')).toHaveCSS('opacity', '1')

  // B → la scène revient
  await page.keyboard.press('b')
  await expect(player.locator('[data-curtain="up"]')).toBeAttached()
  await expect(player.getByText('Le golem émerge de la vase.')).toBeVisible()
})

test('le rideau ne se déclenche pas pendant la saisie', async ({ page }) => {
  const textarea = page.getByPlaceholder('Un texte narratif, une citation, une description...')
  await textarea.click()
  await textarea.pressSequentially('bb')
  await expect(textarea).toHaveValue('bb')
  await expect(page.getByRole('button', { name: 'Rideau baissé — relever' })).toHaveCount(0)
})

test('file de scènes : lecture au clic, → et 1–9 au clavier', async ({ page, context }) => {
  const player = await context.newPage()
  await player.goto('/player')

  // Les deux scènes d'exemple sont listées
  await expect(page.getByText('Ouverture — la lettre')).toBeVisible()
  await expect(page.getByText('Taverne du Maelstrom', { exact: true })).toBeVisible()

  // Lecture au clic
  await page.getByTitle('Jouer la scène Ouverture — la lettre').click()
  await expect(player.getByText('Une lettre cachetée du sceau des Valdrek', { exact: false })).toBeVisible()

  // → passe à la scène suivante (focus hors saisie)
  await page.locator('body').click()
  await page.keyboard.press('ArrowRight')
  await expect(player.getByText('La salle est basse et enfumée', { exact: false })).toBeVisible()

  // 1 rejoue la première scène directement
  await page.keyboard.press('1')
  await expect(player.getByText('Une lettre cachetée du sceau des Valdrek', { exact: false })).toBeVisible()
})

test('vue joueurs : bouton plein écran présent et manifest lié', async ({ page, context }) => {
  const player = await context.newPage()
  await player.goto('/player')
  await expect(player.getByTitle('Plein écran')).toBeAttached()

  const manifest = await player.request.get('/manifest.webmanifest')
  expect(manifest.ok()).toBeTruthy()
  expect((await manifest.json()).start_url).toBe('/player')
})
