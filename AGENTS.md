# AI Agent Instructions for ssn-console

This document provides guidelines, commands, and conventions for AI coding agents operating within the `ssn-console` repository.

## 1. Project Overview & Architecture

This is a monorepo containing an Internet Computer Protocol (ICP) application.

### Packages

| Package (workspace name) | Path                         | Language              | Description                                                                                   |
| ------------------------ | ---------------------------- | --------------------- | --------------------------------------------------------------------------------------------- |
| `frontend`               | `src/frontend`               | TypeScript / React 19 | SPA — Vite, TailwindCSS v4, Zustand, Zod, React Router                                        |
| `offchain-service`       | `src/offchain-service`       | TypeScript / Bun      | HTTP service — ElysiaJS, JWT auth, email via nodemailer                                       |
| `backend-tests`          | `src/backend-tests`          | TypeScript            | PocketIC integration tests for the `backend` canister                                         |
| `canister-history-tests` | `src/canister-history-tests` | TypeScript            | PocketIC integration tests for the `canister-history` canister                                |
| `cycles-monitor-tests`   | `src/cycles-monitor-tests`   | TypeScript            | PocketIC integration tests for the `cycles-monitor` canister                                  |
| `scripts`                | `src/scripts`                | TypeScript            | Utility scripts (CSV fetch, subnet data)                                                      |
| `backend-api`            | `src/backend-api`            | TypeScript            | **Generated** — do not hand-edit; JS/TS bindings produced by `icp-bindgen` from `backend.did` |
| `canister-history-api`   | `src/canister-history-api`   | TypeScript            | **Generated** — do not hand-edit; JS/TS bindings produced by `icp-bindgen`                    |
| `cycles-monitor-api`     | `src/cycles-monitor-api`     | TypeScript            | **Generated** — do not hand-edit; JS/TS bindings produced by `icp-bindgen`                    |
| `management-canister`    | `src/management-canister`    | TypeScript            | **Generated** — do not hand-edit; JS/TS bindings for the IC management canister               |

### Rust Canisters & Libraries

| Crate              | Path                   | Description                                                                                     |
| ------------------ | ---------------------- | ----------------------------------------------------------------------------------------------- |
| `backend`          | `src/backend`          | Main ICP canister; serves the frontend SPA as certified HTTP assets                             |
| `canister-history` | `src/canister-history` | Canister history tracker                                                                        |
| `cycles-monitor`   | `src/cycles-monitor`   | Monitor and record cycle usage                                                                  |
| `canister-utils`   | `src/canister-utils`   | Shared Rust library — auth, CBOR, UUID, error types; used as a path dependency by the canisters |

### DFX Configuration (`dfx.json`)

- DFX version: `0.30.2`
- Defined canisters: `backend`, `canister-history`, `cycles-monitor`, `internet_identity` (remote on non-local networks)
- Networks: `local` (127.0.0.1:8000 ephemeral), `test` (icp0.io persistent), `production` (icp0.io persistent)
- Canister IDs are written to `.env` by DFX on deploy and read by Vite via `vite-plugin-environment`

### Rust Toolchain

- Version: `1.92.0` (pinned in `rust-toolchain.toml`)
- Target: `wasm32-unknown-unknown`

---

## 2. Build, Lint, and Test Commands

### Root Level

- **Install Dependencies**: `bun install` (installs all TS/JS workspace dependencies)
- **Format Code**: `bun format` (Prettier across the whole monorepo)
- **Check Formatting**: `bun format:check`
- **Type Check TypeScript**: `bun type-check` (runs `tsc --build` across the workspace)

### Frontend (`src/frontend`)

- **Start Dev Server**: `bun turbo -F frontend start` (Vite on port 3000)
- **Build Frontend**: `bun turbo -F frontend build` (runs `tsc && vite build`)

### Offchain Service (`src/offchain-service`)

- **Run Tests**: `bun turbo -F offchain-service test` (uses `bun test`, not vitest)
- The service compiles to a standalone Bun binary inside its container (`config/offchain-service.containerfile`)

### Rust / ICP

These commands apply to all canister projects (`backend`, `canister-history`, `cycles-monitor`).

- **Build Rust Canisters**: `dfx build <canister-name> --check` (preferred over `cargo build`; validates ICP configuration)
- **Lint Rust**: `cargo clippy --workspace --all-targets -- -D warnings`
- **Format Rust**: `cargo fmt --all`
- **Run Rust Unit Tests**: `cargo test --workspace`

