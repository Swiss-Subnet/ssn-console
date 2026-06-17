# local/

Local development environment for the console workload. Dev-only, the prod deploy uses quadlets (see `docs/DEPLOY.md`), not this.

## One command

From the repo root, inside the nix dev shell:

```
just local-up      # replica + canisters + telemetry sink + services
just local-down    # tear it all back down
```

`local-up` runs `scripts/init-local.sh` (replica + canisters, daemonized), brings up the telemetry sink, and backgrounds the long-running services into `local/run/<svc>.{pid,log}` (gitignored). Tail a service with `tail -f local/run/auth-service.log`.

The `canister-otlp-syncer` is one-shot, so it is not part of the always-running set. Trigger a sync when you want to exercise it:

```
just services::canister-otlp-syncer
```

## Telemetry sink

`compose.yml` runs Grafana Alloy + Prometheus via podman-compose:

- **Alloy** receives OTLP on `:4318` and remote-writes to Prometheus.
- **Prometheus** stores metrics; inspect at <http://localhost:9090> (no Grafana UI locally).

Bring up just the sink with `just local-telemetry-up` / `local-telemetry-down`.

`alloy.local.alloy` is a trimmed local-only config (no cost relabels, no Grafana Cloud export); it does not track the prod `config/config.alloy`.

## Ports

| Port  | Service         |
| ----- | --------------- |
| 3000  | auth-service    |
| 3001  | metrics-proxy   |
| 4318  | Alloy OTLP/HTTP |
| 9090  | Prometheus      |
| 12345 | Alloy admin/UI  |
