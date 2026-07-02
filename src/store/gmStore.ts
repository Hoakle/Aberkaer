import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { campaignStorage } from './fileStorage'
import { clamp, TOKEN_MAX } from '../game/rules'
import { uid } from '../utils/uid'
import type {
  NPC,
  RuleSection,
  SessionNote,
  PlayerDisplay,
  Character,
  CampaignClock,
  CombatState,
  Combatant,
  Handout,
  MapPin,
  Tide,
  SessionLog,
  TimelineEvent,
  Scene,
} from '../types'

interface GMStore {
  npcs: NPC[]
  rules: RuleSection[]
  notes: SessionNote[]
  characters: Character[]
  clocks: CampaignClock[]
  combat: CombatState
  handouts: Handout[]
  mapPins: MapPin[]
  tide: Tide
  sessionLogs: SessionLog[]
  timeline: TimelineEvent[]
  scenes: Scene[]
  sceneIndex: number // scène courante de la file (-1 = aucune)
  display: PlayerDisplay

  addNPC: (npc: Omit<NPC, 'id'>) => void
  updateNPC: (id: string, data: Partial<NPC>) => void
  deleteNPC: (id: string) => void

  addRule: (rule: Omit<RuleSection, 'id'>) => void
  updateRule: (id: string, data: Partial<RuleSection>) => void
  deleteRule: (id: string) => void

  addNote: (note: Omit<SessionNote, 'id'>) => void
  updateNote: (id: string, data: Partial<SessionNote>) => void
  deleteNote: (id: string) => void

  addCharacter: (c: Omit<Character, 'id'>) => void
  updateCharacter: (id: string, data: Partial<Character>) => void
  deleteCharacter: (id: string) => void
  // ±HP / ±Fatigue / ±Jetons en un clic, avec bornes du système
  adjustCharacter: (id: string, field: 'hp' | 'fatigue' | 'tokens', delta: number) => void

  addClock: (c: Omit<CampaignClock, 'id'>) => void
  updateClock: (id: string, data: Partial<CampaignClock>) => void
  deleteClock: (id: string) => void
  adjustClock: (id: string, delta: number) => void

  combatAdd: (c: Omit<Combatant, 'id'>) => void
  combatRemove: (id: string) => void
  combatUpdate: (id: string, data: Partial<Combatant>) => void
  combatAdjustHp: (id: string, delta: number) => void
  combatMove: (id: string, dir: -1 | 1) => void
  combatNextTurn: () => void
  combatEnd: () => void

  addHandout: (h: Omit<Handout, 'id'>) => void
  updateHandout: (id: string, data: Partial<Handout>) => void
  deleteHandout: (id: string) => void

  addMapPin: (p: Omit<MapPin, 'id'>) => void
  updateMapPin: (id: string, data: Partial<MapPin>) => void
  deleteMapPin: (id: string) => void
  setTide: (tide: Tide) => void

  addSessionLog: (l: Omit<SessionLog, 'id'>) => void
  updateSessionLog: (id: string, data: Partial<SessionLog>) => void
  deleteSessionLog: (id: string) => void

  addTimelineEvent: (e: Omit<TimelineEvent, 'id'>) => void
  updateTimelineEvent: (id: string, data: Partial<TimelineEvent>) => void
  deleteTimelineEvent: (id: string) => void
  moveTimelineEvent: (id: string, dir: -1 | 1) => void

  addScene: (s: Omit<Scene, 'id'>) => void
  updateScene: (id: string, data: Partial<Scene>) => void
  deleteScene: (id: string) => void
  moveScene: (id: string, dir: -1 | 1) => void
  setSceneIndex: (index: number) => void

  updateDisplay: (data: Partial<PlayerDisplay>) => void
}

