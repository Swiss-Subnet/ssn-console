# **PROJECT**

Exported from SSN Console. Each canister is a Rust crate under `src/<name>/`.

## First-time setup

- Install [icp-cli](https://github.com/dfinity/icp-cli): `npm i -g @icp-sdk/icp-cli`
- Install Rust (the toolchain is pinned in `rust-toolchain.toml`; rustup will pick it up automatically)

## Deploy

```
icp deploy -e ic
```

Canister IDs are pinned in `.icp/data/mappings/ic.ids.json`. Replace the hello-world code in each `src/<name>/src/lib.rs` with your actual canister logic.
