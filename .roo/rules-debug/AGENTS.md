# Project Debug Rules (Non-Obvious Only)

- Backend tests require specific setup with PocketIcServer for IC simulation
- Integration tests are structured in the src/backend-tests/src/tests/ directory
- When debugging backend tests, ensure PocketIC server is properly initialized in global-setup.ts
- Backend canister requires dfx to be running in background (`dfx start --background`) for local development
- API calls are made through generated Candid bindings, so debugging may require checking DID files
- Authentication uses IC SDK auth components, so debugging may require proper IC environment setup
