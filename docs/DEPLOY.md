# Deploy

The workload (Caddy, auth-service, canister-otlp-syncer) is deployed in two stages across two repos:

1. **Render** (here): build the container images and substitute config from a `.env` into `dist/`.
2. **Place + activate** ([ssn-infra](https://github.com/swiss-subnet/ssn-infra)): ansible copies `dist/` onto the host, loads images, and restarts services.

The host itself (packages, firewall, alloy, fail2ban, sysctls) is provisioned separately by ssn-infra; see its README.

## Why the split

Secrets stay in this repo. `render` fills templates (quadlets, Caddyfile, `config.alloy`) with values from your `.env` and writes the rendered output to `dist/`. ssn-infra's `ansible-console-deploy` only copies that already-rendered directory; it never sees the `.env`. The matching read-only `ansible-console-check` verifies the host against `config/` without the values.

## Workload tools

- **Podman & Quadlets**: containers run as Systemd user services via Quadlets.
- **Caddy**: reverse proxy; TLS via the Cloudflare DNS challenge.
- **SELinux**: custom `.cil` policies (in `config/`) enforce per-container boundaries; loaded on the host by ansible.
- **Go**: `auth-service` compiles to a static binary (distroless image).

## Env files

Copy `.env.example` to `.env.<env>` and fill in real values (gitignored):

```shell
cp .env.example .env.dev
```

## Render

```shell
just render ./.env.dev
```

This builds the three images, tags them with the current git revision (`localhost/<name>:<sha>`), saves them as tars, substitutes config, and writes everything to `dist/`. A dirty working tree tags images `<sha>-dirty` and warns; commit before a real deploy so the build is reproducible from a commit.

`dist/` layout (the contract ansible consumes):

```
dist/
  images/*.tar
  quadlets/*
  systemd/canister-otlp-syncer.timer
  Caddyfile
  config.alloy
  policies/*.cil
  deploy-vars.yml      # non-secret facts: auth_service_domain, image_tag, image refs
```

## Deploy to the host

From [ssn-infra](https://github.com/swiss-subnet/ssn-infra) (the console submodule must be on the rendered commit):

```shell
just ansible-console-deploy dev
```

Images are keyed by their git-revision tag, so re-deploying unchanged code is a no-op (the host already has the tagged image; nothing is re-shipped or restarted).

## Deploy canisters

Canister deploys run in CI (`.github/workflows/deploy-test.yml`, `deploy-production.yml`) via `dfx deploy`, on push to `main` (test) or manual dispatch (production).
