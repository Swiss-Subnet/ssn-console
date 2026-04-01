#!/bin/bash
set -euo pipefail

# Start from repository root
ROOT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo
echo "🔴 Stopping dfx..."
dfx stop
echo "✅ DFX stopped!"

echo
echo "😵 Killing leftover DFX processes..."
dfx killall
echo "✅ Leftover DFX processes killed!"

echo
echo "🟢 Starting dfx..."
dfx start --background --clean
echo "✅ DFX started!"

echo
echo "📦 Deploying canisters..."
dfx deploy
echo "✅ Canisters deployed!"

./scripts/update-local-env.sh