// Fallback defaults if campaign-data.json is absent
const defaultNPCs: NPC[] = [
  {
    id: 'npc-maren',
    name: 'Maren Valdrek',
    role: 'Fille aînée des Valdrek — Île Haute',
    stats: 'Vitalité 12 · Force 10 · Int 14 · Agi 12 · Chance 11 · Sagesse 15\nHP : 12 · Mod. dominant : Sagesse +2, Int +2',
    description: 'Jeune femme d\'une trentaine d\'années au regard direct. Vêtements soignés mais simples pour une noble. Aimée du peuple, connue pour ses réformes des taxes portuaires. Elle a demandé discrètement une enquête sur la mort de son père.',
    secrets: 'Sait que Cael a rencontré des représentants de la Guilde des Armateurs la semaine avant la mort d\'Edric. N\'en a pas de preuve concrète.\nCraint pour sa propre vie — deux accidents suspects en quinze jours.',
    imageUrl: '',
  },
  {
    id: 'npc-cael',
    name: 'Cael Valdrek',
    role: 'Fils cadet des Valdrek — suspect principal',
    stats: 'Vitalité 11 · Force 13 · Int 15 · Agi 12 · Chance 14 · Sagesse 8\nHP : 11 · Mod. dominant : Int +2, Force +1',
    description: 'Homme d\'une vingtaine d\'années, beau, froid. Parle peu et choisit ses mots. S\'est entouré de deux conseillers dont personne ne connaît l\'origine. Prend officiellement la succession de son père.',
    secrets: 'A commandité la mort d\'Edric via un intermédiaire de la Guilde des Armateurs.\nFinance l\'Œil du Fond sans en comprendre la vraie nature — il croyait acheter de la nécromancie utilitaire.\nSon argent provient d\'un détournement des taxes portuaires vieux de deux ans.',
    imageUrl: '',
  },
  {
    id: 'npc-isla',
    name: 'Isla "La Nœud"',
    role: 'Cheffe de la Confrérie du Fil Gris — Roz Fall',
    stats: 'Vitalité 10 · Force 11 · Int 13 · Agi 16 · Chance 15 · Sagesse 13\nHP : 10 · Mod. dominant : Agi +3, Chance +2',
    description: 'Femme d\'une quarantaine d\'années, tatouages aux poignets (nœuds marins). Toujours accompagnée d\'au moins un garde discret. Accède uniquement par barque à Roz Fall. Méfiante avec les inconnus, directe avec ceux qui ont prouvé leur valeur.',
    secrets: 'A été approchée et payée par Cael pour son silence sur une livraison nocturne à l\'Île du Temple il y a trois semaines.\nN\'aime pas Cael — elle a accepté l\'argent mais n\'a pas renoncé à ses propres intérêts.\nSait où se trouve le passage souterrain entre Roz Fall et la Vieille Ville.',
    imageUrl: '',
  },
  {
    id: 'npc-sorel',
    name: 'Grand Prêtre Sorel',
    role: 'Chef du Culte de l\'Onde Éternelle — Île du Temple',
    stats: 'Vitalité 10 · Force 9 · Int 14 · Agi 10 · Chance 12 · Sagesse 16\nHP : 10 · Mod. dominant : Sagesse +3, Int +2',
    description: 'Vieil homme aux cheveux blancs, robe bleue à liserés d\'argent. Voix douce et posée. Dirige les cérémonies du fleuve depuis vingt ans. Présent aux funérailles d\'Edric et agité depuis, sans en expliquer la raison.',
    secrets: 'Sait que l\'Œil du Fond a infiltré son culte — il sous-estime encore leur nombre et leur avancement.\nA dissimulé la disparition de Frère Omric pour éviter un scandale. Commence à regretter cette décision.\nJoue sur les deux tableaux Cael/Maren : veut rester influent quel que soit le vainqueur.',
    imageUrl: '',
  },
  {
    id: 'npc-omric',
    name: 'Frère Omric',
    role: 'Chef de l\'Œil du Fond — localisation inconnue',
    stats: 'Vitalité 13 · Force 11 · Int 18 · Agi 10 · Chance 9 · Sagesse 14\nHP : 13 · Fatigue max : 18 · Mod. dominant : Int +4, Sagesse +2',
    description: 'Ancien prêtre respecté du Culte de l\'Onde Éternelle. Disparu il y a deux ans. Les rares témoins récents le décrivent comme "le même homme, mais avec quelque chose d\'éteint dans le regard".',
    secrets: 'Dirige l\'Œil du Fond depuis les caves de l\'Île du Temple, accessibles uniquement par un passage sous-marin révélé à marée basse.\nMaîtrise la nécromancie du Grand Fond : invoque et contrôle les esprits du fleuve, a créé le Golem de vase.\nObjectif : déclencher un rituel qui "éveille" le Grand Fond au solstice — dans 12 jours.\nIgnore totalement Cael et son argent — il s\'en est servi, ne lui doit rien.',
    imageUrl: '',
  },
]

