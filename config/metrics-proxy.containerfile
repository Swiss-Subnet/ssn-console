## Stage 1: Build the static binary ##
# Build context is services/ (the Go workspace root): metrics-proxy depends on the
# sibling httpsvc module via a replace directive, so both modules must be in context.
# GOWORK=off ignores go.work (which lists modules we don't copy); httpsvc resolves
# via metrics-proxy's replace ../httpsvc directive instead.

FROM docker.io/library/golang:1.25 AS builder

WORKDIR /src
ENV CGO_ENABLED=0 GOOS=linux GOWORK=off

COPY metrics-proxy/ ./metrics-proxy/
COPY httpsvc/ ./httpsvc/

RUN --mount=type=cache,target=/root/.cache/go-build \
  --mount=type=cache,target=/go/pkg/mod \
  go build -C metrics-proxy -trimpath -ldflags='-s -w' -o /out/metrics-proxy ./cmd/metrics-proxy

## Stage 2: Final image ##

FROM gcr.io/distroless/static-debian12

COPY --from=builder /out/metrics-proxy /metrics-proxy

ENTRYPOINT ["/metrics-proxy"]

EXPOSE 3001
