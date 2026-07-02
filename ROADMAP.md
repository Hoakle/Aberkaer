# Aberkaer — Roadmap vers la version ultime

Objectif : remplacer complètement le papier à la table. L'écran MJ devient le poste de pilotage
de la partie, l'écran joueurs devient la « scène » (TV ou tablette posée sur la table),
et toutes les données de campagne vivent dans le dépôt, versionnées et sauvegardées.

> **Ce fichier est la source de vérité du projet.** Il est conçu pour reprendre le travail
> sans aucun autre contexte : l'état d'avancement ci-dessous dit où on en est, chaque phase
> décrit *quoi* faire et *pourquoi*, et le tableau des bugs documente l'état initial du code.
> Quand une tâche est terminée : cocher sa case et mettre à jour ce tableau.

## État d'avancement

| Phase | Contenu | Statut |
|-------|---------|--------|
| 0 | Assainir les fondations (bugs B1, B3–B8, backups, serveur preview, README, tests) | ✅ Terminée |
| 1 | Multi-écrans : WebSocket, QR code, transitions | ⬜ À faire |
| 2 | Outils de jeu : fiches PJ, dés, magie/Fatigue, tracker combat, horloges | ⬜ À faire |
| 3 | Immersion : médias locaux, soundboard, handouts, carte des 7 îles, Markdown | ⬜ À faire |
| 4 | Campagne : multi-campagnes, journal, recherche, liens croisés, générateurs | ⬜ À faire |
| 5 | Confort : raccourcis, mode panique, file de scènes, PWA | ⬜ À faire |

Note : B2 (sync mono-navigateur) est listé dans les bugs mais se corrige en phase 1
(WebSocket), pas en phase 0.

---

## État des lieux

**Ce qui marche bien aujourd'hui :**
- Écran MJ à 4 onglets : contrôle d'affichage, PNJ (avec secrets), règles, notes de session.
- Écran joueurs plein écran : image, légende, texte narratif, ambiance sonore.
- Synchronisation MJ → joueurs par `BroadcastChannel` (onglets du même navigateur).
- Persistance hybride : fichier `campaign-data.json` via le serveur de dev, repli sur `localStorage`.
- Données de campagne déjà riches (PNJ de l'intrigue Valdrek, système d20/Vérités/Jetons de Destin).

**Bugs et fragilités identifiés (à corriger en priorité) :**

| # | Problème | Détail |
|---|----------|--------|
| B1 | L'écran joueurs ne rattrape pas l'état courant | À l'ouverture (ou après un F5), la vue joueurs part de l'état par défaut. Le protocole `PING`/`PONG` est déclaré dans les types mais jamais implémenté côté MJ : rien ne renvoie l'état complet à un écran qui vient de se connecter. |
| B2 | Sync limitée à un seul navigateur | `BroadcastChannel` ne traverse ni les appareils ni les navigateurs. Impossible d'utiliser une TV/tablette séparée, ce qui est pourtant l'usage cible à une table. |
| B3 | Écriture disque à chaque frappe | `push()` est appelé sur chaque `onChange` (champ URL, texte d'ambiance…) → un POST `/api/campaign` + une écriture de fichier par caractère tapé. Il faut un debounce. |
| B4 | `/api/campaign` n'existe qu'en dev | Le middleware est déclaré dans `configureServer` : en build/preview, la persistance fichier disparaît silencieusement (repli localStorage sans prévenir). |
| B5 | Indicateur « connecté » mensonger | Le point vert passe au vert au premier message reçu et ne repasse jamais au gris (pas de heartbeat, pas de timeout). |
| B6 | Audio bloqué par l'autoplay | `audio.play().catch(() => {})` avale l'erreur : si le navigateur bloque l'autoplay (aucune interaction utilisateur sur l'onglet joueurs), la musique ne démarre jamais et personne ne le sait. Il faut un bouton « activer le son » côté joueurs. |
| B7 | « Markdown basique supporté » — mais non rendu | Le libellé du panneau Règles promet du Markdown ; le contenu n'est jamais rendu, il n'existe d'ailleurs aucune vue lecture des règles ni des PNJ (cliquer = formulaire d'édition). En jeu, on veut *lire*, pas éditer. |
| B8 | Aucune validation / gestion d'erreur | PNJ sans nom acceptés, URLs d'image cassées sans fallback, `removeItem` du storage n'efface pas le fichier serveur. |
| B9 | Pas de sauvegarde de secours | Un seul `campaign-data.json`, écrasé à chaque écriture. Une mauvaise manip = campagne perdue. Aucun export/import. |
| B10 | Contenus presets externes | Images Unsplash et MP3 SoundHelix : sans internet le soir de la partie, plus d'ambiance. Tout doit pouvoir être local. |

