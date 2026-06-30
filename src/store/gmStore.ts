import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { NPC, RuleSection, SessionNote, PlayerDisplay } from '../types'

interface GMStore {
  npcs: NPC[]
  rules: RuleSection[]
  notes: SessionNote[]
  display: PlayerDisplay

  // NPC actions
  addNPC: (npc: Omit<NPC, 'id'>) => void
  updateNPC: (id: string, data: Partial<NPC>) => void
  deleteNPC: (id: string) => void

  // Rules actions
  addRule: (rule: Omit<RuleSection, 'id'>) => void
  updateRule: (id: string, data: Partial<RuleSection>) => void
  deleteRule: (id: string) => void

  // Notes actions
  addNote: (note: Omit<SessionNote, 'id'>) => void
  updateNote: (id: string, data: Partial<SessionNote>) => void
  deleteNote: (id: string) => void

  // Display actions
  updateDisplay: (data: Partial<PlayerDisplay>) => void
}

const uid = () => Math.random().toString(36).slice(2, 9)

const defaultNPCs: NPC[] = [
  {
    id: uid(),
    name: 'Maren Valdrek',
    role: 'Fille aînée des Valdrek — Île Haute',
    stats: 'Vitalité 12 · Force 10 · Int 14 · Agi 12 · Chance 11 · Sagesse 15\nHP : 12 · Mod. dominant : Sagesse +2, Int +2',
    description: 'Jeune femme d\'une trentaine d\'années au regard direct. Vêtements soignés mais simples pour une noble. Aimée du peuple, connue pour ses réformes des taxes portuaires. Elle a demandé discrètement une enquête sur la mort de son père.',
    secrets: 'Sait que Cael a rencontré des représentants de la Guilde des Armateurs la semaine avant la mort d\'Edric. N\'en a pas de preuve concrète.\nCraint pour sa propre vie — deux accidents suspects en quinze jours.',
    imageUrl: '',
  },
  {
    id: uid(),
    name: 'Cael Valdrek',
    role: 'Fils cadet des Valdrek — suspect principal',
    stats: 'Vitalité 11 · Force 13 · Int 15 · Agi 12 · Chance 14 · Sagesse 8\nHP : 11 · Mod. dominant : Int +2, Force +1',
    description: 'Homme d\'une vingtaine d\'années, beau, froid. Parle peu et choisit ses mots. S\'est entouré de deux conseillers dont personne ne connaît l\'origine. Prend officiellement la succession de son père.',
    secrets: 'A commandité la mort d\'Edric via un intermédiaire de la Guilde des Armateurs.\nFinance l\'Œil du Fond sans en comprendre la vraie nature — il croyait acheter de la nécromancie utilitaire, il a lâché quelque chose de plus grand.\nSon argent provient d\'un détournement des taxes portuaires vieux de deux ans.',
    imageUrl: '',
  },
  {
    id: uid(),
    name: 'Isla "La Nœud"',
    role: 'Cheffe de la Confrérie du Fil Gris — Roz Fall',
    stats: 'Vitalité 10 · Force 11 · Int 13 · Agi 16 · Chance 15 · Sagesse 13\nHP : 10 · Mod. dominant : Agi +3, Chance +2',
    description: 'Femme d\'une quarantaine d\'années, tatouages aux poignets (nœuds marins). Toujours accompagnée d\'au moins un garde discret. Accède uniquement par barque à Roz Fall. Méfiante avec les inconnus, directe avec ceux qui ont prouvé leur valeur.',
    secrets: 'A été approchée et payée par Cael pour son silence sur une livraison nocturne à l\'Île du Temple il y a trois semaines.\nN\'aime pas Cael — elle a accepté l\'argent mais n\'a pas renoncé à ses propres intérêts.\nSait où se trouve le passage souterrain entre Roz Fall et la Vieille Ville.',
    imageUrl: '',
  },
  {
    id: uid(),
    name: 'Grand Prêtre Sorel',
    role: 'Chef du Culte de l\'Onde Éternelle — Île du Temple',
    stats: 'Vitalité 10 · Force 9 · Int 14 · Agi 10 · Chance 12 · Sagesse 16\nHP : 10 · Mod. dominant : Sagesse +3, Int +2',
    description: 'Vieil homme aux cheveux blancs, robe bleue à liserés d\'argent. Voix douce et posée. Dirige les cérémonies du fleuve depuis vingt ans. Présent aux funérailles d\'Edric et agité depuis, sans en expliquer la raison.',
    secrets: 'Sait que l\'Œil du Fond a infiltré son culte — il sous-estime encore leur nombre et leur avancement.\nA dissimulé la disparition de Frère Omric pour éviter un scandale. Commence à regretter cette décision.\nJoue sur les deux tableaux Cael/Maren : veut rester influent quel que soit le vainqueur.',
    imageUrl: '',
  },
  {
    id: uid(),
    name: 'Frère Omric',
    role: 'Chef de l\'Œil du Fond — localisation inconnue',
    stats: 'Vitalité 13 · Force 11 · Int 18 · Agi 10 · Chance 9 · Sagesse 14\nHP : 13 · Fatigue max : 18 · Mod. dominant : Int +4, Sagesse +2',
    description: 'Ancien prêtre respecté du Culte de l\'Onde Éternelle. Disparu il y a deux ans. Les rares témoins récents le décrivent comme "le même homme, mais avec quelque chose d\'éteint dans le regard".',
    secrets: 'Dirige l\'Œil du Fond depuis les caves de l\'Île du Temple, accessibles uniquement par un passage sous-marin (révélé à marée basse).\nMaîtrise la nécromancie du Grand Fond : invoque et contrôle les esprits du fleuve, a créé le Golem de vase.\nObjectif réel : déclencher un rituel qui "éveille" le Grand Fond au solstice — dans 12 jours.\nIgnore totalement Cael et son argent — il s\'en est servi pour ses fournitures, ne lui doit rien.',
    imageUrl: '',
  },
]

