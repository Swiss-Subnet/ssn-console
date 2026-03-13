# SSN Console

## Initial Setup

- Install [`fnm`](https://github.com/Schniz/fnm).
- Install the required Node.js version:
  ```shell
  fnm use
  ```
- Install `pnpm` using `corepack`:
  ```shell
  corepack enable
  ```
- Install [Rust](https://rust-lang.org/).
- Install [`dfx`](https://docs.internetcomputer.org/building-apps/getting-started/install#installing-dfx-via-dfxvm).

## Commands

Install dependencies:

```shell
pnpm i
```

Start the local replica:

```shell
dfx start --background
```

Deploy the canisters:

```shell
dfx deploy
```

### Build the frontend:

Build the backend API library:

```shell
pnpm -F @ssn/backend-api build
```

Build the management canister library:

```shell
pnpm -F @ssn/management-canister build
```

Run the frontend development server:

```shell
pnpm -F frontend start
```

### Format code:

```shell
pnpm format
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

### Update `pnpm`

Update to the latest version of `pnpm`:

```shell
corepack prepare pnpm@latest --activate
```

### Canister Cycle Management

To top up cycles for a canister, use the following command:

```shell
dfx wallet send ${CANISTER_ID} ${CYCLES_AMOUNT}
```

### Canisters CSV Export

To export a CSV of all canisters tracked by the Console:

```shell
pnpm -F scripts fetch-canisters-csv
```

The above script defaults to mainnet, to use a different network:

```shell
pnpm -F scripts fetch-canisters-csv --network="local"
```

### Canister history canister

List the current subnet canister ranges in the canister:

```shell
dfx canister call --network test canister-history list_subnet_canister_ranges '(record {})'
```

Get the current subnet canister ranges from the subnet:

```shell
pnpm -F scripts fetch-subnet-canister-ranges
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
