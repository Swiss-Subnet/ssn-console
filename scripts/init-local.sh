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

echo
echo "🤑 Gifting cycles to all deployed canisters..."
dfx ledger fabricate-cycles --all --t 1000000000
echo "✅ Canister cycles gifted!"

./scripts/update-local-history-ranges.sh
./scripts/update-local-env.sh

echo
echo "🔔 Triggering canister-history sync..."
dfx canister call canister-history trigger_sync_canister_histories '(record {})'
echo "✅ Trigger request sent."
