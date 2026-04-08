#!/bin/bash
set -euo pipefail

# Start from repository root
ROOT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo
echo "🔍 Fetching local subnet canister ranges..."
RANGES=$(bun run ./src/scripts/src/fetch-local-subnet-canister-ranges.ts)

# Assuming a single range for the local subnet for simplicity
START_PRINCIPAL=$(echo "$RANGES" | awk '{print $1}')
END_PRINCIPAL=$(echo "$RANGES" | awk '{print $2}')

if [ -z "$START_PRINCIPAL" ] || [ -z "$END_PRINCIPAL" ]; then
  echo "💢 Failed to parse canister ranges."
  exit 1
fi

echo "Updating canister history with range: $START_PRINCIPAL to $END_PRINCIPAL"

dfx canister call canister-history update_subnet_canister_ranges "(
  record {
    canister_ranges = vec {
      record {
        principal \"$START_PRINCIPAL\";
        principal \"$END_PRINCIPAL\";
      };
    };
  }
)"

echo "✅ Local subnet canister ranges updated!"
