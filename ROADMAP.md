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
| 1 | Multi-écrans : sync serveur (SSE), QR code, transitions | ✅ Terminée |
| 2 | Outils de jeu : fiches PJ, dés, magie/Fatigue, tracker combat, horloges | ✅ Terminée |
| 3 | Immersion : médias locaux, soundboard, handouts, carte des 7 îles, Markdown | ✅ Terminée |
| 4 | Campagne : multi-campagnes, journal, recherche, liens croisés, générateurs | ✅ Terminée |
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

> **Mise à jour (phases 0, 1 et 3)** : les 10 bugs B1–B10 sont corrigés.

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

- [x] **Sync par le serveur local** — réalisé en **SSE** plutôt que WebSocket : le flux est
  unidirectionnel (MJ pousse via `POST /api/display`, les écrans écoutent `/api/events`),
  `EventSource` gère la reconnexion automatiquement, zéro dépendance, pas de conflit avec
  le WebSocket HMR de Vite. L'état de la scène vit en mémoire serveur :
  - N'importe quel appareil du réseau local ouvre `http://<ip-du-mj>:5173/player`
    (`host: true` en dev et preview).
  - Un écran ouvert en retard reçoit l'état complet à la connexion ; heartbeat serveur 5 s.
  - Un écran MJ rechargé adopte l'état en cours (`GET /api/display`).
  - BroadcastChannel conservé en repli si le serveur ne tourne pas (`useTableSync.ts`).
- [x] **QR code dans l'écran MJ** (`PlayerAccess.tsx`) : `/api/info` expose l'IP locale,
  le panneau « Écran joueurs » affiche l'URL et le QR à scanner (lib `qrcode`).
- [x] **Transitions de scène** : fondu au noir 500 ms entre deux images, et vers l'écran
  vide (`FadeImage` dans `PlayerView.tsx`).
- 3 tests Playwright multi-appareils (contexts navigateur isolés) couvrent la voie serveur.

## Phase 2 — Les outils de jeu qui remplacent le papier

C'est ici que l'app cesse d'être un « afficheur » et devient l'outil de jeu. Tout est taillé pour **ton système** (d20 + 6 stats, Vérités, Jetons de Destin, Fatigue). Les règles chiffrées vivent dans `src/game/rules.ts`.

- [x] **Fiches de personnage (PJ)** (`PartyPanel.tsx`) : entité `Character` — 6 stats avec modificateurs auto-calculés, HP = Vitalité, Fatigue max = Intelligence, les 3 Vérités, compteur de Jetons de Destin (départ 3, max 5). Cartes compactes : toute l'équipe d'un coup d'œil, ±HP, ±Fatigue, ±Jetons en un clic, alerte effondrement.
- [x] **Lanceur de dés intégré** (`DicePanel.tsx`) :
  - d20 + mod de stat (ou mod manuel sans PJ), case « Vérité applicable (+2) », Succès/Échec vs DC (10/13/16/19 ou jet libre).
  - Nat 20 / Nat 1 : critiques qui ignorent modificateurs et DC.
  - Dépense de Jetons de Destin après le jet : relance ou +5, décomptés de la fiche.
  - Option « montrer les jets aux joueurs » : animation du résultat sur l'écran joueurs.
  - Mode **duel** : deux jets opposés côte à côte, égalité = impasse.
- [x] **Assistant magie** : ambition (Petite→Extrême = DC), jet Int, coût en Fatigue automatique (succès 1 / échec 2 / échec critique 3 + complication) appliqué à la fiche, alerte « 💥 Effondrement » à la Fatigue max.
- [x] **Tracker de scène/combat** (`CombatPanel.tsx`) : liste ordonnée (réordonnable), tour courant, rounds, ±HP, notes rapides. Import PJ en un clic (HP reflétés sur la fiche dans les deux sens) et PNJ (HP extraits de leurs stats texte).
- [x] **Horloges de campagne** (`ClocksPanel.tsx`) : compteurs « J-N » avec ±, visibilité par horloge sur l'écran joueurs (poussée en direct), horloge Solstice par défaut.
- 5 tests Playwright (dés déterministes via Math.random stub, Fatigue, horloges côté joueurs, combat).

