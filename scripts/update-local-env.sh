#!/bin/bash
set -euo pipefail

# Start from repository root
ROOT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [ ! -f .env.local ]; then
  echo
  echo "💢 .env.local file not found; skipping PUBLIC_KEY injection"

  exit 0
fi

echo
echo "♻️ Loading env vars..."

set -a
source .env.local
set +a

echo "✅ Env vars loaded!"

if [ -z "$PUBLIC_KEY" ]; then
  echo
  echo "💢 PUBLIC_KEY not set in .env.local; nothing to inject"

  exit 0
fi

BACKEND_CANISTER_ID=$(dfx canister id backend --network local)

echo
echo "⚙️ Updating backend canister env var PUBLIC_KEY..."

dfx canister call aaaaa-aa update_settings "(
  record {
    canister_id = principal \"$BACKEND_CANISTER_ID\";
    settings = record {
      environment_variables = opt vec {
        record {
          name = \"PUBLIC_KEY\";
          value = \"$PUBLIC_KEY\";
        };
        record {
          name = \"OFFCHAIN_SERVICE_URL\";
          value = \"localhost:3000\";
        };
      };
    };
  }
)" --network local

echo "✅ PUBLIC_KEY backend canister env var updated!"