> **Mise à jour (phase 0)** : B1 et B3–B9 sont corrigés. Restent **B2** (→ phase 1, WebSocket)
> et **B10** (→ phase 3, bibliothèque de médias locale).

---

## Phase 0 — Assainir les fondations *(petit effort, gros gain)*

La base sur laquelle tout le reste s'appuie. Aucune nouvelle fonctionnalité visible, mais l'outil devient fiable.

- [x] **Corriger B1, B3–B8** (détail ci-dessus). Réalisé :
  - Handshake : l'écran joueurs envoie `SYNC_REQUEST` à l'ouverture, l'écran MJ répond avec l'état d'affichage complet (`GMView.tsx`).
  - Debounce 500 ms des écritures vers `/api/campaign` + flush `sendBeacon` à la fermeture de l'onglet (`fileStorage.ts`).
  - Heartbeat MJ → joueurs toutes les 5 s ; le point de connexion repasse au gris après 15 s de silence.
  - Écran joueurs : bouton « 🔊 Toucher pour activer le son » quand l'autoplay est bloqué.
  - Vues lecture pour Règles et PNJ (édition sur demande), nom de PNJ requis, fallback sur images cassées.
- [x] **Sauvegardes automatiques** : snapshot horodaté dans `backups/` avant écrasement (au plus un toutes les 10 min, rotation à 20). Boutons Exporter/Importer JSON dans l'en-tête MJ (`CampaignMenu.tsx`).
- [x] **Serveur en mode production** : le middleware `/api/campaign` est branché sur `configureServer` ET `configurePreviewServer` → `npm start` (build + preview) persiste comme en dev. `start.sh --prod` ajouté. (L'extraction en serveur autonome se fera en phase 1 avec le hub WebSocket.)
- [x] **Hygiène projet** : `README.md` réécrit pour la table de jeu ; 5 tests de fumée Playwright (`npm test`) : onglets et données par défaut, vue lecture, création de PNJ + persistance, sync MJ→joueurs, handshake d'un écran ouvert en retard. Le fichier de données est isolable via `ABERKAER_DATA_FILE` (utilisé par les tests). Si les navigateurs Playwright ne sont pas téléchargés : `CHROMIUM_PATH=/chemin/vers/chromium npm test`.

## Phase 1 — La table multi-écrans *(la fonctionnalité qui change tout)*

- [ ] **Remplacer BroadcastChannel par WebSocket** (le serveur local de la phase 0 fait hub) : l'écran joueurs devient une simple URL ouverte depuis **n'importe quel appareil du réseau local** — TV du salon, tablette au centre de la table, téléphones des joueurs.
  - Le MJ garde son portable, la TV affiche `http://<ip-du-mj>:5173/player`.
  - Reconnexion automatique + rattrapage d'état (généralise le fix B1).
  - Conserver BroadcastChannel en repli si le serveur ne tourne pas.
- [ ] **QR code dans l'écran MJ** pour que les joueurs ouvrent la vue en scannant.
- [ ] **Transitions de scène** : fondu au noir entre deux images, plutôt qu'un changement sec.

## Phase 2 — Les outils de jeu qui remplacent le papier

C'est ici que l'app cesse d'être un « afficheur » et devient l'outil de jeu. Tout est taillé pour **ton système** (d20 + 6 stats, Vérités, Jetons de Destin, Fatigue).

- [ ] **Fiches de personnage (PJ)** : nouvelle entité `Character` — 6 stats avec modificateurs auto-calculés, HP = Vitalité, Fatigue max = Intelligence, les 3 Vérités, compteur de Jetons de Destin (max 5). Vue MJ compacte : toute l'équipe d'un coup d'œil, ±HP, ±Fatigue, ±Jetons en un clic.
- [ ] **Lanceur de dés intégré** :
  - d20 + mod de stat, case « Vérité applicable (+2) », affichage Succès/Échec vs DC choisie (10/13/16/19).
  - Nat 20 / Nat 1 mis en scène (les critiques ignorent tout, comme dans tes règles).
  - Option « montrer le jet aux joueurs » : le résultat s'anime sur l'écran joueurs.
  - Mode **duel** : deux jets opposés côte à côte.
- [ ] **Assistant magie** : choix de l'ambition (Petite→Extrême = DC), jet Int, application automatique du coût en Fatigue (1/2/3 selon résultat) sur la fiche du PJ, alerte quand la Fatigue max est atteinte (« effondrement »).
- [ ] **Tracker de scène/combat** : liste ordonnée PJ + PNJ engagés, tour courant, HP visibles, notes rapides. Les stats des PNJ existants (déjà au bon format) s'importent en un clic.
- [ ] **Horloges de campagne** : compteurs visibles côté MJ (et optionnellement joueurs) — ex. « Solstice : J-12 » pour le rituel de l'Œil du Fond. Décrément manuel en fin de session.

## Phase 3 — Immersion : médias et documents

- [ ] **Bibliothèque de médias locale** : upload d'images et de fichiers audio depuis l'écran MJ, stockés dans `media/` et servis par le serveur local. Grille de vignettes avec tags (lieu, PNJ, ambiance). Fini les URLs à coller et la dépendance à internet (règle B10).
- [ ] **Soundboard** : deux couches audio — ambiance en boucle (existant) + effets one-shot (coup de tonnerre, cloche, porte qui grince) avec fondu enchaîné entre deux ambiances.
- [ ] **Documents joueurs (handouts)** : lettres, cartes au trésor, notes trouvées — rédigés en Markdown ou images, poussés sur l'écran joueurs avec un rendu « parchemin ». La lettre de Maren Valdrek de la session 1 en sera le premier cas d'usage.
- [ ] **Carte interactive d'Aberkaer** : les 7 îles en SVG/image avec pins (lieux, PNJ, rumeurs) côté MJ ; version « ce que les joueurs savent » poussable sur l'écran joueurs. Bonus : indicateur de marée (les chemins de marée basse font partie du jeu).
- [ ] **Rendu Markdown partout** (règles, notes, descriptions, handouts) — tenir enfin la promesse du libellé.

## Phase 4 — Gestion de campagne longue durée

- [ ] **Multi-campagnes** : sélecteur au démarrage, un dossier de données par campagne. Archivage d'une campagne terminée.
- [ ] **Journal de sessions** : une entrée par session (date, résumé, événements marquants, XP/récompenses), pré-remplie avec ce qui a été affiché/joué pendant la session.
- [ ] **Recherche globale** (`Ctrl+K`) : chercher « Omric » et retrouver instantanément le PNJ, les notes et les règles qui le mentionnent.
- [ ] **Liens croisés et graphe de relations** : syntaxe `[[Maren Valdrek]]` dans les notes → lien cliquable ; vue graphe des PNJ/factions (Valdrek, Guilde des Armateurs, Culte, Œil du Fond, Fil Gris…).
- [ ] **Générateurs aléatoires** : noms (consonance locale), rumeurs de taverne, météo du fleuve, rencontres par île.
- [ ] **Timeline de l'intrigue** : les deux fils (meurtre d'Edric / rituel du solstice) sur une frise, avec ce que les joueurs savent vs la vérité.

