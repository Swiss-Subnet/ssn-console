# local/

Local development environment for the console workload. Dev-only, the prod deploy uses quadlets (see `docs/DEPLOY.md`), not this.

## One command

From the repo root, inside the nix dev shell:

```
just local-up      # replica + canisters + compose stack (deps + services)
just local-down    # tear it all back down
```

`local-up` brings up the infra deps (telemetry sink + Mailpit), runs `scripts/init-local.sh` (replica + canisters, daemonized), then builds and starts the Go services (auth-service, metrics-proxy, canister-otlp-syncer) as containers in the same compose stack. Everything but the replica is managed by `local/compose.yml`. Tail a service with `podman logs -f local_auth-service_1`. Mailpit's web UI is at <http://localhost:8025>.

`just local-services-up` rebuilds and restarts just the service containers (use after a code change); `just local-deps-up` brings up only the infra deps.

The `canister-otlp-syncer` binary is one-shot; prod drives the cadence with a systemd hourly timer. In the compose stack it sets `SYNC_INTERVAL=60s` so the binary loops itself and keeps the canister-usage grid populated. To run a single pass against the replica without the container (e.g. while iterating on the syncer):

```
just services::canister-otlp-syncer
```

## Compose Stack

`compose.yml` runs the Go services (auth-service `:3000`, metrics-proxy `:3001`) plus their dependencies -- telemetry sink (Grafana Alloy + Prometheus) and Mailpit -- via podman-compose. The services read `../.env.local` + `../.env`; `environment:` overrides point SMTP/OTLP at the in-compose Mailpit/Alloy and IC_HOST at the host replica (`host.containers.internal`).

- **auth-service** (`:3000`) and **metrics-proxy** (`:3001`) -- the Go services, built from `../config/<svc>.containerfile`.
- **Alloy** receives OTLP on `:4318` and remote-writes to Prometheus.
- **Prometheus** stores metrics; inspect at <http://localhost:9090> (no Grafana UI locally).
- **Mailpit** is the auth-service SMTP sink (`:1025`); read mail at <http://localhost:8025>.

`just local-deps-up` starts only the infra (alloy/prometheus/mailpit); `local-deps-down` tears the whole stack down.

`alloy.local.alloy` is a trimmed local-only config (no cost relabels, no Grafana Cloud export); it does not track the prod `config/config.alloy`.

## Ports

| Port  | Service         |
| ----- | --------------- |
| 1025  | Mailpit SMTP    |
| 3000  | auth-service    |
| 3001  | metrics-proxy   |
| 4318  | Alloy OTLP/HTTP |
| 8025  | Mailpit web UI  |
| 9090  | Prometheus      |
| 12345 | Alloy admin/UI  |