### Running PocketIC Integration Tests

**Important:** Tests load WASM artifacts from `.dfx/local/canisters/<name>/<name>.wasm.gz`. You must run `dfx build <canister-name>` before running integration tests for that canister for the first time or after Rust changes.

The core business logic is tested using PocketIC and Vitest. Each test package's `test` script runs `vitest run`.

- **Run All Tests in a Package**:
  ```bash
  bun turbo -F backend-tests test
  # or
  bun turbo -F canister-history-tests test
  # or
  bun turbo -F cycles-monitor-tests test
  ```
- **Run a Single Test File** (preferred for iterating quickly):
  ```bash
  bun turbo -F backend-tests test <test-file-name>.spec.ts
  ```
- **Run a Specific Test Case**:
  ```bash
  bun turbo -F backend-tests test <test-file-name>.spec.ts -t "test name"
  ```

Test files are located in `src/backend-tests/src/tests/`, `src/canister-history-tests/src/tests/`, and `src/cycles-monitor-tests/src/tests/`.

---

## 3. Code Style & Conventions

### Frontend (React/TypeScript)

#### Component Structure

- Use Functional Components strictly typed with `FC` from `react`: `export const MyComponent: FC<Props> = ({ ... }) => { ... }`.
- When a component requires `children`, use the `PC<T>` type alias (defined in `src/lib/utils.ts`) instead of `FC`: `export const MyComponent: PC<Props> = ({ children, ... }) => { ... }`.
- Use absolute imports with the `@/` prefix for internal paths (e.g., `import { Button } from '@/components/ui/button';`).
- The React 19 compiler (`babel-plugin-react-compiler`) is enabled in the Vite config. Write standard React; do not manually add `useMemo`/`useCallback` for performance — the compiler handles this.

#### State & Data

- Use `zustand` for global state. The store is split into slices under `src/lib/store/`. Import from the barrel: `import { useAppStore } from '@/lib/store'`.
- Store slices: `api`, `auth`, `canister`, `organization`, `project`, `terms-and-conditions`, `trusted-partner`, `user-profile`, `users`.
- Memoized selectors using `reselect` are defined per-slice (e.g., `selectProjectMap`, `selectOrgsWithProjects`, `selectCanisters`). Prefer these over inline derivations.
- Use `zod` for schema validation and inferring types (`@dfinity/zod-schemas`).
- Avoid `any`. Use strict TypeScript typing.

#### API Layer

- API calls go through class-based wrappers in `src/lib/api/`. Access them via the store's `api` slice (e.g., `useAppStore.getState().getProjectApi()`).
- API response models and mapper functions live in `src/lib/api-models/`. Use `mapOkResponse` from `@/lib/api-models/error` to unwrap `Result` responses — it throws on `Err` variants.
- For Candid optional fields (`[] | [T]`), use `fromCandidOpt` / `toCandidOpt` from `@/lib/utils`.

#### Auth & Route Guards

- `useRequireAuth()` (`src/lib/auth.ts`) — redirects unauthenticated users, or those who haven't accepted T&C / are inactive.
- `useRequireAdminAuth()` (`src/lib/auth.ts`) — redirects non-admins.
- `useRequireProjectId()` (`src/lib/params.ts`) — reads `:projectId` route param, redirects to `/` if missing. Use in any route that needs a project context.

#### Styling

- Use TailwindCSS v4 utility classes.
- Use the `cn()` utility from `@/lib/utils` (wraps `clsx` + `tailwind-merge`) for conditional class concatenation.

#### Error Handling & UX

- Wrap initialization and side effects in `try/catch` blocks.
- Surface errors to the user using the `showErrorToast` / `showSuccessToast` utilities:

  ```typescript
  import { showErrorToast, showSuccessToast } from '@/lib/toast';

  try {
    await doSomething();
    showSuccessToast('Operation successful');
  } catch (err) {
    showErrorToast('Failed to execute operation', err);
  }
  ```

#### Utility Functions

- `cn(...)` — class merging (`@/lib/utils`)
- `PC<T>` — `FC<PropsWithChildren<T>>` shorthand (`@/lib/utils`)
- `fromCandidOpt` / `toCandidOpt` — Candid optional (`[] | [T]`) ↔ `T | null` (`@/lib/utils`)
- `isNil(x)` / `isNotNil(x)` — type-narrowing null/undefined checks (`@/lib/nil`)
- `useReturnTo()` — stable `navigate` callback that avoids no-op navigations (`@/lib/utils`)

