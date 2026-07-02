import { test, expect } from '@playwright/test'

// Deux contextes navigateur isolés = deux appareils distincts :
// BroadcastChannel ne les traverse pas, seul le serveur (SSE) peut synchroniser.

test.beforeEach(async ({ request }) => {
  await request.delete('/api/display')
})

test('un appareil séparé reçoit la scène via le serveur', async ({ browser }) => {
  const gmContext = await browser.newContext()
  const playerContext = await browser.newContext()
  const gm = await gmContext.newPage()
  const player = await playerContext.newPage()

  await gm.goto('/gm')
  await player.goto('/player')

  await gm
    .getByPlaceholder('Un texte narratif, une citation, une description...')
    .fill('Vision depuis la tablette.')
  await gm.getByRole('button', { name: 'Caché' }).click()

  await expect(player.getByText('Vision depuis la tablette.')).toBeVisible()

  await gmContext.close()
  await playerContext.close()
})

test('un appareil qui arrive en retard rattrape l\'état via le serveur', async ({ browser }) => {
  const gmContext = await browser.newContext()
  const gm = await gmContext.newPage()
  await gm.goto('/gm')
  await gm
    .getByPlaceholder('Un texte narratif, une citation, une description...')
    .fill('Les cloches du Temple sonnent.')
  await gm.getByRole('button', { name: 'Caché' }).click()

  const lateContext = await browser.newContext()
  const late = await lateContext.newPage()
  await late.goto('/player')
  await expect(late.getByText('Les cloches du Temple sonnent.')).toBeVisible()

  await gmContext.close()
  await lateContext.close()
})

test('un écran MJ rechargé adopte l\'état d\'affichage en cours', async ({ browser }) => {
  const gmContext = await browser.newContext()
  const gm = await gmContext.newPage()
  await gm.goto('/gm')
  await gm
    .getByPlaceholder('Un texte narratif, une citation, une description...')
    .fill('Texte à retrouver après rechargement.')

  await gm.reload()
  await expect(
    gm.getByPlaceholder('Un texte narratif, une citation, une description...')
  ).toHaveValue('Texte à retrouver après rechargement.')

  await gmContext.close()
})
