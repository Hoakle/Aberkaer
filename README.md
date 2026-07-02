# Aberkaer — Compagnon de table pour JdR

Application locale qui remplace le papier à la table de jeu : un **écran MJ** (PNJ,
règles, notes, contrôle de la scène) et un **écran joueurs** (image d'ambiance,
texte narratif, musique) synchronisés en temps réel.

> Le plan complet du projet (bugs connus, phases à venir) est dans [ROADMAP.md](ROADMAP.md).

## Démarrage rapide

```bash
./start.sh          # installe et lance en mode dev
./start.sh --prod   # version optimisée (build + preview)
```

Ou à la main :

```bash
npm install
npm run dev     # http://localhost:5173
```

- **Vue MJ** → `http://localhost:5173/gm`
- **Vue joueurs** → `http://localhost:5173/player` (à ouvrir dans un second onglet,
  idéalement en plein écran sur un second moniteur)

⚠️ Limite actuelle : la synchronisation utilise `BroadcastChannel`, les deux vues
doivent donc être des onglets **du même navigateur**. Le support multi-appareils
(TV, tablette) arrive en phase 1 de la roadmap.

## Utilisation en jeu

| Onglet MJ | Rôle |
|-----------|------|
| 🖥 Écran joueurs | Pousser image, légende, texte narratif et musique vers la vue joueurs |
| 👤 PNJ | Fiches PNJ : stats, description publique, **secrets visibles du MJ seul** |
| 📖 Règles | Les règles de la maison (d20, Vérités, Jetons de Destin, magie/Fatigue…) |
| 📝 Notes | Objectifs, hooks et rappels de la session |

Astuces :
- Un PNJ avec une image apparaît en bouton dans « Écran joueurs » : un clic envoie
  son portrait et son nom aux joueurs.
- Si la musique ne démarre pas côté joueurs (blocage autoplay du navigateur),
  un bouton « Toucher pour activer le son » s'affiche sur la vue joueurs.

## Données et sauvegardes

- Tout est persisté dans **`campaign-data.json`** à la racine (avec repli
  `localStorage` si le serveur ne répond pas).
- Le serveur garde des **snapshots automatiques** dans `backups/`
  (au plus un toutes les 10 minutes, les 20 derniers sont conservés).
- Boutons **⬇ Exporter / ⬆ Importer** dans l'en-tête MJ pour sauvegarder ou
  restaurer la campagne en JSON.
- La variable d'environnement `ABERKAER_DATA_FILE` permet de pointer vers un
  autre fichier de données (utilisée par les tests).

## Développement

```bash
npm run dev       # serveur de dev avec HMR
npm run build     # typecheck (tsc) + build de production
npm start         # build + sert la version de production (port 5173)
npm run lint      # oxlint
npm test          # tests de fumée Playwright
```

Stack : React 19 · Vite · Tailwind CSS 4 · Zustand (persist) · TypeScript.

Structure :

```
src/
  views/GMView.tsx        Écran MJ (onglets + hub de synchronisation)
  views/PlayerView.tsx    Écran joueurs plein écran
  components/gm/          Panneaux MJ (affichage, PNJ, règles, notes, export/import)
  store/gmStore.ts        État global + données par défaut de la campagne
  store/fileStorage.ts    Persistance hybride fichier/localStorage (debounce)
  hooks/useBroadcast.ts   Canal MJ ↔ joueurs (BroadcastChannel)
vite.config.ts            Middleware /api/campaign (GET/POST/DELETE + backups)
```
