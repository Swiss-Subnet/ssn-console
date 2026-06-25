## Stage 1: Build the static binary ##
# Build context is services/ (the Go workspace root): metrics-proxy depends on the
# sibling httpsvc and canister-clients modules via replace directives, so all three
# must be in context. canister-clients carries its goic-generated bindings, which
# `just services::gen` produces on the host before this build (goic is not run here).
# GOWORK=off ignores go.work (which lists modules we don't copy); siblings resolve
# via metrics-proxy's replace directives instead.

FROM docker.io/library/golang:1.26 AS builder

WORKDIR /src
ENV CGO_ENABLED=0 GOOS=linux GOWORK=off

COPY metrics-proxy/ ./metrics-proxy/
COPY httpsvc/ ./httpsvc/
COPY canister-clients/ ./canister-clients/

RUN --mount=type=cache,target=/root/.cache/go-build \
  --mount=type=cache,target=/go/pkg/mod \
  go build -C metrics-proxy -trimpath -ldflags='-s -w' -o /out/metrics-proxy ./cmd/metrics-proxy

## Stage 2: Final image ##

FROM gcr.io/distroless/static-debian12

COPY --from=builder /out/metrics-proxy /metrics-proxy

ENTRYPOINT ["/metrics-proxy"]

EXPOSE 3001