const defaultRules: RuleSection[] = [
  {
    id: uid(),
    title: 'Résolution de base',
    content: `Jet = d20 + modificateur de stat
→ Succès si résultat ≥ DC fixée par le MJ

+2 supplémentaire si une Vérité s'applique à l'intention de l'action

Critique (nat 20) : réussite automatique, effet amplifié — 5% toujours
Échec critique (nat 1) : échec automatique, complication narrative — 5% toujours
Les critiques ignorent modificateurs et DC.

DUEL (combat, joute verbale, poursuite)
→ Les deux camps lancent d20 + mod. Le plus haut l'emporte. Égalité = impasse.`,
  },
  {
    id: uid(),
    title: 'Difficultés (DC)',
    content: `Facile    → DC 10
Normal    → DC 13
Difficile → DC 16
Extrême   → DC 19

Le MJ fixe la DC avant le jet, jamais après.`,
  },
  {
    id: uid(),
    title: 'Les 6 Stats & Modificateurs',
    content: `Modificateur = (Score − 10) ÷ 2  (arrondi à l'inférieur)

Score  :  8   9  10  11  12  13  14  15  16  17  18
Mod    : −1  −1  +0  +0  +1  +1  +2  +2  +3  +3  +4

❤️ Vitalité  → HP, endurance, résister aux blessures
⚔️ Force     → armes de guerre, exploits physiques, intimidation brute
✨ Intelligence → magie, érudition, raisonnement (Fatigue max = Score)
🤸 Agilité   → dagues, esquive, discrétion, acrobaties, armes de jet
🍀 Chance    → larcin, opportunisme, armes légères, instinct
🧘 Sagesse   → résistance mentale, perception, récupération, spiritualité

HP = Score de Vitalité
Fatigue max = Score d'Intelligence`,
  },
  {
    id: uid(),
    title: 'Les Vérités',
    content: `Chaque PJ a 3 Vérités — phrases courtes issues de son background.
→ +2 au jet quand la Vérité est thématiquement pertinente pour l'ACTION.

Une seule Vérité par jet. Si deux semblent valides : le joueur choisit.
En cas de doute : le MJ tranche — et il dit OUI par défaut.
La Vérité s'applique selon l'INTENTION narrative, pas la forme mécanique.

Exemples :
"J'ai grandi dans les ruelles de Roz Fall"
→ +2 larcin, filature, se fondre dans la foule d'Aberkaer

"Dix ans au service du Culte de l'Onde Éternelle"
→ +2 résister à la manipulation, connaissances religieuses locales`,
  },
  {
    id: uid(),
    title: 'Jetons de Destin',
    content: `Départ : 3 jetons par joueur. Maximum : 5.

DÉPENSER (après un lancer) :
• Relancer le d20, conserver le nouveau résultat
• OU ajouter +5 directement au résultat

GAGNER 1 jeton quand un joueur :
• Joue un trait ou une faiblesse de façon marquante
• Fait une belle description de son action
• Prend une décision in-character au détriment de son efficacité

→ Les jetons se gagnent en étant soi-même, pas en étant efficace.`,
  },
  {
    id: uid(),
    title: 'Magie',
    content: `Jet de magie = d20 + mod. Intelligence
+2 si une Vérité correspond à l'INTENTION du sort (pas à l'école)
Pas de liste de sorts — le joueur décrit l'effet, le MJ fixe la DC.

DC selon l'ambition :
Petite (lumière, bruit, illusion légère)   → DC 10
Moyenne (transformer, déplacer, tromper)   → DC 13
Grande (explosion, soin important, contrôle) → DC 16
Extrême (changer le cours d'une scène)     → DC 19

Coût en Fatigue :
Succès           → 1 Fatigue
Échec            → 2 Fatigue
Échec critique   → 3 Fatigue + complication narrative
Succès critique  → 1 Fatigue, effet amplifié

Au-delà de la Fatigue max → le PJ s'effondre, plus de magie jusqu'au repos.

4 Écoles (couleur narrative seulement, pas de mécanique propre) :
🔥 Élémentaire — matière et forces naturelles
🧠 Esprit       — émotions, pensées, perceptions
🌿 Vivant       — corps, vie, mort, soins (liée au Culte)
🌑 Ombre        — espace, temps, liens invisibles (vue avec méfiance à Aberkaer)`,
  },
  {
    id: uid(),
    title: 'Création de personnage',
    content: `Méthode 1 — Tableau standard (recommandé)
Assigne ces 6 valeurs aux stats dans l'ordre de ton choix :
15 · 14 · 13 · 12 · 10 · 8

Méthode 2 — Achat de points
Toutes les stats démarrent à 8. Budget : 27 points.
Score :  8   9  10  11  12  13  14  15
Coût  :  0   1   2   3   4   5   7   9

Étapes :
1. Assigner les scores aux 6 stats
2. Calculer les Modificateurs = (Score − 10) ÷ 2 ↓
3. HP = Score de Vitalité
4. Fatigue max = Score d'Intelligence
5. Écrire 3 Vérités issues du background
6. Démarrer avec 3 Jetons de Destin`,
  },
  {
    id: uid(),
    title: 'Les 7 Îles d\'Aberkaer',
    content: `🏪 Île du Négoce  — docks, marchés, entrepôts. Grand pont nord + bacs.
                    Sons : cris de dockers, poisson, goudron.

🏚️ Vieille Ville  — quartier pauvre, dense, labyrinthique. Vieux pont + chemin marée basse.
                    Sons : enfants, linge aux fenêtres, pain, fumée.

💰 Île Haute      — quartier riche, jardins. Pont + bacs sélectifs.
                    Sons : silence, bottes sur pavé propre.

🏰 Basse Ville    — ancienne forteresse, quartier populaire fier. Pont + chemin marée basse.
                    Sons : rires de salle de garde, bière, forge.

⛪ Île du Temple  — Culte de l'Onde Éternelle. Bac officiel.
                    Sons : chants liturgiques, encens, eau salée.

🎭 Île des Plaisirs — tavernes, théâtres. Bacs + barques privées.
                    Sons : luth, rires, cire fondue, vin renversé.

🌑 Roz Fall       — refuge des discrets. Barques uniquement, pas de pont.
                    Sons : silence, eau qui clapote, vase — et des yeux.

CHEMINS À MARÉE BASSE : passages vaseux entre certaines îles.
Connus des locaux et contrebandiers. Danger : marée montante.`,
  },
]

