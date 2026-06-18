#!/bin/bash
set -euo pipefail

# Start from repository root
ROOT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo
echo "Fetching local subnet canister ranges..."
# canister-history's sync walks this range to discover canisters; cycles-monitor
# then calls canister_metrics per id. Read the Application range from pocket-ic's
# topology API (image-mode networks don't write topology.json on the host).
read -r START_PRINCIPAL END_PRINCIPAL < <(cd src/scripts && bun run ./src/local-subnet-ranges.ts)

if [ -z "$START_PRINCIPAL" ] || [ -z "$END_PRINCIPAL" ]; then
  echo "Failed to read an Application subnet range from the topology API."
  exit 1
fi

echo "Updating canister history with range: $START_PRINCIPAL to $END_PRINCIPAL"

icp canister call canister-history update_subnet_canister_ranges "(
  record {
    canister_ranges = vec {
      record {
        principal \"$START_PRINCIPAL\";
        principal \"$END_PRINCIPAL\";
      };
    };
  }
)" -e local

echo "Local subnet canister ranges updated."