#### Naming conventions

- **Files**: kebab-case or PascalCase matching the directory conventions
- **Variables/Functions**: camelCase
- **Types/Interfaces**: PascalCase

---

### Backend (Rust — `src/backend`)

#### Architecture

The `backend` canister follows a strict layered architecture. Each domain entity (e.g., `canister`, `project`, `user_profile`) has a file in each layer:

- `controller/` — Candid `#[query]` / `#[update]` endpoints; also serves the frontend SPA as certified HTTP assets via `controller/http.rs`
- `service/` — Core reusable business logic; includes `access_control_service.rs` for authorization checks
- `data/` — State management:
  - `data/model/` — Domain model structs (the "in-memory" representation)
  - `data/memory/` — Stable memory allocation via `ic-stable-structures` (one memory slot per entity type)
  - Repository files at `data/<entity>_repository.rs` — CRUD over stable structures
- `dto/` — Data Transfer Objects used for Candid serialization
- `mapping/` — Conversion between domain models and DTOs

#### `canister-history` Canister

The `canister-history` canister is intentionally simpler. It uses a **flat single-file structure** rather than subdirectories: `controller.rs`, `service.rs`, `repository.rs`, `model.rs`, `dto.rs`, `mapping.rs`, `memory.rs` all live directly under `src/canister-history/src/`.

#### `canister-utils` Library

Shared utilities used by both canisters via `canister-utils = { path = "../canister-utils" }`:

- `auth` — caller authentication helpers
- `cbor` — CBOR serialization (ciborium)
- `error` — `ApiResultDto` and common error types
- `principal` — principal utilities
- `rand` / `uuid` — random UUID generation

#### Macros & State

- Use `#[query]` and `#[update]` macros from `ic_cdk` for all canister endpoints.
- Use `thread_local!` with `ic-stable-structures` for persistent state. Memory allocation is centralized in `data/memory/memory_manager.rs`.

#### Candid Interface Compatibility

All canisters include an inline `#[cfg(test)]` test that validates the exported Candid interface against the `.did` file using `candid_parser::utils::service_compatible`. Run `cargo test --workspace` to verify interface changes don't break compatibility.

#### Error Handling

- Prefer returning `Result<T, E>` types.
- Define domain-specific error enums in `dto/` or `service/` layers.
- Use the `?` operator for clean error propagation.

#### Naming conventions

- **Structs/Enums/Traits**: PascalCase
- **Functions/Variables/Modules**: snake_case

---

### Offchain Service (TypeScript — `src/offchain-service`)

This is a standalone Bun + ElysiaJS HTTP service deployed as a container alongside the ICP canisters.

#### Architecture

Follows the same layered structure as the Rust backend:

- `controller/` — ElysiaJS route handlers
- `service/` — Business logic (JWT generation with `jose`, email with `nodemailer`)
- `dto/` — Request/response types

#### Testing

Tests use `bun test` (not vitest). Run with `bun turbo -F offchain-service test`.

---

## 4. Workflows for Agents

- **Exploration**: Always use `grep` and `glob` to locate the right component, service, or test before planning code changes. Do not guess file paths or import locations.
- **Context Gathering**: Before implementing a feature, read adjacent files, relevant configuration files (e.g. `package.json`, `Cargo.toml`), and existing tests to ensure you match the project's precise patterns and dependencies.
- **Generated Packages**: Never manually edit files in `src/backend-api/dist`, `src/canister-history-api/dist`, or `src/management-canister/dist/`. These are generated by `icp-bindgen` from `.did` files. Regenerate them by running respective `build` script (e.g. `bun turbo -F @ssn/backend-api build`).
- **Incremental Changes**: Make small, verifiable changes. Avoid rewriting large sections of code in a single step.
- **Handling Ambiguity**: If a requirement is ambiguous or you are missing context, ask the user clarification questions instead of making broad assumptions.
- **Verification**: After writing code, immediately run the `format` script and the relevant `build` or single `test` command to ensure the build isn't broken. If a test fails, read the test file to understand what went wrong before attempting a fix.
- **Adding Dependencies**: Be highly conservative. Rely on existing `package.json` or `Cargo.toml` dependencies before introducing new ones.
- **Version Control**: Do not automatically create git commits. Only create commits when explicitly asked by the user.
