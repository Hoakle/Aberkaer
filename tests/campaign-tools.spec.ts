import { test, expect } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.request.delete('/api/campaign')
  await page.request.delete('/api/display')
  await page.goto('/gm')
  await page.evaluate(() => localStorage.clear())
  await page.reload()
})

test('multi-campagnes : création, isolement des données, sélection, archivage', async ({ request }) => {
  const init = await (await request.get('/api/campaigns')).json()
  expect(init.active).toBe('aberkaer')

  // Écrire un marqueur dans la campagne A
  await request.post('/api/campaign', { data: { state: { marker: 'A' } } })

  // Créer la campagne B → devient active, et repart de zéro
  const created = await (
    await request.post('/api/campaigns', { data: { action: 'create', name: 'Marées Noires' } })
  ).json()
  expect(created.active).toBe('marees-noires')
  expect(await (await request.get('/api/campaign')).text()).toBe('null')

  // Écrire dans B, revenir à A : les données de A sont intactes
  await request.post('/api/campaign', { data: { state: { marker: 'B' } } })
  await request.post('/api/campaigns', { data: { action: 'select', id: 'aberkaer' } })
  const a = await (await request.get('/api/campaign')).json()
  expect(a.state.marker).toBe('A')

  // Les deux campagnes sont listées, puis B est archivée
  const list = await (await request.get('/api/campaigns')).json()
  expect(list.campaigns.map((c: { id: string }) => c.id).sort()).toEqual(['aberkaer', 'marees-noires'])
  await request.post('/api/campaigns', { data: { action: 'archive', id: 'marees-noires' } })
  const after = await (await request.get('/api/campaigns')).json()
  expect(after.campaigns.map((c: { id: string }) => c.id)).toEqual(['aberkaer'])
  expect(after.active).toBe('aberkaer')
})

test('recherche globale : Ctrl+K retrouve Omric partout, avec extraits', async ({ page }) => {
  // Attendre que l'app soit montée avant d'envoyer le raccourci
  await expect(page.getByRole('button', { name: '🔍 Rechercher' })).toBeVisible()
  await page.keyboard.press('Control+k')
  await page.getByLabel('Recherche globale').fill('Omric')

  // Sa fiche PNJ, la note qui le mentionne et la timeline ressortent
  await expect(page.getByText('Frère Omric', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: '🧵 Il y a 2 ans — Disparition de Frère Omric' })).toBeVisible()
  await expect(page.getByRole('button', { name: '📝 Intrigue parallèle' })).toBeVisible()

  // Naviguer vers le premier résultat (PNJ) ferme la palette et change d'onglet
  await page.getByRole('button', { name: 'Frère Omric PNJ' }).click()
  await expect(page.getByLabel('Recherche globale')).toHaveCount(0)
  await expect(page.getByRole('button', { name: '+ Nouveau PNJ' })).toBeVisible()
})

test('wikilink : [[Nom]] dans une note devient un lien qui ouvre la recherche', async ({ page }) => {
  await page.getByRole('button', { name: 'Notes' }).click()
  await page.getByRole('button', { name: '+ Nouvelle note' }).click()
  await page.getByPlaceholder('Titre de la note').fill('Piste')
  await page.getByPlaceholder('Contenu de la note...').fill('Interroger [[Frère Omric]] sur le passage.')
  await page.getByRole('button', { name: 'Sauvegarder' }).click()

  const link = page.locator('a.wikilink', { hasText: 'Frère Omric' })
  await expect(link).toBeVisible()
  await link.click()
  await expect(page.getByLabel('Recherche globale')).toHaveValue('Frère Omric')
})

test('campagne : timeline par défaut, journal de session', async ({ page }) => {
  await page.getByRole('button', { name: '📔 Campagne' }).click()

  // La timeline des deux fils est là, avec vérité MJ
  await expect(page.getByText('Mort de Lord Edric Valdrek')).toBeVisible()
  await expect(page.getByText('🔒 Vérité : Assassiné sur ordre de Cael', { exact: false })).toBeVisible()

  // Journal : nouvelle session pré-remplie avec le gabarit
  await page.getByRole('button', { name: '+ Nouvelle session' }).click()
  await page.getByLabel('Titre de la session').fill('Session 1 — La lettre')
  await page.getByRole('button', { name: 'Sauvegarder' }).click()
  await expect(page.getByText('Session 1 — La lettre')).toBeVisible()
  await expect(page.locator('h2', { hasText: 'Moments forts' })).toBeVisible()
})

test('générateurs : rumeur et nom de PNJ produisent un résultat', async ({ page }) => {
  await page.getByRole('button', { name: '📔 Campagne' }).click()
  await page.getByRole('button', { name: 'Rumeur de taverne' }).click()
  await page.getByRole('button', { name: 'Nom de PNJ' }).click()

  const results = page.locator('[aria-label="Résultats des générateurs"] p')
  await expect(results).toHaveCount(2)
  await expect(results.first()).toContainText('🪪')
})

test('relations : le graphe relie les PNJ qui se mentionnent', async ({ page }) => {
  await page.getByRole('button', { name: 'PNJ', exact: false }).click()
  await page.getByRole('button', { name: '🕸 Relations' }).click()

  const graph = page.locator('svg[aria-label="Graphe de relations des PNJ"]')
  await expect(graph).toBeVisible()
  await expect(graph.getByText('Cael Valdrek')).toBeVisible()
  // Cael et Maren se mentionnent : au moins une arête existe
  await expect(graph.locator('line').first()).toBeAttached()

  // Cliquer sur un nœud ouvre la fiche
  await graph.getByText('Frère Omric').click()
  await expect(page.getByText('🔒 Secrets — MJ uniquement')).toBeVisible()
})