const defaultNotes: SessionNote[] = [
  {
    id: uid(),
    title: 'Objectif principal — mort d\'Edric Valdrek',
    content: 'Les joueurs enquêtent sur la mort suspecte de Lord Edric Valdrek, patriarche de la famille régnante.\nSuspect principal : Cael Valdrek (fils cadet), soutenu par la Guilde des Armateurs.\nAlliée potentielle : Maren Valdrek (fille aînée) — c\'est elle qui a commandé l\'enquête discrètement.',
    category: 'objectif',
  },
  {
    id: uid(),
    title: 'Intrigue parallèle — l\'Œil du Fond',
    content: 'L\'Œil du Fond agit INDÉPENDAMMENT du meurtre d\'Edric. Deux fils distincts.\nFrère Omric orchestre des rituels nécromantiques depuis les caves de l\'Île du Temple.\nObjectif : éveiller le Grand Fond au solstice → dans 12 jours.\nCael les a financés sans comprendre leur vraie ampleur.',
    category: 'hook',
  },
  {
    id: uid(),
    title: '⚠️ Fausse piste centrale à maintenir',
    content: 'Les phénomènes étranges (esprits du fleuve, Golem de vase, ombres errantes) semblent être une punition divine.\nC\'est FAUX — c\'est de la nécromancie orchestrée par l\'Œil du Fond.\nNe jamais corriger les joueurs trop tôt. Laisser la révélation venir d\'eux.',
    category: 'reminder',
  },
  {
    id: uid(),
    title: 'Contacts utiles pour les joueurs',
    content: '• Maren Valdrek (Île Haute) — commanditaire, peut ouvrir des portes officielles\n• Isla "La Nœud" (Roz Fall) — informations contre services ou argent, accès par barque\n• Grand Prêtre Sorel (Île du Temple) — ambigu, à manier avec prudence\n• Les Voix du Fleuve (Vieille Ville) — alliés populaires, désorganisés, infiltrés',
    category: 'reminder',
  },
  {
    id: uid(),
    title: 'Hook d\'accroche session 1',
    content: 'Une lettre cachetée du sceau des Valdrek est glissée sous la porte de chaque joueur au lever du jour.\n"Lord Edric est mort. Officellement de maladie. Je ne le crois pas. — M.V."\nLieu de rendez-vous : arrière-salle de la taverne du Maelstrom, Île des Plaisirs, ce soir.',
    category: 'hook',
  },
]

