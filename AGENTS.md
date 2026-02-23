# AGENTS.md

This file provides guidance to agents when working with code in this repository.

## Build/Lint/Test Commands

- Build backend API library: `pnpm -F @ssn/backend-api build`
- Build management canister library: `pnpm -F @ssn/management-canister build`
- Run frontend development server: `pnpm -F frontend start`
- Run backend tests: `pnpm -F backend-tests test`
- Format code: `pnpm format`
- Run a single test: `pnpm -F backend-tests test --reporter=verbose <test-file-path>`

## Code Style Guidelines

- Uses Prettier with single quotes, trailing commas, and arrow parens avoidance
- EditorConfig defines 2-space indentation for most files, 4-space for Rust/TOML
- TypeScript/React code follows standard conventions with Tailwind CSS for styling
- Rust code follows IC conventions with Candid interface export
- All backend canister operations are exposed via Candid interface
- API calls are made through generated Candid bindings from backend DID files

## Project-Specific Patterns

- Backend uses a layered architecture with controllers, services, data, and DTOs
- Frontend uses Zustand for state management and React Router for navigation
- Tests use PocketIC for IC simulation with Vitest framework
- Authentication uses IC SDK auth components
- Backend tests require specific setup with PocketIcServer for IC simulation
- Integration tests are structured in the src/backend-tests/src/tests/ directory
- The backend canister requires dfx to be running in background (`dfx start --background`) for local development
- The project uses a monorepo structure with packages managed by pnpm workspaces
- The backend canister is designed to work with DFINITY's Internet Computer platform
- All backend canister operations are exposed via Candid interface
- API calls are made through generated Candid bindings from backend DID files

## Testing

- Backend tests use Vitest with PocketIC for IC simulation
- Tests are run from the backend-tests package directory
- Tests require specific setup with PocketIcServer for IC simulation
- Integration tests are structured in the src/backend-tests/src/tests/ directory
- When debugging backend tests, ensure PocketIC server is properly initialized in global-setup.ts
- Backend tests must be run from the backend-tests package directory, not root
- The test framework requires specific test setup with generateRandomIdentity and TestDriver
- Tests use a pattern of creating identities and profiles before running operations
