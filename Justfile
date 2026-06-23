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

    # The host is x86_64; build for it explicitly so a render on an arm64 dev
    # machine (Apple Silicon) still produces images that run on the VPS. Go
    # cross-compiles cleanly under CGO_ENABLED=0.
    TARGET_PLATFORM="${TARGET_PLATFORM:-linux/amd64}"
    TARGET_ARCH="${TARGET_PLATFORM##*/}"

    # Image tag = source revision + arch, so unchanged code yields the same tag
    # and the deploy skips re-shipping. The arch suffix means an image built for
    # a different arch is a DIFFERENT ref, so the deploy's "ref exists -> skip"
    # can never leave a wrong-arch image in place. A dirty tree adds -dirty.
    IMAGE_TAG=$(git rev-parse --short HEAD)
    if [ -n "$(git status --porcelain)" ]; then
      IMAGE_TAG="${IMAGE_TAG}-dirty"
      echo "WARNING: working tree has uncommitted changes; tagging images ${IMAGE_TAG}-${TARGET_ARCH}." >&2
      echo "         A -dirty build is not reproducible from a commit; commit before a real deploy." >&2
    fi
    IMAGE_TAG="${IMAGE_TAG}-${TARGET_ARCH}"
    export IMAGE_TAG

    rm -rf "${DIST}"
    mkdir -p "${DIST}"/{images,quadlets,systemd,policies}

    # Image/service identifiers referenced by the quadlet templates.
    export CADDY_IMAGE_NAMESPACE=localhost CADDY_IMAGE_NAME=caddy CADDY_SERVICE_NAME=caddy
    export AUTH_SERVICE_IMAGE_NAMESPACE=localhost AUTH_SERVICE_IMAGE_NAME=auth-service AUTH_SERVICE_SERVICE_NAME=auth-service
    export CANISTER_OTLP_SYNCER_IMAGE_NAMESPACE=localhost CANISTER_OTLP_SYNCER_IMAGE_NAME=canister-otlp-syncer CANISTER_OTLP_SYNCER_SERVICE_NAME=canister-otlp-syncer
    export METRICS_PROXY_IMAGE_NAMESPACE=localhost METRICS_PROXY_IMAGE_NAME=metrics-proxy METRICS_PROXY_SERVICE_NAME=metrics-proxy
    export PAYMENTS_SERVICE_IMAGE_NAMESPACE=localhost PAYMENTS_SERVICE_IMAGE_NAME=payments-service PAYMENTS_SERVICE_SERVICE_NAME=payments-service

    # metrics-proxy expects GRAFANA_URL/USERNAME/PASSWORD; map them from the
    # env file's hosted-metrics names (the .env files are not touched here).
    # The proxy queries, so its password is the read-only token, not the
    # remote-write key Alloy uses to push.
    export GRAFANA_URL="${GRAFANA_HOSTED_METRICS_URL}"
    export GRAFANA_USERNAME="${GRAFANA_HOSTED_METRICS_ID}"
    export GRAFANA_PASSWORD="${GRAFANA_RO_API_KEY}"

    # Remote paths the rendered quadlets/Caddyfile bake in (must match ansible console-deploy vars).
    export REMOTE_CADDYFILE_PATH="/home/${REMOTE_USER}/.config/containers/volumes/caddy/Caddyfile"
    export REMOTE_CADDY_DATA_DIR="/home/${REMOTE_USER}/.config/containers/volumes/caddy/data"
    export REMOTE_CANISTER_OTLP_SYNCER_DATA_DIR="/home/${REMOTE_USER}/.config/containers/volumes/canister-otlp-syncer/data"

    # Canister IDs for the target network.
    export CANISTER_ID_BACKEND=$(jq -er ".[\"backend\"].${DFX_NETWORK}" canister_ids.json)
    export CANISTER_ID_CYCLES_MONITOR=$(jq -er ".[\"cycles-monitor\"].${DFX_NETWORK}" canister_ids.json)

    echo "Building images (tag ${IMAGE_TAG}, platform ${TARGET_PLATFORM})..."
    podman build --platform "${TARGET_PLATFORM}" -t "localhost/caddy:${IMAGE_TAG}"                -f "${CONFIG_DIR}/caddy.containerfile" "${ROOT_DIR}"
    podman save  "localhost/caddy:${IMAGE_TAG}"                   > "${DIST}/images/caddy.tar"
    podman build --platform "${TARGET_PLATFORM}" -t "localhost/auth-service:${IMAGE_TAG}"         -f "${CONFIG_DIR}/auth-service.containerfile" "${ROOT_DIR}/services"
    podman save  "localhost/auth-service:${IMAGE_TAG}"            > "${DIST}/images/auth-service.tar"
    podman build --platform "${TARGET_PLATFORM}" -t "localhost/canister-otlp-syncer:${IMAGE_TAG}" -f "${CONFIG_DIR}/canister-otlp-syncer.containerfile" "${ROOT_DIR}/services"
    podman save  "localhost/canister-otlp-syncer:${IMAGE_TAG}"    > "${DIST}/images/canister-otlp-syncer.tar"
    podman build --platform "${TARGET_PLATFORM}" -t "localhost/metrics-proxy:${IMAGE_TAG}"        -f "${CONFIG_DIR}/metrics-proxy.containerfile" "${ROOT_DIR}/services"
    podman save  "localhost/metrics-proxy:${IMAGE_TAG}"           > "${DIST}/images/metrics-proxy.tar"
    podman build --platform "${TARGET_PLATFORM}" -t "localhost/payments-service:${IMAGE_TAG}"     -f "${CONFIG_DIR}/payments-service.containerfile" "${ROOT_DIR}/services"
    podman save  "localhost/payments-service:${IMAGE_TAG}"        > "${DIST}/images/payments-service.tar"

    echo "Rendering config..."
    for f in "${CONFIG_DIR}/quadlets"/*; do strict_envsubst "$f" "${DIST}/quadlets/$(basename "$f")"; done
    strict_envsubst "${CONFIG_DIR}/Caddyfile"    "${DIST}/Caddyfile"
    strict_envsubst "${CONFIG_DIR}/config.alloy" "${DIST}/config.alloy"
    cp "${CONFIG_DIR}/canister-otlp-syncer.timer" "${DIST}/systemd/canister-otlp-syncer.timer"
    cp "${CONFIG_DIR}"/*.cil "${DIST}/policies/"

    # Non-secret facts ansible's console-deploy needs (no secrets here).
    # The deploy keys its "already on host?" skip on per-image ref; image_tag is informational.
    {
      printf 'auth_service_domain: "%s"\n' "${AUTH_SERVICE_DOMAIN}"
      printf 'image_tag: "%s"\n' "${IMAGE_TAG}"
      printf 'images:\n'
      printf '  - { tar: caddy.tar, ref: "localhost/caddy:%s" }\n' "${IMAGE_TAG}"
      printf '  - { tar: auth-service.tar, ref: "localhost/auth-service:%s" }\n' "${IMAGE_TAG}"
      printf '  - { tar: canister-otlp-syncer.tar, ref: "localhost/canister-otlp-syncer:%s" }\n' "${IMAGE_TAG}"
      printf '  - { tar: metrics-proxy.tar, ref: "localhost/metrics-proxy:%s" }\n' "${IMAGE_TAG}"
      printf '  - { tar: payments-service.tar, ref: "localhost/payments-service:%s" }\n' "${IMAGE_TAG}"
    } > "${DIST}/deploy-vars.yml"

    echo "Rendered -> ${DIST}"

# Bring up the full local env: replica + canisters + telemetry sink + services.
# The syncer is one-shot: trigger it with `just services::canister-otlp-syncer`.
# Preflight runs first (deps are left-to-right) so a missing .env.local fails
# before the slow canister build, not after.
local-up: local-preflight local-deps-up
    ./scripts/init-local.sh
    @just local-services-up
    @echo "Mailpit UI: http://localhost:8025"

# Fail fast if the local prerequisites are missing.
local-preflight:
    #!/usr/bin/env bash
    set -euo pipefail
    if [ ! -f .env.local ]; then
        echo "local-up: .env.local not found. Run: cp .env.local.example .env.local" >&2
        exit 1
    fi

# Tear down everything brought up by local-up.
local-down:
    podman-compose -f local/compose.yml down
    icp network stop || true

# Build + (re)start the auth-service / metrics-proxy containers. Run after
# init-local.sh so .env (canister ids) exists; --build picks up code changes.
local-services-up:
    podman-compose -f local/compose.yml up -d --build auth-service metrics-proxy canister-otlp-syncer

# Bring up the infra dependencies: telemetry sink (Alloy :4318 -> Prometheus
# :9090) + Mailpit (SMTP :1025, UI :8025). Metrics at http://localhost:9090,
# mail at http://localhost:8025.
local-deps-up:
    podman-compose -f local/compose.yml up -d prometheus alloy mailpit

# Tear down the whole compose stack (deps + services).
local-deps-down:
    podman-compose -f local/compose.yml down

# Format Rust + TypeScript + Go
fmt:
    cargo fmt
    bun run format
    just services::fmt
    just tools::fmt

# Type-check Rust + TypeScript + Go without building
check:
    cargo check -p backend
    bun --bun tsc --build
    just services::check
    just tools::check

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
    cd src/canister-history-api && bun run build
    cd src/cycles-monitor-api && bun run build
    cd src/management-canister && bun run build

# Run backend integration tests, rebuilding the wasm first; args scope vitest (e.g. canister, -t soft-delete)
test-backend *args: build-backend
    cd src/backend-tests && bun run test {{args}}

# Re-run backend integration tests without rebuilding the wasm; same scoping args as test-backend
retest-backend *args:
    cd src/backend-tests && bun run test {{args}}

# Go microservices live under services/; see `just services::` for recipes
mod services

# Go operator tooling lives under tools/; see `just tools::` for recipes
mod tools