export const useGMStore = create<GMStore>()(
  persist(
    (set) => ({
      npcs: defaultNPCs,
      rules: defaultRules,
      notes: defaultNotes,
      display: {
        imageUrl: '',
        caption: '',
        audioUrl: '',
        audioPlaying: false,
        audioVolume: 0.5,
        overlayText: '',
        showOverlay: false,
      },

      addNPC: (npc) => set((s) => ({ npcs: [...s.npcs, { ...npc, id: uid() }] })),
      updateNPC: (id, data) =>
        set((s) => ({ npcs: s.npcs.map((n) => (n.id === id ? { ...n, ...data } : n)) })),
      deleteNPC: (id) => set((s) => ({ npcs: s.npcs.filter((n) => n.id !== id) })),

      addRule: (rule) => set((s) => ({ rules: [...s.rules, { ...rule, id: uid() }] })),
      updateRule: (id, data) =>
        set((s) => ({ rules: s.rules.map((r) => (r.id === id ? { ...r, ...data } : r)) })),
      deleteRule: (id) => set((s) => ({ rules: s.rules.filter((r) => r.id !== id) })),

      addNote: (note) => set((s) => ({ notes: [...s.notes, { ...note, id: uid() }] })),
      updateNote: (id, data) =>
        set((s) => ({ notes: s.notes.map((n) => (n.id === id ? { ...n, ...data } : n)) })),
      deleteNote: (id) => set((s) => ({ notes: s.notes.filter((n) => n.id !== id) })),

      updateDisplay: (data) => set((s) => ({ display: { ...s.display, ...data } })),
    }),
    { name: 'aberkaer-gm' }
  )
)
