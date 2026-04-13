# SSN Console

## Initial Setup

- Install [`bun`](https://bun.sh/).
  ```shell
  curl -fsSL https://bun.sh/install | bash
  ```
- Install [Rust](https://rust-lang.org/).
  ```shell
  curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
  ```
- Install [`dfx`](https://docs.internetcomputer.org/building-apps/getting-started/install#installing-dfx-via-dfxvm).
  ```shell
  sh -ci "$(curl -fsSL https://internetcomputer.org/install.sh)"
  ```

Alternatively, all tooling is provided by the Nix flake:

```shell
nix develop
```

## Env Vars

Create the `.env.local` file:

```shell
PRIVATE_KEY="${PRIVATE_KEY}"
PUBLIC_KEY="${PUBLIC_KEY}"

FRONTEND_URL="${FRONTEND_URL}"
SMTP_HOST="${SMTP_HOST}"
SMTP_PORT="${SMTP_PORT}"
SMTP_USER="${SMTP_USER}"
SMTP_PASS="${SMTP_PASS}"
SMTP_FROM="${SMTP_FROM}"
PORT="${PORT}"
```

Generate the signing keys for email verification JWTs:

```shell
mkdir -p .local
openssl genpkey -algorithm ed25519 -out .local/sign.pem
openssl pkey -in .local/sign.pem -pubout -out .local/sign.pub
```

Note: macOS LibreSSL does not support Ed25519. Use the Nix shell
or install OpenSSL via Homebrew.

For minimal local dev (no SMTP needed), create `.env.local` with
just the public key:

```shell
printf 'PUBLIC_KEY="%s"\n' "$(cat .local/sign.pub)" > .env.local
```

## Commands

Install dependencies:

```shell
bun i
```

Start the local replica and deploy canisters:

```shell
./scripts/init-local.sh
```

### Local Email Verification

After signing up and entering your email in the UI, generate a
verification token:

```shell
bun run scripts/generate-verify-token.ts <your-email>
```

Visit `http://localhost:5173/verify?token=<output>` in the same
browser where you are signed in.

### Local User Activation

New users start with `Pending` status. Activating via dfx is
sufficient to use the app locally -- email verification is optional:

```shell
dfx canister call backend list_user_profiles '(record {})'
dfx canister call backend update_user_profile '(record { user_id = "<id>"; status = opt variant { Active } })'
```

### Build the frontend

Build the backend API library:

```shell
bun turbo -F @ssn/backend-api build
```

Build the management canister library:

```shell
bun turbo -F @ssn/management-canister build
```

Run the frontend development server:

```shell
bun turbo -F frontend start
```

### CI

CI runs lint and build/test jobs per service, skipping jobs when
their source paths have not changed. See the comments at the top of
`.github/workflows/build-and-test.yml` for the dependency graph. If
you add cross-canister dependencies or new packages, update the path
filters in the workflow files.

### Format code:

```shell
bun format
```

### Controller Management

To add a controller (make a user into an admin):

```shell
dfx canister update-settings --add-controller ${CONTROLLER_PRINCIPAL} backend
```

To remove a controller (remove admin rights from a user):

```shell
dfx canister update-settings --remove-controller ${CONTROLLER_PRINCIPAL} backend
```

### Canister Cycle Management

To top up cycles for a canister, use the following command:

```shell
dfx wallet send ${CANISTER_ID} ${CYCLES_AMOUNT}
```

### Canisters CSV Export

To export a CSV of all canisters tracked by the Console:

```shell
bun -F scripts fetch-canisters-csv
```

The above script defaults to mainnet, to use a different network:

```shell
bun -F scripts fetch-canisters-csv --network="local"
```

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
dfx canister call --network test canister-history list_subnet_canister_ids '(record { page = null; limit = null })'
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

### Canister info

Encode the call args for the management canister:

```shell
./didc encode --defs ./src/management-canister/ic.did --types '(canister_info_args)' '(
  record {
    canister_id = principal "${TARGET_CANISTER_PRINCIPAL}";
    num_requested_changes = opt 100;
  }
)'
```

Make the call to your cycles wallet:

```shell
dfx canister call --ic --candid ./cycles_wallet.did ${CYCLES_WALLET_PRINCIPAL} wallet_call
```

Enter the following options into Candid assist:

- `hex`: `${ARGS_HEX}`
- `0`
- `canister_info`
- `aaaaa-aa`

Decode the output:

```shell
./didc decode --defs ./src/management-canister/ic.did --types '(canister_info_result)' ${RESULT_HEX}
```
