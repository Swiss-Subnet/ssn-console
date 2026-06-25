## Stage 1: Build the static binary ##
# Build context is services/. canister-otlp-syncer depends on the canister-clients
# module via a replace directive, so both must be in context. canister-clients' goic
# bindings are committed, so the COPY brings them in and no generate step runs here.
# GOWORK=off ignores go.work (which lists modules not in context); canister-clients
# resolves via the replace directive.

FROM docker.io/library/golang:1.26 AS builder

WORKDIR /src
ENV CGO_ENABLED=0 GOOS=linux GOWORK=off

COPY canister-otlp-syncer/ ./canister-otlp-syncer/
COPY canister-clients/ ./canister-clients/

RUN --mount=type=cache,target=/root/.cache/go-build \
  --mount=type=cache,target=/go/pkg/mod \
  go build -C canister-otlp-syncer -trimpath -ldflags='-s -w' -o /out/canister-otlp-syncer ./cmd/canister-otlp-syncer

## Stage 2: Final image ##

FROM gcr.io/distroless/static-debian12

COPY --from=builder /out/canister-otlp-syncer /canister-otlp-syncer

ENTRYPOINT ["/canister-otlp-syncer"]
