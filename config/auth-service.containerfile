## Stage 1: Build the static binary ##
# Build context is services/ (the Go workspace root): auth-service depends on the
# sibling httpsvc module via a replace directive, so both modules must be in context.
# GOWORK=off ignores go.work (which lists modules we don't copy); httpsvc resolves
# via auth-service's replace ../httpsvc directive instead.

FROM docker.io/library/golang:1.25 AS builder

WORKDIR /src
ENV CGO_ENABLED=0 GOOS=linux GOWORK=off

COPY auth-service/ ./auth-service/
COPY httpsvc/ ./httpsvc/

RUN --mount=type=cache,target=/root/.cache/go-build \
  --mount=type=cache,target=/go/pkg/mod \
  go build -C auth-service -trimpath -ldflags='-s -w' -o /out/auth-service ./cmd/auth-service

## Stage 2: Final image ##

FROM gcr.io/distroless/static-debian12

COPY --from=builder /out/auth-service /auth-service

ENTRYPOINT ["/auth-service"]

EXPOSE 3000
