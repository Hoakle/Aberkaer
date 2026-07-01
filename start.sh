#!/usr/bin/env bash
set -e

REPO="https://github.com/Hoakle/Aberkaer.git"
BRANCH="claude/rpg-companion-app-5j4r3a"
DIR="Aberkaer"

# ── 1. Cloner ou mettre à jour le repo ──────────────────────────────────────
if [ -d "$DIR/.git" ]; then
  echo "→ Repo déjà présent, mise à jour..."
  git -C "$DIR" fetch origin
  git -C "$DIR" checkout "$BRANCH"
  git -C "$DIR" pull origin "$BRANCH"
else
  echo "→ Clonage du repo..."
  git clone --branch "$BRANCH" "$REPO" "$DIR"
fi

cd "$DIR"

# ── 2. Vérifier Node.js / npm ────────────────────────────────────────────────
if ! command -v node &>/dev/null; then
  echo ""
  echo "Node.js n'est pas installé. Installation via nvm..."
  curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
  export NVM_DIR="$HOME/.nvm"
  # shellcheck source=/dev/null
  [ -s "$NVM_DIR/nvm.sh" ] && source "$NVM_DIR/nvm.sh"
  nvm install 20
  nvm use 20
else
  NODE_VER=$(node -v | cut -d. -f1 | tr -d 'v')
  if [ "$NODE_VER" -lt 18 ]; then
    echo "⚠️  Node.js $( node -v ) détecté — version 18+ requise."
    echo "   Lance : nvm install 20 && nvm use 20"
    exit 1
  fi
  echo "→ Node.js $(node -v) ✓"
fi

# ── 3. Installer les dépendances ─────────────────────────────────────────────
echo "→ Installation des dépendances..."
npm install --silent

# ── 4. Ouvrir les onglets navigateur ─────────────────────────────────────────
open_browser() {
  if [[ "$OSTYPE" == "darwin"* ]]; then
    open "$1"
  elif command -v xdg-open &>/dev/null; then
    xdg-open "$1" &>/dev/null &
  elif command -v start &>/dev/null; then
    start "$1"
  fi
}

echo ""
echo "✓ Tout est prêt. Ouverture des onglets dans 3 secondes..."
sleep 3
open_browser "http://localhost:5173/gm"
sleep 1
open_browser "http://localhost:5173/player"

# ── 5. Lancer le serveur ─────────────────────────────────────────────────────
echo ""
echo "  Vue MJ      → http://localhost:5173/gm"
echo "  Vue joueurs → http://localhost:5173/player"
echo ""
npm run dev
