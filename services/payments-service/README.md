# payments-service

Go service that fronts the Payrexx REST API. The canister stores
opaque `external_ref` values (Payrexx subscription IDs); this service
is the only component that ever signs/sends/receives Payrexx traffic.

## Layout

- `cmd/payments-service/main.go` -- HTTP server. Endpoints: `GET /status`, `POST /v1.0/payrexx/signature-check`.
- `internal/payrexx/client.go` -- signed REST client. HMAC-SHA256, `&ApiSignature=` body/query.
- `internal/payrexx/envelope.go` -- decoder for Payrexx's `{status, data, message}` response shape.
- `internal/config/config.go` -- env-var loader.

## Run locally

1. Add the Payrexx instance + API secret to `.env.local` at the repo root
   (gitignored):

   ```
   PAYREXX_INSTANCE_NAME=...
   PAYREXX_API_SECRET=...
   ```

2. From the repo root:

   ```
   just services::run payments-service
   ```

The service listens on `:3001` by default. Pair it with `just caddy-local`
to reach it via `http://localhost:8080/v1.0/payrexx/...` -- the same path
shape production will use behind the reverse proxy.

## Tests

Hermetic (no network):

```
just services::test
```

Three signing-contract tests under `internal/payrexx/` mock `httptest`
servers and verify every byte of the signed request shape.

Live (real Payrexx instance, requires `.env.local`):

```
set -a && . .env.local && set +a && go test -tags=live -v ./services/payments-service/internal/payrexx/livetest/...
```

Two tests under `internal/payrexx/livetest/`, gated behind `//go:build live`.
The default `go test` skips them entirely. Set `PAYREXX_LIVE_INSTANCE` and
`PAYREXX_LIVE_SECRET` to enable; otherwise the tests skip.

## Adding a new Payrexx endpoint

The pattern, end to end:

1. Add a typed struct under `internal/payrexx/` for the response shape.
2. Add a method on `Client` that calls `c.Do(...)`, then `DecodeEnvelope(body)`,
   then `json.Unmarshal(env.Data, &yourStruct)`.
3. Add a hermetic test in `client_test.go` asserting the request shape
   (method, path, form fields, signature) using `httptest`.
4. Add a live test under `livetest/` that exercises the real endpoint.
5. Wire it up in `cmd/payments-service/main.go` if it should be exposed over HTTP.
