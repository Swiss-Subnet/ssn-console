# SSN Console

## Setup

The Nix flake is the supported toolchain. It pins everything local dev needs (rust, `dfx`, `icp-cli`, the pocket-ic launcher, `bun`, `node`, `go`, `just`, `podman`, linters):

```shell
nix develop
```

Without Nix, install the pieces yourself: [`bun`](https://bun.sh/), [Rust](https://rust-lang.org/), [`icp-cli`](https://github.com/dfinity/icp-cli) (local dev), [`dfx`](https://docs.internetcomputer.org/building-apps/getting-started/install#installing-dfx-via-dfxvm) (CI/mainnet deploys), plus `go`, `just`, and `podman`/`podman-compose`.

Then, from the repo root:

```shell
bun i                              # install TS/JS workspace deps
cp .env.local.example .env.local   # local-dev env (see below)
just local-up                      # replica + canisters + auth-service + Mailpit
```

`just local-up` runs preflight, brings up the compose dependencies (telemetry sink + Mailpit), runs `./scripts/init-local.sh` (starts the replica, deploys canisters, writes `.env`), and starts the Go services. Tear it all down with `just local-down`.

`.env.local` works out of the box: the signing keypair is the public RFC 8032 Test 1 vector (no real secret), valid only against the local replica. `init-local.sh` installs its `PUBLIC_KEY` on the canister so the JWTs the auth-service mints verify on the IC side. No key generation needed.

Local dev runs on `icp-cli` (which pins the pocket-ic version). CI and mainnet/test deploys still use `dfx` for now; commands in the sections below that pass `--network test`/`--ic` remain `dfx`.

### Just the replica

If you only need the canisters (no Go services or Mailpit), run the init script directly:

```shell
./scripts/init-local.sh
```

### Local Email Verification & Recovery

Enter your email in the UI, then open the magic link from Mailpit (`http://localhost:8025`):

- verification links (`/verify?token=...`) -- open signed in as the email's account
- recovery links (`/recover?token=...`) -- open signed in as a new, unclaimed Internet Identity

See [services/README.md](./services/README.md#auth-service-end-to-end-testing) for the HTTP + SMTP details and `curl` triggers.

### Local Admin Operations

`ssn-admin` is the operator CLI for the backend's admin operations (user activation, staff permissions, principal linking). Locally it authenticates as the RFC 8032 test identity that `init-local.sh` pre-grants admin, so no setup is needed. List users to get their IDs:

```shell
just tools::ssn-admin user list
```

New users start with `Pending` status; activating is sufficient to use the app locally (email verification is optional):

```shell
just tools::ssn-admin user activate <user-id>
```

Staff permissions are cross-org capabilities (read every org, write billing, manage users, read raw metrics) gated behind the canister controller. Grant the full set, or toggle individual flags:

```shell
just tools::ssn-admin staff grant <user-id> --read-all-orgs --write-billing --manage-users --read-metrics
just tools::ssn-admin staff grant <user-id> --read-metrics   # narrower
```

See `just tools::ssn-admin help` for the full command surface (`user`, `staff`, `principal`). Against a non-local IC set `ADMIN_IDENTITY_PEM`.

### Run the frontend

```shell
bun turbo -F frontend start
```

Turbo builds the generated binding packages (`@ssn/backend-api`, `@ssn/management-canister`) as dependencies; you don't build them by hand.

### CI

CI runs lint and build/test jobs per service, skipping jobs when
their source paths have not changed. Path filters are shared across
the workflows in `.github/filters.yml`; update them when you add
cross-canister dependencies or new packages.

### Format code

`just fmt` formats the whole repo (Rust + TypeScript + Go):

```shell
just fmt
```

### Project export (icp-cli zip)

The Canisters page has a "Download project" button that emits a zip wired up for [icp-cli](https://github.com/dfinity/icp-cli). The zip contains:

- `icp.yaml` with one entry per canister, each using the `@dfinity/asset-canister` recipe
- `src/<canister>/dist/index.html` -- a Swiss-Subnet-branded placeholder page per canister
- `.icp/data/mappings/ic.ids.json` pinning the canister principals to mainnet
- A `README.md` showing how to swap a canister to Rust or Motoko by editing `icp.yaml`

Users unzip and run `icp deploy -e ic` to upgrade their canisters on mainnet -- no toolchain beyond `icp-cli` needed for the default asset path. Implementation lives in [src/frontend/src/lib/project-export/](src/frontend/src/lib/project-export/).

### Canisters CSV Export

To export a CSV of all canisters tracked by the Console:

```shell
bun -F scripts fetch-canisters-csv
```

The script uses `dfx` and defaults to mainnet (`production`); pass `--network` to target another `dfx` network, e.g. `test`:

```shell
bun -F scripts fetch-canisters-csv --network="test"
```

(`dfx` cannot reach the `icp-cli`-managed local replica, so `--network local` does not work here.)

### Canister history canister

List the current subnet canister ranges in the canister:

```shell
dfx canister call --network test canister-history list_subnet_canister_ranges '(record {})'
```

Get the current subnet canister ranges from the subnet:

```shell
bun -F scripts fetch-subnet-canister-ranges
```

Set the subnet canister ranges in the canister:

```shell
dfx canister call --network test canister-history update_subnet_canister_ranges '(
  record {
    canister_ranges = vec {
      record {
        principal "${RANGE_START_PRINCIPAL}";
        principal "${RANGE_END_PRINCIPAL}";
      };
    };
  },
)'
```

List the tracked canisters:

```shell
dfx canister call --network test canister-history list_subnet_canister_ids '(record {})'
```

List changes for a specific canister:

```shell
dfx canister call --network test canister-history list_canister_changes '(
  record {
    reverse = null;
    page = null;
    canister_id = principal "${TARGET_CANISTER_PRINCIPAL}";
    limit = opt (50 : nat64);
  },
)'
```
