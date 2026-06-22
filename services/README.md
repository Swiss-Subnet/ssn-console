# services/

Go microservices for the SSN Console platform.

## Layout

```
services/
  go.work                       # Go workspace, one entry per service
  Justfile                      # invoked from the root as `just services::<recipe>`
  auth-service/                 # email verification + JWT minting
    go.mod
    cmd/auth-service/main.go    # binary entrypoint
    internal/                   # service-private packages
```

Each service is its own Go module so it can be versioned, vendored, and
deployed independently. The `go.work` file lets the workspace resolve cross-
module references during local development.

## Running

From the repo root:

```
just services            # list recipes
just services::test      # go test across every module
just services::check     # go vet
just services::build     # build every service into <svc>/bin/<svc>
just services::run auth-service   # run locally, loads ../.env.local
```

`just fmt` and `just check` at the repo root also invoke the matching
`services::` recipes alongside the Rust + TS ones.

## auth-service: end-to-end testing

`auth-service` mints an Ed25519 JWT and hands it to SMTP. Both the service
and its Mailpit sink are brought up by `just local-up` from the repo root,
so the usual setup is enough:

```
cp .env.local.example .env.local   # if you haven't already
just local-up                      # replica + canisters + auth-service + Mailpit
```

`.env.local.example` ships the RFC 8032 Test 1 keypair (no real secret);
`init-local.sh` installs its `PUBLIC_KEY` on the backend canister so minted
tokens verify on the IC side. `SMTP_USER`/`SMTP_PASS` are blank because
Mailpit implements no AUTH -- in prod both must be set or the service
rejects the config. Mailpit's web UI is at `http://localhost:8025`.

Trigger an email (verification or recovery):

```
curl -i -X POST http://localhost:3000/v0/auth/email-verification \
  -H 'content-type: application/json' -d '{"email":"alice@subnet.ch"}'

curl -i -X POST http://localhost:3000/v0/auth/account-recovery \
  -H 'content-type: application/json' -d '{"email":"alice@subnet.ch"}'
```

Both always return `202 Accepted` (no oracle for valid/invalid/throttled).
The SMTP send is detached, so 202 means the token was minted and enqueued,
not delivered -- watch Mailpit or the service logs to confirm.

The magic link points at `${FRONTEND_URL}/verify?token=...` or
`/recover?token=...`. Verification runs as the signed-in principal; recovery
must run as a _new, unclaimed_ Internet Identity and links it to the account
that owns the verified email (so a verified+claimed email must exist first).

For fast feedback without SMTP, `just services::test` runs the in-process
HTTP + fake-mailer tests under `internal/server` and `internal/mailer`.

## Adding a new service

1. `mkdir services/<name> && cd services/<name>`
2. `go mod init github.com/swiss-subnet/ssn-console/services/<name>`
3. Add `./<name>` to `services/go.work`
4. Mirror the `auth-service` layout (`cmd/<name>/main.go`, `internal/...`)
5. The `services::` recipes auto-discover any directory with a `go.mod`,
   so no Justfile changes are needed.
