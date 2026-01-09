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

Build the frontend:

```shell
pnpm -F frontend build
```

Run the frontend development server:

```shell
pnpm -F frontend start
```

Format code:

```shell
pnpm format
```

Update to the latest version of `pnpm`:

```shell
corepack prepare pnpm@latest --activate
```
