# Project Architecture Rules (Non-Obvious Only)

- Backend uses a layered architecture with controllers, services, data, and DTOs
- All backend canister operations are exposed via Candid interface
- Frontend uses Zustand for state management and React Router for navigation
- Tests use PocketIC for IC simulation with Vitest framework
- API calls are made through generated Candid bindings from backend DID files
- Authentication uses IC SDK auth components
- Backend tests require specific setup with PocketIcServer for IC simulation
- Integration tests are structured in the src/backend-tests/src/tests/ directory
- The project is a monorepo with packages managed by bun workspaces
- The architecture separates concerns with clear boundaries between backend and frontend
- The backend canister is designed to work with DFINITY's Internet Computer platform
- The backend canister requires dfx to be running in background (`dfx start --background`) for local development
