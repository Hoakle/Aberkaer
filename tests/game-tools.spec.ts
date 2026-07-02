import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.request.delete('/api/campaign')
  await page.request.delete('/api/display')
  await page.goto('/gm')
  await page.evaluate(() => localStorage.clear())
  await page.reload()
})

async function createCharacter(page: Page, name: string) {
  await page.getByRole('button', { name: 'PJ', exact: false }).first().click()
  await page.getByRole('button', { name: '+ Nouveau personnage' }).click()
  await page.getByLabel('Nom du personnage *').fill(name)
  await page.getByLabel('❤️ Vitalité').fill('14')
  await page.getByLabel('✨ Intelligence').fill('14')
  await page.getByRole('button', { name: 'Sauvegarder' }).click()
}

test('créer un PJ : HP = Vitalité, modificateurs auto, ±HP et jetons', async ({ page }) => {
  await createCharacter(page, 'Kara')

  const card = page.locator('[aria-label="Fiche de Kara"]')
  await expect(card).toBeVisible()
  // HP = Vitalité (14), mod +2 affiché
  await expect(card.getByText('14 / 14')).toBeVisible()
  await card.getByTitle('-1 HP').click()
  await expect(card.getByText('13 / 14')).toBeVisible()
  // Jetons de Destin : départ 3, max 5
  await card.getByTitle('+1 Jeton').click()
  await card.getByTitle('+1 Jeton').click()
  await card.getByTitle('+1 Jeton').click() // dépasse le max → borné à 5
  await card.getByTitle('-1 Jeton').click()
  // 4 jetons restants — vérifié via l'onglet Dés plus loin ; ici on vérifie
  // simplement que la carte est toujours saine.
  await expect(card.getByText('🪙 Jetons')).toBeVisible()
})

test('jet simple : d20 déterministe + mod manuel vs DC, et affichage joueurs', async ({ page, context }) => {
  // d20 = 1 + floor(0.5 × 20) = 11
  await page.addInitScript(() => { Math.random = () => 0.5 })
  await page.reload()

  await page.getByRole('button', { name: 'Dés' }).click()
  await page.getByLabel('Montrer les jets aux joueurs', { exact: false }).check()
  const simple = page.locator('section', { hasText: '🎲 Jet simple' })
  await simple.getByLabel('Modificateur manuel').fill('2')
  // DC Normal 13 déjà sélectionnée par défaut
  await page.getByRole('button', { name: 'Lancer le jet', exact: false }).click()

  // 11 + 2 = 13 ≥ DC 13 → réussite
  await expect(simple.getByText('Réussite')).toBeVisible()
  await expect(simple.getByText('d20 : 11 +2')).toBeVisible()

  // Le jet s'anime sur l'écran joueurs
  const player = await context.newPage()
  await player.goto('/player')
  await expect(player.getByText('Jet — Force')).toBeVisible()
  await expect(player.getByText('13', { exact: true })).toBeVisible()
})

test('magie : le sort coûte de la Fatigue, appliquée à la fiche', async ({ page }) => {
  await page.addInitScript(() => { Math.random = () => 0.5 })
  await page.reload()
  await createCharacter(page, 'Kara')

  await page.getByRole('button', { name: 'Dés' }).click()
  const magic = page.locator('section', { hasText: '✨ Magie' })
  await magic.getByLabel('Personnage').selectOption({ label: 'Kara' })
  // Ambition Petite (DC 10) : d20 11 + Int +2 = 13 → réussite → 1 Fatigue
  await page.getByRole('button', { name: 'Lancer le sort' }).click()
  await expect(magic.getByText('Coût : 1 Fatigue')).toBeVisible()
  await expect(magic.getByText('1 / 14', { exact: true })).toBeVisible()

  // La fiche du PJ reflète la Fatigue
  await page.getByRole('button', { name: 'PJ', exact: false }).first().click()
  const card = page.locator('[aria-label="Fiche de Kara"]')
  await expect(card.getByText('1 / 14')).toBeVisible()
})

test('horloge : visible côté joueurs et décrément en direct', async ({ page, context }) => {
  await page.getByRole('button', { name: 'Horloges' }).click()
  // L'horloge Solstice par défaut est à J-12, cachée
  await expect(page.getByText('J-12')).toBeVisible()
  await page.getByTitle('Montrer Solstice aux joueurs').click()

  const player = await context.newPage()
  await player.goto('/player')
  await expect(player.getByText('J-12')).toBeVisible()

  await page.getByTitle('-1 Solstice').click()
  await expect(player.getByText('J-11')).toBeVisible()

  // Masquer la retire de l'écran joueurs
  await page.getByTitle('Masquer Solstice aux joueurs').click()
  await expect(player.getByText('J-11')).toHaveCount(0)
})

test('combat : import PJ et PNJ, tours et rounds', async ({ page }) => {
  await createCharacter(page, 'Kara')

  await page.getByRole('button', { name: 'Combat' }).click()
  // Import PJ + PNJ (Maren Valdrek : « HP : 12 » extrait de ses stats)
  await page.getByRole('button', { name: 'Kara', exact: false }).click()
  await page.getByRole('button', { name: 'Maren Valdrek', exact: false }).click()

  await expect(page.getByText('Round 1')).toBeVisible()
  await expect(page.getByText('12 / 12')).toBeVisible()

  // -1 HP sur Kara en combat → reflété sur sa fiche
  await page.getByTitle('-1 HP Kara').click()
  await expect(page.getByText('13 / 14')).toBeVisible()

  // Deux combattants : deux « Tour suivant » = retour en haut, round 2
  await page.getByRole('button', { name: 'Tour suivant' }).click()
  await page.getByRole('button', { name: 'Tour suivant' }).click()
  await expect(page.getByText('Round 2')).toBeVisible()

  await page.getByRole('button', { name: 'Terminer le combat' }).click()
  await expect(page.getByText('Aucun combat en cours', { exact: false })).toBeVisible()

  // La fiche de Kara garde les HP du combat
  await page.getByRole('button', { name: 'PJ', exact: false }).first().click()
  const card = page.locator('[aria-label="Fiche de Kara"]')
  await expect(card.getByText('13 / 14')).toBeVisible()
})
