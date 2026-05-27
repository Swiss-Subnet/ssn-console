# {{PROJECT}}

Exported from the [Swiss Subnet Console](https://subnet.ch). Each canister in this project is scaffolded as an **asset canister** serving a single placeholder `index.html`. Replace `src/<canister>/dist/` with your built static site (or swap the recipe -- see below).

## Deploy

Install [icp-cli](https://github.com/dfinity/icp-cli), then pick a network.

**Mainnet (production):**

```
icp deploy -e ic
```

Your canister principals are pinned in `.icp/data/mappings/ic.ids.json`, so this upgrades the existing canisters rather than creating new ones.

**Local replica (development):**

```
icp network start -d
icp deploy
```

icp-cli runs a managed local replica on `127.0.0.1:8765` (configured in `icp.yaml`) and creates fresh local canister ids at `.icp/cache/mappings/local.ids.json`. These ids are ephemeral and reset when you stop the network with `icp network stop`. The port is non-standard on purpose -- the default 8000 frequently collides with dfx and other replicas; change `networks.local.gateway.port` in `icp.yaml` if 8765 is also taken.

After `icp deploy` succeeds, each canister is reachable at `http://<canister>.local.localhost:8765/`.

## Layout

```
icp.yaml                            recipes per canister
.icp/data/mappings/ic.ids.json      canister id pins (commit this)
src/<canister>/dist/index.html      static payload per canister
```

`.icp/data/` is committed (it holds your mainnet ids). `.icp/cache/` and any build artifacts are not.

## Swapping a canister to Rust

Replace the canister entry in `icp.yaml`:

```yaml
- name: <canister>
  recipe:
    type: '@dfinity/rust@v3.2.0'
    configuration:
      package: <canister>
      candid: src/<canister>/<canister>.did
```

And add the matching Cargo crate at `src/<canister>/`:

```toml
# src/<canister>/Cargo.toml
[package]
name = "<canister>"
version = "0.1.0"
edition = "2021"

[lib]
crate-type = ["cdylib"]

[dependencies]
candid = "0.10"
ic-cdk = "0.19"
```

```rust
// src/<canister>/src/lib.rs
use ic_cdk::query;

#[query]
fn greet(name: String) -> String {
    format!("Hello, {name}!")
}
```

```
// src/<canister>/<canister>.did
service : {
  greet : (text) -> (text) query;
};
```

You'll also want a root `Cargo.toml` workspace and a `rust-toolchain.toml` pinning a wasm-capable Rust release.

## Swapping a canister to Motoko

```yaml
- name: <canister>
  recipe:
    type: '@dfinity/motoko@v4.1.0'
    configuration:
      main: src/<canister>/main.mo
```

```motoko
// src/<canister>/main.mo
actor {
  public query func greet(name : Text) : async Text {
    "Hello, " # name # "!";
  };
};

```

## Recipe reference

- [@dfinity/asset-canister](https://github.com/dfinity/icp-cli-recipes/tree/main/recipes/asset-canister)
- [@dfinity/rust](https://github.com/dfinity/icp-cli-recipes/tree/main/recipes/rust)
- [@dfinity/motoko](https://github.com/dfinity/icp-cli-recipes/tree/main/recipes/motoko)
