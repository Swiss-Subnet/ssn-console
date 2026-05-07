#!/bin/bash
set -euo pipefail

# Start from repository root
ROOT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

CANISTER_HISTORY_ID=$(dfx canister id canister-history --network local)
CYCLES_MONITOR_ID=$(dfx canister id cycles-monitor --network local)
BACKEND_CANISTER_ID=$(dfx canister id backend --network local)

if [ ! -f .env.local ]; then
  echo
  echo "💢 .env.local file not found; PUBLIC_KEY is required to install the cycles-monitor and backend canisters. Aborting."
  exit 1
fi

echo
echo "♻️ Loading env vars..."

set -a
source .env.local
set +a

echo "✅ Env vars loaded!"

if [ -z "${PUBLIC_KEY:-}" ]; then
  echo
  echo "💢 PUBLIC_KEY not set in .env.local; required to install the cycles-monitor and backend canisters. Aborting."
  exit 1
fi

echo
echo "⚙️ Updating canister-history canister env var (BACKEND_ID)..."

dfx canister call aaaaa-aa update_settings "(
  record {
    canister_id = principal \"$CANISTER_HISTORY_ID\";
    settings = record {
      environment_variables = opt vec {
        record {
          name = \"BACKEND_ID\";
          value = \"$BACKEND_CANISTER_ID\";
        };
      };
    };
  }
)" --network local

echo "✅ canister-history canister env var updated!"

echo
echo "⚙️ Updating cycles-monitor canister env vars (CANISTER_HISTORY_ID, PUBLIC_KEY)..."

dfx canister call aaaaa-aa update_settings "(
  record {
    canister_id = principal \"$CYCLES_MONITOR_ID\";
    settings = record {
      environment_variables = opt vec {
        record {
          name = \"CANISTER_HISTORY_ID\";
          value = \"$CANISTER_HISTORY_ID\";
        };
        record {
          name = \"PUBLIC_KEY\";
          value = \"$PUBLIC_KEY\";
        };
      };
    };
  }
)" --network local

echo "✅ cycles-monitor canister env vars updated!"

echo
echo "⚙️ Updating backend canister env vars (PUBLIC_KEY, OFFCHAIN_SERVICE_URL, CANISTER_HISTORY_ID)..."

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
          value = \"http://localhost:3000\";
        };
        record {
          name = \"CANISTER_HISTORY_ID\";
          value = \"$CANISTER_HISTORY_ID\";
        };
      };
    };
  }
)" --network local

echo "✅ backend canister env vars updated!"