const defaultRules: RuleSection[] = [
  {
    id: 'rule-resolution',
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
    id: 'rule-dc',
    title: 'Difficultés (DC)',
    content: `Facile    → DC 10
Normal    → DC 13
Difficile → DC 16
Extrême   → DC 19

Le MJ fixe la DC avant le jet, jamais après.`,
  },
  {
    id: 'rule-stats',
    title: 'Les 6 Stats & Modificateurs',
    content: `Modificateur = (Score − 10) ÷ 2  (arrondi à l'inférieur)

Score  :  8   9  10  11  12  13  14  15  16  17  18
Mod    : −1  −1  +0  +0  +1  +1  +2  +2  +3  +3  +4

❤️ Vitalité     → HP, endurance, résister aux blessures
⚔️ Force        → armes de guerre, exploits physiques, intimidation brute
✨ Intelligence → magie, érudition, raisonnement  (Fatigue max = Score)
🤸 Agilité      → dagues, esquive, discrétion, acrobaties, armes de jet
🍀 Chance       → larcin, opportunisme, armes légères, instinct
🧘 Sagesse      → résistance mentale, perception, récupération, spiritualité

HP = Score de Vitalité
Fatigue max = Score d'Intelligence`,
  },
  {
    id: 'rule-verites',
    title: 'Les Vérités',
    content: `Chaque PJ a 3 Vérités — phrases courtes issues de son background.
→ +2 au jet quand la Vérité est thématiquement pertinente pour l'ACTION.

Une seule Vérité par jet. Si deux semblent valides : le joueur choisit.
En cas de doute : le MJ tranche — et il dit OUI par défaut.
S'applique selon l'INTENTION narrative, pas la forme mécanique.

Exemples :
"J'ai grandi dans les ruelles de Roz Fall"
→ +2 larcin, filature, se fondre dans la foule d'Aberkaer

"Dix ans au service du Culte de l'Onde Éternelle"
→ +2 résister à la manipulation, connaissances religieuses locales`,
  },
  {
    id: 'rule-jetons',
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
    id: 'rule-magie',
    title: 'Magie',
    content: `Jet = d20 + mod. Intelligence
+2 si une Vérité correspond à l'INTENTION du sort (pas à l'école)
Pas de liste de sorts — le joueur décrit l'effet, le MJ fixe la DC.

DC selon l'ambition :
Petite (lumière, bruit, illusion légère)    → DC 10
Moyenne (transformer, déplacer, tromper)    → DC 13
Grande (explosion, soin important, contrôle)→ DC 16
Extrême (changer le cours d'une scène)      → DC 19

Coût en Fatigue :
Succès          → 1 Fatigue
Échec           → 2 Fatigue
Échec critique  → 3 Fatigue + complication narrative
Succès critique → 1 Fatigue, effet amplifié

Au-delà de la Fatigue max → s'effondre, plus de magie jusqu'au repos.

🔥 Élémentaire — matière et forces naturelles
🧠 Esprit       — émotions, pensées, perceptions
🌿 Vivant       — corps, vie, mort, soins (liée au Culte)
🌑 Ombre        — espace, temps, liens invisibles (vue avec méfiance)`,
  },
  {
    id: 'rule-creation',
    title: 'Création de personnage',
    content: `Méthode 1 — Tableau standard (recommandé)
Assigner ces 6 valeurs aux stats dans l'ordre de ton choix :
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
    id: 'rule-iles',
    title: 'Les 7 Îles d\'Aberkaer',
    content: `🏪 Île du Négoce   — docks, marchés, entrepôts. Grand pont nord + bacs.
                     Sons : cris de dockers, poisson, goudron.

🏚️ Vieille Ville   — quartier pauvre, dense, labyrinthique. Vieux pont + chemin marée basse.
                     Sons : enfants, linge aux fenêtres, pain, fumée.

💰 Île Haute        — quartier riche, jardins. Pont + bacs sélectifs.
                     Sons : silence relatif, bottes sur pavé propre.

🏰 Basse Ville      — ancienne forteresse, quartier populaire fier. Pont + chemin marée basse.
                     Sons : rires de salle de garde, bière, forge.

⛪ Île du Temple    — Culte de l'Onde Éternelle. Bac officiel.
                     Sons : chants liturgiques, encens, eau salée.

🎭 Île des Plaisirs — tavernes, théâtres. Bacs + barques privées.
                     Sons : luth, rires, cire fondue, vin renversé.

🌑 Roz Fall         — refuge des discrets. Barques uniquement, pas de pont.
                     Sons : silence, eau qui clapote, vase — et des yeux.

CHEMINS À MARÉE BASSE : passages vaseux entre certaines îles.
Connus des locaux et contrebandiers. Danger : marée montante.`,
  },
]

const defaultNotes: SessionNote[] = [
  {
    id: 'note-objectif',
    title: 'Objectif principal — mort d\'Edric Valdrek',
    content: 'Les joueurs enquêtent sur la mort suspecte de Lord Edric Valdrek, patriarche de la famille régnante.\nSuspect principal : Cael Valdrek (fils cadet), soutenu par la Guilde des Armateurs.\nAlliée potentielle : Maren Valdrek (fille aînée) — c\'est elle qui a commandé l\'enquête discrètement.',
    category: 'objectif',
  },
  {
    id: 'note-oeil',
    title: 'Intrigue parallèle — l\'Œil du Fond',
    content: 'L\'Œil du Fond agit INDÉPENDAMMENT du meurtre d\'Edric. Deux fils distincts.\nFrère Omric orchestre des rituels nécromantiques depuis les caves de l\'Île du Temple.\nObjectif : éveiller le Grand Fond au solstice → dans 12 jours.\nCael les a financés sans comprendre leur vraie ampleur.',
    category: 'hook',
  },
  {
    id: 'note-fausse-piste',
    title: '⚠️ Fausse piste centrale à maintenir',
    content: 'Les phénomènes étranges (esprits du fleuve, Golem de vase, ombres errantes) semblent être une punition divine.\nC\'est FAUX — c\'est de la nécromancie orchestrée par l\'Œil du Fond.\nNe jamais corriger les joueurs trop tôt. Laisser la révélation venir d\'eux.',
    category: 'reminder',
  },
  {
    id: 'note-contacts',
    title: 'Contacts utiles',
    content: '• Maren Valdrek (Île Haute) — commanditaire, peut ouvrir des portes officielles\n• Isla "La Nœud" (Roz Fall) — informations contre services ou argent, accès par barque\n• Grand Prêtre Sorel (Île du Temple) — ambigu, à manier avec prudence\n• Les Voix du Fleuve (Vieille Ville) — alliés populaires, désorganisés, infiltrés',
    category: 'reminder',
  },
  {
    id: 'note-hook-s1',
    title: 'Hook d\'accroche session 1',
    content: 'Une lettre cachetée du sceau des Valdrek est glissée sous la porte de chaque joueur au lever du jour.\n"Lord Edric est mort. Officellement de maladie. Je ne le crois pas. — M.V."\nLieu de rendez-vous : arrière-salle de la taverne du Maelstrom, Île des Plaisirs, ce soir.',
    category: 'hook',
  },
]

// L'horloge de la campagne en cours : le rituel de l'Œil du Fond.
const defaultClocks: CampaignClock[] = [
  { id: 'clock-solstice', label: 'Solstice', value: 12, showToPlayers: false },
]

const emptyCombat: CombatState = { round: 1, turnIndex: 0, combatants: [] }

// Le premier document de la campagne : la lettre qui lance l'enquête.
const defaultHandouts: Handout[] = [
  {
    id: 'handout-lettre-maren',
    title: 'Lettre cachetée — sceau des Valdrek',
    content: `*Lord Edric est mort. Officiellement de maladie. Je ne le crois pas.*

*Venez ce soir à l'arrière-salle de la taverne du Maelstrom, Île des Plaisirs. Venez seuls, et brûlez cette lettre.*

— M.V.`,
    imageUrl: '',
  },
]

// La chronologie des deux fils de l'intrigue — ce que les joueurs savent
// n'est pas ce qui s'est vraiment passé.
const defaultTimeline: TimelineEvent[] = [
  {
    id: 'tl-omric',
    when: 'Il y a 2 ans',
    title: 'Disparition de Frère Omric',
    playersKnow: 'Un prêtre respecté du Culte a quitté l\'Île du Temple sans explication.',
    truth: 'Omric fonde l\'Œil du Fond dans les caves de l\'Île du Temple, accessibles par un passage sous-marin à marée basse.',
    thread: 'fond',
  },
  {
    id: 'tl-livraison',
    when: 'Il y a 3 semaines',
    title: 'Livraison nocturne à l\'Île du Temple',
    playersKnow: '',
    truth: 'Cael paie Isla « La Nœud » pour son silence sur une cargaison passée par Roz Fall.',
    thread: 'valdrek',
  },
  {
    id: 'tl-edric',
    when: 'Il y a 15 jours',
    title: 'Mort de Lord Edric Valdrek',
    playersKnow: 'Mort officiellement de maladie. Maren en doute.',
    truth: 'Assassiné sur ordre de Cael, via un intermédiaire de la Guilde des Armateurs.',
    thread: 'valdrek',
  },
  {
    id: 'tl-solstice',
    when: 'J-12',
    title: 'Solstice — le rituel de l\'Éveil',
    playersKnow: '',
    truth: 'Omric compte « éveiller » le Grand Fond. Les phénomènes étranges vont s\'intensifier à mesure que la date approche.',
    thread: 'fond',
  },
]

// Deux scènes d'exemple pour l'ouverture de la session 1.
const defaultScenes: Scene[] = [
  {
    id: 'scene-lettre',
    name: 'Ouverture — la lettre',
    imageUrl: '',
    audioUrl: '',
    caption: 'Aberkaer — au lever du jour',
    overlayText: 'Une lettre cachetée du sceau des Valdrek a été glissée sous votre porte pendant la nuit.',
  },
  {
    id: 'scene-maelstrom',
    name: 'Taverne du Maelstrom',
    imageUrl: '',
    audioUrl: '',
    caption: 'Taverne du Maelstrom — Île des Plaisirs',
    overlayText: 'La salle est basse et enfumée. Au fond, une porte entrouverte donne sur l\'arrière-salle.',
  },
]

export const useGMStore = create<GMStore>()(
  persist(
    (set) => ({
      npcs: defaultNPCs,
      rules: defaultRules,
      notes: defaultNotes,
      characters: [],
      clocks: defaultClocks,
      combat: emptyCombat,
      handouts: defaultHandouts,
      mapPins: [],
      tide: 'haute',
      sessionLogs: [],
      timeline: defaultTimeline,
      scenes: defaultScenes,
      sceneIndex: -1,
      display: {
        imageUrl: '',
        caption: '',
        audioUrl: '',
        audioPlaying: false,
        audioVolume: 0.5,
        overlayText: '',
        showOverlay: false,
        clocks: [],
        lastRoll: null,
        sfx: null,
        handout: null,
        map: null,
        curtain: false,
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

      addCharacter: (c) => set((s) => ({ characters: [...s.characters, { ...c, id: uid() }] })),
      updateCharacter: (id, data) =>
        set((s) => ({
          characters: s.characters.map((c) => {
            if (c.id !== id) return c
            const merged = { ...c, ...data }
            // Les stats ont pu changer : on garde HP/Fatigue dans les bornes.
            merged.hp = clamp(merged.hp, 0, merged.stats.vitalite)
            merged.fatigue = clamp(merged.fatigue, 0, merged.stats.intelligence)
            merged.tokens = clamp(merged.tokens, 0, TOKEN_MAX)
            return merged
          }),
        })),
      deleteCharacter: (id) => set((s) => ({ characters: s.characters.filter((c) => c.id !== id) })),
      adjustCharacter: (id, field, delta) =>
        set((s) => ({
          characters: s.characters.map((c) => {
            if (c.id !== id) return c
            if (field === 'hp') return { ...c, hp: clamp(c.hp + delta, 0, c.stats.vitalite) }
            if (field === 'fatigue')
              return { ...c, fatigue: clamp(c.fatigue + delta, 0, c.stats.intelligence) }
            return { ...c, tokens: clamp(c.tokens + delta, 0, TOKEN_MAX) }
          }),
        })),

      addClock: (c) => set((s) => ({ clocks: [...s.clocks, { ...c, id: uid() }] })),
      updateClock: (id, data) =>
        set((s) => ({ clocks: s.clocks.map((c) => (c.id === id ? { ...c, ...data } : c)) })),
      deleteClock: (id) => set((s) => ({ clocks: s.clocks.filter((c) => c.id !== id) })),
      adjustClock: (id, delta) =>
        set((s) => ({
          clocks: s.clocks.map((c) => (c.id === id ? { ...c, value: Math.max(0, c.value + delta) } : c)),
        })),

      combatAdd: (c) =>
        set((s) => ({ combat: { ...s.combat, combatants: [...s.combat.combatants, { ...c, id: uid() }] } })),
      combatRemove: (id) =>
        set((s) => {
          const idx = s.combat.combatants.findIndex((c) => c.id === id)
          const combatants = s.combat.combatants.filter((c) => c.id !== id)
          // Le tour courant ne doit pas sauter quand on retire un combattant.
          let turnIndex = s.combat.turnIndex
          if (idx !== -1 && idx < turnIndex) turnIndex -= 1
          if (turnIndex >= combatants.length) turnIndex = 0
          return { combat: { ...s.combat, combatants, turnIndex } }
        }),
      combatUpdate: (id, data) =>
        set((s) => ({
          combat: {
            ...s.combat,
            combatants: s.combat.combatants.map((c) => (c.id === id ? { ...c, ...data } : c)),
          },
        })),
      combatAdjustHp: (id, delta) =>
        set((s) => {
          const target = s.combat.combatants.find((c) => c.id === id)
          if (!target) return {}
          const hp = clamp(target.hp + delta, 0, target.maxHp)
          return {
            combat: {
              ...s.combat,
              combatants: s.combat.combatants.map((c) => (c.id === id ? { ...c, hp } : c)),
            },
            // Un PJ blessé en combat l'est aussi sur sa fiche.
            characters: target.characterId
              ? s.characters.map((ch) =>
                  ch.id === target.characterId ? { ...ch, hp: clamp(hp, 0, ch.stats.vitalite) } : ch
                )
              : s.characters,
          }
        }),
      combatMove: (id, dir) =>
        set((s) => {
          const list = [...s.combat.combatants]
          const i = list.findIndex((c) => c.id === id)
          const j = i + dir
          if (i < 0 || j < 0 || j >= list.length) return {}
          ;[list[i], list[j]] = [list[j], list[i]]
          return { combat: { ...s.combat, combatants: list } }
        }),
      combatNextTurn: () =>
        set((s) => {
          const n = s.combat.combatants.length
          if (n === 0) return {}
          const next = s.combat.turnIndex + 1
          return {
            combat: {
              ...s.combat,
              turnIndex: next % n,
              round: next >= n ? s.combat.round + 1 : s.combat.round,
            },
          }
        }),
      combatEnd: () => set(() => ({ combat: emptyCombat })),

      addHandout: (h) => set((s) => ({ handouts: [...s.handouts, { ...h, id: uid() }] })),
      updateHandout: (id, data) =>
        set((s) => ({ handouts: s.handouts.map((h) => (h.id === id ? { ...h, ...data } : h)) })),
      deleteHandout: (id) => set((s) => ({ handouts: s.handouts.filter((h) => h.id !== id) })),

      addMapPin: (p) => set((s) => ({ mapPins: [...s.mapPins, { ...p, id: uid() }] })),
      updateMapPin: (id, data) =>
        set((s) => ({ mapPins: s.mapPins.map((p) => (p.id === id ? { ...p, ...data } : p)) })),
      deleteMapPin: (id) => set((s) => ({ mapPins: s.mapPins.filter((p) => p.id !== id) })),
      setTide: (tide) => set(() => ({ tide })),

      addSessionLog: (l) => set((s) => ({ sessionLogs: [...s.sessionLogs, { ...l, id: uid() }] })),
      updateSessionLog: (id, data) =>
        set((s) => ({ sessionLogs: s.sessionLogs.map((l) => (l.id === id ? { ...l, ...data } : l)) })),
      deleteSessionLog: (id) =>
        set((s) => ({ sessionLogs: s.sessionLogs.filter((l) => l.id !== id) })),

      addTimelineEvent: (e) => set((s) => ({ timeline: [...s.timeline, { ...e, id: uid() }] })),
      updateTimelineEvent: (id, data) =>
        set((s) => ({ timeline: s.timeline.map((e) => (e.id === id ? { ...e, ...data } : e)) })),
      deleteTimelineEvent: (id) => set((s) => ({ timeline: s.timeline.filter((e) => e.id !== id) })),
      moveTimelineEvent: (id, dir) =>
        set((s) => {
          const list = [...s.timeline]
          const i = list.findIndex((e) => e.id === id)
          const j = i + dir
          if (i < 0 || j < 0 || j >= list.length) return {}
          ;[list[i], list[j]] = [list[j], list[i]]
          return { timeline: list }
        }),

      addScene: (scene) => set((s) => ({ scenes: [...s.scenes, { ...scene, id: uid() }] })),
      updateScene: (id, data) =>
        set((s) => ({ scenes: s.scenes.map((sc) => (sc.id === id ? { ...sc, ...data } : sc)) })),
      deleteScene: (id) =>
        set((s) => ({ scenes: s.scenes.filter((sc) => sc.id !== id), sceneIndex: -1 })),
      moveScene: (id, dir) =>
        set((s) => {
          const list = [...s.scenes]
          const i = list.findIndex((sc) => sc.id === id)
          const j = i + dir
          if (i < 0 || j < 0 || j >= list.length) return {}
          ;[list[i], list[j]] = [list[j], list[i]]
          return { scenes: list, sceneIndex: -1 }
        }),
      setSceneIndex: (index) => set(() => ({ sceneIndex: index })),

      updateDisplay: (data) => set((s) => ({ display: { ...s.display, ...data } })),
    }),
    {
      name: 'aberkaer-gm',
      storage: campaignStorage,
      // Only persist campaign data, not the ephemeral display state
      partialize: (state) => ({
        npcs: state.npcs,
        rules: state.rules,
        notes: state.notes,
        characters: state.characters,
        clocks: state.clocks,
        combat: state.combat,
        handouts: state.handouts,
        mapPins: state.mapPins,
        tide: state.tide,
        sessionLogs: state.sessionLogs,
        timeline: state.timeline,
        scenes: state.scenes,
      }),
    }
  )
)
