#!/bin/bash
set -euo pipefail

# Set the dynamic canister env vars (secret + cross-canister ids) between create
# and install. --add-environment-variable merges onto the static vars from icp.yaml.
# Run from init-local.sh once canisters exist (so their ids are known).

ROOT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [ ! -f .env.local ]; then
  echo "set-canister-env: .env.local not found (cp .env.local.example .env.local). Aborting." >&2
  exit 1
fi

set -a
source .env.local
set +a

: "${PUBLIC_KEY:?set-canister-env: PUBLIC_KEY not set in .env.local}"

BACKEND_ID="$(icp canister status backend -e local --id-only)"
CANISTER_HISTORY_ID="$(icp canister status canister-history -e local --id-only)"

set_env() {
  icp canister settings update "$1" -e local "${@:2}"
}

set_env backend \
  --add-environment-variable "PUBLIC_KEY=$PUBLIC_KEY" \
  --add-environment-variable "CANISTER_HISTORY_ID=$CANISTER_HISTORY_ID"

set_env canister-history \
  --add-environment-variable "BACKEND_ID=$BACKEND_ID"

set_env cycles-monitor \
  --add-environment-variable "PUBLIC_KEY=$PUBLIC_KEY" \
  --add-environment-variable "CANISTER_HISTORY_ID=$CANISTER_HISTORY_ID"
