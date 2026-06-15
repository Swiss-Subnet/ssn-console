#!/bin/bash
set -euo pipefail

# Start from repository root
ROOT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo
echo "Fetching local subnet canister ranges..."
# canister-history's sync walks every id in this range to pull history, so local
# dev seeds the Application subnet range from icp-cli's network topology.
TOPOLOGY=".icp/cache/networks/local/state/topology.json"
if [ ! -f "$TOPOLOGY" ]; then
  echo "$TOPOLOGY not found. Is the local network running (icp network start)?"
  exit 1
fi

read -r START_PRINCIPAL END_PRINCIPAL < <(
  jq -r '.subnet_configs[] | select(.subnet_kind == "Application") | "\(.ranges[0].start) \(.ranges[-1].end)"' "$TOPOLOGY"
)

if [ -z "$START_PRINCIPAL" ] || [ -z "$END_PRINCIPAL" ]; then
  echo "Failed to read an Application subnet range from $TOPOLOGY."
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
