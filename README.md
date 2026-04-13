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

To generate the private key:

```shell
openssl genpkey -algorithm ed25519 -out ~/.ssh/id_ssn_local_sign.pem
```

To generate the corresponding public key:

```shell
openssl pkey -in ~/.ssh/id_ssn_local_sign.pem -pubout -out ~/.ssh/id_ssn_local_sign.pub
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

### Build the frontend:

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
bun turbo -F scripts fetch-canisters-csv
```

The above script defaults to mainnet, to use a different network:

```shell
bun turbo -F scripts fetch-canisters-csv --network="local"
```

### Canister history canister

List the current subnet canister ranges in the canister:

```shell
dfx canister call --network test canister-history list_subnet_canister_ranges '(record {})'
```

Get the current subnet canister ranges from the subnet:

```shell
bun turbo -F scripts fetch-subnet-canister-ranges
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
