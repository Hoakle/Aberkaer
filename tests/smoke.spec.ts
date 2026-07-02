import { test, expect } from '@playwright/test'

// Chaque test partant d'un état neuf : on vide la campagne côté serveur
// et côté navigateur, puis on recharge les données par défaut.
test.beforeEach(async ({ page }) => {
  await page.request.delete('/api/campaign')
  await page.goto('/gm')
  await page.evaluate(() => localStorage.clear())
  await page.reload()
})

test('la vue MJ affiche les onglets et les données par défaut', async ({ page }) => {
  await expect(page.getByText('Écran de Maître de Jeu')).toBeVisible()

  await page.getByRole('button', { name: 'PNJ' }).click()
  await expect(page.getByText('Maren Valdrek').first()).toBeVisible()

  await page.getByRole('button', { name: 'Règles' }).click()
  await expect(page.getByText('Résolution de base')).toBeVisible()

  await page.getByRole('button', { name: 'Notes' }).click()
  await expect(page.getByText('Hook d\'accroche session 1')).toBeVisible()
})

test('une règle s\'ouvre en lecture puis passe en édition', async ({ page }) => {
  await page.getByRole('button', { name: 'Règles' }).click()
  await page.getByRole('button', { name: 'Jetons de Destin' }).click()

  // Vue lecture d'abord
  await expect(page.getByText('Départ : 3 jetons par joueur')).toBeVisible()
  await expect(page.getByLabel('Titre de la section')).toHaveCount(0)

  // Puis édition sur demande
  await page.getByRole('button', { name: '✎ Modifier' }).click()
  await expect(page.getByText('Titre de la section')).toBeVisible()
})

test('créer un PNJ le fait apparaître dans la liste et persiste après rechargement', async ({ page }) => {
  await page.getByRole('button', { name: 'PNJ' }).click()
  await page.getByRole('button', { name: '+ Nouveau PNJ' }).click()

  // Le nom est requis : sauvegarder sans nom affiche une erreur
  await page.getByRole('button', { name: 'Sauvegarder' }).click()
  await expect(page.getByText('Le nom est requis')).toBeVisible()

  await page.getByLabel('Nom *').fill('Testeur du Fond')
  await page.getByLabel('Rôle').fill('PNJ de test')
  await page.getByRole('button', { name: 'Sauvegarder' }).click()
  await expect(page.getByText('Testeur du Fond')).toBeVisible()

  // Persistance : attendre le debounce d'écriture puis recharger
  await page.waitForTimeout(1000)
  await page.reload()
  await page.getByRole('button', { name: 'PNJ' }).click()
  await expect(page.getByText('Testeur du Fond')).toBeVisible()
})

test('le texte d\'ambiance poussé par le MJ apparaît sur la vue joueurs', async ({ page, context }) => {
  const playerPage = await context.newPage()
  await playerPage.goto('/player')
  await expect(playerPage.getByText('En attente du Maître de Jeu...')).toBeVisible()

  await page.getByPlaceholder('Un texte narratif, une citation, une description...')
    .fill('La marée descend sur Roz Fall.')
  await page.getByRole('button', { name: 'Caché' }).click()

  await expect(playerPage.getByText('La marée descend sur Roz Fall.')).toBeVisible()
})

test('une vue joueurs ouverte après coup rattrape l\'état courant (handshake)', async ({ page, context }) => {
  await page.getByPlaceholder('Un texte narratif, une citation, une description...')
    .fill('Le solstice approche.')
  await page.getByRole('button', { name: 'Caché' }).click()

  // La vue joueurs s'ouvre APRÈS que le MJ a poussé l'état
  const playerPage = await context.newPage()
  await playerPage.goto('/player')
  await expect(playerPage.getByText('Le solstice approche.')).toBeVisible()
})
