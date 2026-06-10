default:
    @just --list

# Render the deployable workload into dist/ (build image tars + envsubst config).
# Host placement/activation is done by ssn-infra's ansible-console-deploy.
# Usage: just render <env_file>   e.g. just render ./.env.test
render ENV_FILE:
    #!/usr/bin/env bash
    set -euo pipefail
    [ -f "{{ENV_FILE}}" ] || { echo "env file not found: {{ENV_FILE}}" >&2; exit 1; }
    set -a; source "{{ENV_FILE}}"; set +a
    source scripts/lib/utils.sh

    ROOT_DIR=$(pwd)
    CONFIG_DIR="${ROOT_DIR}/config"
    DIST="${ROOT_DIR}/dist"

    # Image tag = source revision, so unchanged code yields the same tag and the
    # deploy skips re-shipping. A dirty working tree gets a -dirty suffix and a warning.
    IMAGE_TAG=$(git rev-parse --short HEAD)
    if [ -n "$(git status --porcelain)" ]; then
      IMAGE_TAG="${IMAGE_TAG}-dirty"
      echo "WARNING: working tree has uncommitted changes; tagging images ${IMAGE_TAG}." >&2
      echo "         A -dirty build is not reproducible from a commit; commit before a real deploy." >&2
    fi
    export IMAGE_TAG

    rm -rf "${DIST}"
    mkdir -p "${DIST}"/{images,quadlets,systemd,policies}

    # Image/service identifiers referenced by the quadlet templates.
    export CADDY_IMAGE_NAMESPACE=localhost CADDY_IMAGE_NAME=caddy CADDY_SERVICE_NAME=caddy
    export OFFCHAIN_SERVICE_IMAGE_NAMESPACE=localhost OFFCHAIN_SERVICE_IMAGE_NAME=offchain-service OFFCHAIN_SERVICE_SERVICE_NAME=offchain-service
    export CANISTER_OTLP_SYNCER_IMAGE_NAMESPACE=localhost CANISTER_OTLP_SYNCER_IMAGE_NAME=canister-otlp-syncer CANISTER_OTLP_SYNCER_SERVICE_NAME=canister-otlp-syncer

    # Remote paths the rendered quadlets/Caddyfile bake in (must match ansible console-deploy vars).
    export REMOTE_CADDYFILE_PATH="/home/${REMOTE_USER}/.config/containers/volumes/caddy/Caddyfile"
    export REMOTE_CADDY_DATA_DIR="/home/${REMOTE_USER}/.config/containers/volumes/caddy/data"
    export REMOTE_CANISTER_OTLP_SYNCER_DATA_DIR="/home/${REMOTE_USER}/.config/containers/volumes/canister-otlp-syncer/data"

    # Canister IDs for the target network.
    export CANISTER_ID_BACKEND=$(jq -er ".[\"backend\"].${DFX_NETWORK}" canister_ids.json)
    export CANISTER_ID_CYCLES_MONITOR=$(jq -er ".[\"cycles-monitor\"].${DFX_NETWORK}" canister_ids.json)

    echo "Building images (tag ${IMAGE_TAG})..."
    podman build -t "localhost/caddy:${IMAGE_TAG}"                -f "${CONFIG_DIR}/caddy.containerfile" "${ROOT_DIR}"
    podman save  "localhost/caddy:${IMAGE_TAG}"                   > "${DIST}/images/caddy.tar"
    podman build -t "localhost/offchain-service:${IMAGE_TAG}"     -f "${CONFIG_DIR}/offchain-service.containerfile" "${ROOT_DIR}"
    podman save  "localhost/offchain-service:${IMAGE_TAG}"        > "${DIST}/images/offchain-service.tar"
    podman build -t "localhost/canister-otlp-syncer:${IMAGE_TAG}" -f "${CONFIG_DIR}/canister-otlp-syncer.containerfile" "${ROOT_DIR}"
    podman save  "localhost/canister-otlp-syncer:${IMAGE_TAG}"    > "${DIST}/images/canister-otlp-syncer.tar"

    echo "Rendering config..."
    for f in "${CONFIG_DIR}/quadlets"/*; do strict_envsubst "$f" "${DIST}/quadlets/$(basename "$f")"; done
    strict_envsubst "${CONFIG_DIR}/Caddyfile"    "${DIST}/Caddyfile"
    strict_envsubst "${CONFIG_DIR}/config.alloy" "${DIST}/config.alloy"
    cp "${CONFIG_DIR}/canister-otlp-syncer.timer" "${DIST}/systemd/canister-otlp-syncer.timer"
    cp "${CONFIG_DIR}"/*.cil "${DIST}/policies/"

    # Non-secret facts ansible's console-deploy needs (no secrets here).
    # The deploy keys its "already on host?" skip on per-image ref; image_tag is informational.
    {
      printf 'offchain_service_domain: "%s"\n' "${OFFCHAIN_SERVICE_DOMAIN}"
      printf 'image_tag: "%s"\n' "${IMAGE_TAG}"
      printf 'images:\n'
      printf '  - { tar: caddy.tar, ref: "localhost/caddy:%s" }\n' "${IMAGE_TAG}"
      printf '  - { tar: offchain-service.tar, ref: "localhost/offchain-service:%s" }\n' "${IMAGE_TAG}"
      printf '  - { tar: canister-otlp-syncer.tar, ref: "localhost/canister-otlp-syncer:%s" }\n' "${IMAGE_TAG}"
    } > "${DIST}/deploy-vars.yml"

    echo "Rendered -> ${DIST}"

# Format Rust + TypeScript + Go
fmt:
    cargo fmt
    bun run format
    just services::fmt

# Type-check Rust + TypeScript + Go without building
check:
    cargo check -p backend
    bun --bun tsc --build
    just services::check

# Lint GitHub Actions workflows (and embedded shell scripts via shellcheck)
lint-actions:
    actionlint

# Verify each canister's exported candid interface still matches its .did file.
# Fast feedback loop while iterating on .did files.
check-candid:
    cargo test --workspace --lib tests::check_candid_interface

# Build the backend wasm and stage it for backend-tests
build-backend:
    cargo build --target wasm32-unknown-unknown --release -p backend --locked
    mkdir -p .dfx/local/canisters/backend
    gzip -f -c target/wasm32-unknown-unknown/release/backend.wasm \
        > .dfx/local/canisters/backend/backend.wasm.gz

# Regenerate TS candid bindings from .did files
bindings:
    cd src/backend-api && bun run build

# Run backend integration tests, rebuilding the wasm first; args scope vitest (e.g. canister, -t soft-delete)
test-backend *args: build-backend
    cd src/backend-tests && bun run test {{args}}

# Re-run backend integration tests without rebuilding the wasm; same scoping args as test-backend
retest-backend *args:
    cd src/backend-tests && bun run test {{args}}

# List local users, pick one from a menu, and set it Active
activate-user:
    #!/usr/bin/env bash
    set -euo pipefail
    json=$(icp canister call backend admin_list_user_profiles '()' -e local --json)
    mapfile -t lines < <(echo "$json" | jq -r '.Ok[] | "\(.id)\t\(.email[0] // "no-email")\t\(.status | keys[0])"')
    if [ ${#lines[@]} -eq 0 ]; then echo "No user profiles found."; exit 0; fi
    echo "Select a user to activate:"
    select line in "${lines[@]}"; do [ -n "${line:-}" ] && break; done
    id=${line%%$'\t'*}
    icp canister call backend admin_update_user_profile "(record { user_id = \"$id\"; status = opt variant { Active } })" -e local

# List local users, pick one from a menu, and grant full staff permissions
grant-staff:
    #!/usr/bin/env bash
    set -euo pipefail
    json=$(icp canister call backend admin_list_user_profiles '()' -e local --json)
    mapfile -t lines < <(echo "$json" | jq -r '.Ok[] | "\(.id)\t\(.email[0] // "no-email")\t\(.status | keys[0])"')
    if [ ${#lines[@]} -eq 0 ]; then echo "No user profiles found."; exit 0; fi
    echo "Select a user to make staff:"
    select line in "${lines[@]}"; do [ -n "${line:-}" ] && break; done
    id=${line%%$'\t'*}
    icp canister call backend admin_grant_staff_permissions "(record { user_id = \"$id\"; permissions = record { read_all_orgs = true; write_billing = true; manage_users = true; read_metrics = true } })" -e local

# Go microservices live under services/; see `just services::` for recipes
mod services
