default:
    @just --list

# Format Rust + TypeScript
fmt:
    cargo fmt
    bun run format

# Type-check Rust + TypeScript without building
check:
    cargo check -p backend
    bun --bun tsc --build

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