## Phase 3 — Immersion : médias et documents

- [x] **Bibliothèque de médias locale** (`MediaPanel.tsx` + API `/api/media`) : upload d'images et de sons depuis l'onglet 🎨, stockés dans `media/` (gitignoré, surchargeable via `ABERKAER_MEDIA_DIR`) et servis par le serveur local sous `/media/…`. Grille de vignettes avec filtre, actions directes « Afficher / Ambiance / Effet ». Corrige B10 : plus aucune dépendance à internet. (Les tags sont remis à plus tard — le filtre par nom suffit pour l'instant.)
- [x] **Soundboard** (`useAudioLayers.ts`) : deux couches audio — ambiance en boucle avec **fondu enchaîné 1,2 s** entre deux pistes, + effets one-shot par-dessus (`display.sfx`, un nouvel id = une lecture). Gestion de l'autoplay bloqué conservée.
- [x] **Documents joueurs (handouts)** (`HandoutsPanel.tsx`) : rédigés en Markdown (+ image optionnelle), aperçu parchemin côté MJ, « Montrer aux joueurs » = overlay parchemin sur l'écran joueurs. La lettre de Maren Valdrek est le document par défaut.
- [x] **Carte interactive d'Aberkaer** (`AberkaerMap.tsx` + `MapPanel.tsx`) : les 7 îles en SVG (ponts, chemins de marée basse en pointillés), repères ajoutés au clic (label, note MJ, visibilité), toggle marée haute/basse, version joueurs (repères visibles uniquement) poussée en direct.
- [x] **Rendu Markdown** (`Markdown.tsx`, lib `marked`) : notes et documents. Choix assumé : les règles restent en texte préformaté — leurs tableaux alignés (DC, scores) seraient cassés par Markdown.
- 5 tests Playwright (API médias, push d'image, parchemin, carte/marée/repère, markdown).

## Phase 4 — Gestion de campagne longue durée

- [x] **Multi-campagnes** : sélecteur dans l'en-tête MJ, un fichier JSON par campagne (`campaigns/<id>.json`, la campagne historique reste `campaign-data.json`), backups horodatés par campagne, archivage dans `campaigns/archive/` (rien n'est supprimé). Le serveur diffuse `CAMPAIGN_CHANGED` : les écrans joueurs rechargent d'eux-mêmes. Au passage : le repli localStorage ne peut plus injecter les données d'une autre campagne.
- [x] **Journal de sessions** (onglet 📔 Campagne) : date, titre, compte rendu Markdown pré-rempli d'un gabarit (Résumé / Moments forts / À suivre), tri antichronologique. (Le pré-remplissage automatique avec ce qui a été joué demanderait un historique de session — remis à plus tard.)
- [x] **Recherche globale** (`Ctrl+K`, `SearchPalette.tsx`) : couvre PNJ, PJ, règles, notes, documents, journal, timeline, horloges et repères de carte, avec extrait contextuel (les secrets d'Omric se lisent directement dans la palette) et navigation vers l'onglet.
- [x] **Liens croisés et graphe de relations** : `[[Nom]]` dans notes/documents/journal → lien cliquable qui ouvre la recherche sur ce nom. Vue « 🕸 Relations » dans l'onglet PNJ : graphe circulaire dont les arêtes sont déduites des mentions croisées dans rôles/descriptions/secrets, clic = fiche.
- [x] **Générateurs aléatoires** (`generators.ts`) : noms à consonance locale, rumeurs de taverne, météo du fleuve, rencontres par île (3 par île, les 7 îles couvertes).
- [x] **Timeline de l'intrigue** : frise à deux fils (meurtre d'Edric / Œil du Fond) avec pour chaque événement « ce que les joueurs savent » vs « la vérité (MJ) », réordonnable, pré-remplie avec les 4 événements clés de la campagne.
- 6 tests Playwright (isolement multi-campagnes, recherche, wikilink, journal/timeline, générateurs, graphe).

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
