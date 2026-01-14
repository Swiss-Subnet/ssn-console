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

To add a controller (make a user into an admin):

```shell
dfx canister update-settings --add-controller ${CONTROLLER_PRINCIPAL} backend
```

To remove a controller (remove admin rights from a user):

```shell
dfx canister update-settings --remove-controller ${CONTROLLER_PRINCIPAL} backend
```

Update to the latest version of `pnpm`:

```shell
corepack prepare pnpm@latest --activate
```

### Canister Cycle Management

To top up cycles for a canister, use the following command:

```shell
dfx wallet send ${CANISTER_ID} ${CYCLES_AMOUNT}
```
