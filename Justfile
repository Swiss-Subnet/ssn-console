default:
    @just --list

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
    json=$(dfx canister call backend list_user_profiles '(record {})' --output json)
    mapfile -t lines < <(echo "$json" | jq -r '.Ok[] | "\(.id)\t\(.email[0] // "no-email")\t\(.status | keys[0])"')
    if [ ${#lines[@]} -eq 0 ]; then echo "No user profiles found."; exit 0; fi
    echo "Select a user to activate:"
    select line in "${lines[@]}"; do [ -n "${line:-}" ] && break; done
    id=${line%%$'\t'*}
    dfx canister call backend update_user_profile "(record { user_id = \"$id\"; status = opt variant { Active } })"

# Go microservices live under services/; see `just services::` for recipes
mod services
