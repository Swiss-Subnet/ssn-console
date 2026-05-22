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

`auth-service` mints an Ed25519 JWT and hands it to SMTP. To exercise the
full flow locally you need a fake SMTP server; Mailpit is the easiest.

1. Generate the signing keys (one time):

   ```
   mkdir -p .local
   openssl genpkey -algorithm ed25519 -out .local/sign.pem
   openssl pkey -in .local/sign.pem -pubout -out .local/sign.pub
   ```

2. Start Mailpit (SMTP on 1025, web UI on 8025):

   ```
   docker run --rm -p 1025:1025 -p 8025:8025 axllent/mailpit
   ```

3. Populate `.env.local` at the repo root. `just services::run` sources
   this file via bash, so `$(...)` is expanded at load time and the PEM
   is inlined with real newlines:

   ```
   PRIVATE_KEY="$(cat .local/sign.pem)"
   FRONTEND_URL=http://localhost:4200
   SMTP_HOST=127.0.0.1
   SMTP_PORT=1025
   SMTP_USER=
   SMTP_PASS=
   SMTP_FROM="Swiss Subnet <noreply@local>"
   PORT=3000
   ```

   Leave `SMTP_USER` and `SMTP_PASS` blank: Mailpit does not implement
   SMTP AUTH. In prod both must be set; the service rejects one without
   the other.

   The same `PRIVATE_KEY` must match the `PUBLIC_KEY` set on the backend
   canister, otherwise the token will fail verification on the IC side.

4. Run the service:

   ```
   just services::run auth-service
   ```

5. Trigger a verification email:

   ```
   curl -i -X POST http://localhost:3000/v1.0/auth/email-verification \
     -H 'content-type: application/json' \
     -d '{"email":"alice@subnet.ch"}'
   ```

   Expect `202 Accepted`. The SMTP send is detached, so 202 means the
   token was minted and enqueued, not that mail was delivered -- watch
   Mailpit at `http://localhost:8025` (or the service logs) to confirm.

The magic link in the Mailpit message points at
`${FRONTEND_URL}/verify?token=...`; pasting it into a browser signed in
against the local replica completes the canister-side verification.

For fast feedback without SMTP, `just services::test` runs the in-process
HTTP + fake-mailer tests under `internal/server` and `internal/mailer`.

## Adding a new service

1. `mkdir services/<name> && cd services/<name>`
2. `go mod init github.com/swiss-subnet/ssn-console/services/<name>`
3. Add `./<name>` to `services/go.work`
4. Mirror the `auth-service` layout (`cmd/<name>/main.go`, `internal/...`)
5. The `services::` recipes auto-discover any directory with a `go.mod`,
   so no Justfile changes are needed.
