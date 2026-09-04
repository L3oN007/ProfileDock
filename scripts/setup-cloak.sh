#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "ProfileDock CloakBrowser setup (Ubuntu/Linux)"
echo ""

if ! command -v pnpm >/dev/null 2>&1; then
	echo "pnpm is required. Install Node.js + pnpm first."
	exit 1
fi

pnpm install
node scripts/setup-cloak.mjs

echo ""
echo "Ubuntu runtime libraries commonly required by Chromium:"
echo "  sudo apt-get update"
echo "  sudo apt-get install -y libnss3 libatk-bridge2.0-0 libdrm2 libxkbcommon0 libgbm1 libasound2"