## Phase 5 — Confort et finitions

- [ ] **Raccourcis clavier MJ** : `1–7` = pousser l'ambiance d'une île, `Espace` = play/pause, `B` = écran noir immédiat (le « oh non, ils ne devaient pas voir ça »).
- [ ] **Mode panique / rideau** : un bouton qui coupe image + son et affiche le logo Aberkaer.
- [ ] **File d'attente de scènes** : préparer avant la session la liste ordonnée image+son+texte, puis avancer avec `→` pendant la partie.
- [ ] **PWA / plein écran kiosque** pour la tablette-joueurs.
- [ ] **Accessibilité et petits écrans** : l'écran MJ utilisable sur un portable 13".

---

## Ordre recommandé et logique

```
Phase 0 (fiabilité)  →  Phase 1 (multi-écrans)  →  Phase 2 (outils de jeu)
                                                          ↓
        Phase 5 (confort)  ←  Phase 4 (campagne)  ←  Phase 3 (immersion)
```

- **Phases 0+1 d'abord** : tant que la sync est mono-navigateur et la persistance fragile,
  tout le reste est construit sur du sable. Ce sont aussi les plus petites.
- **Phase 2 ensuite** : c'est elle qui tient la promesse « remplacer le papier » —
  fiches, dés, Fatigue et Jetons de Destin sont ce qu'on manipule à chaque minute de jeu.
- **Phases 3–5** : chaque brique est indépendante et livrable séparément ;
  on peut piocher selon l'envie du moment (la bibliothèque de médias locale est
  probablement le meilleur rapport plaisir/effort de la phase 3).

## Choix techniques (inchangés, volontairement)

- **Stack conservée** : React 19 + Vite + Tailwind 4 + Zustand — adaptée, moderne, rien à migrer.
- **Pas de base de données** : des fichiers JSON par campagne, lisibles, versionnables avec git, sauvegardables par simple copie. À l'échelle d'une table de jeu, c'est un atout, pas une limite.
- **Un seul ajout d'infrastructure** : le petit serveur local (phase 0/1) qui sert le build,
  persiste les fichiers et fait hub WebSocket. Tout le reste est du front.
- **100 % hors-ligne** une fois la phase 3 faite : aucune dépendance à internet le soir de la partie.
