# Project Documentation Rules (Non-Obvious Only)

- Backend canister in Rust with Candid interface
- Frontend in React with TypeScript
- API bindings generated from Candid interface
- Management canister for IC operations
- Tests are structured in the src/backend-tests/src/tests/ directory
- Build commands are specific to bun workspaces (e.g., `bun run -F @ssn/backend-api build`)
- The project uses a monorepo structure with packages in src/ directory
- Documentation refers to specific package names like @ssn/backend-api, @ssn/management-canister
- The project requires dfx (DFINITY's tooling) for local development and deployment
- The backend canister requires dfx to be running in background (`dfx start --background`) for local development
