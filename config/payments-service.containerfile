## Stage 1: Build the static binary ##
# Build context is services/. GOWORK=off ignores go.work (which lists modules
# not in context); this module is self-contained.

FROM docker.io/library/golang:1.25 AS builder

WORKDIR /src
ENV CGO_ENABLED=0 GOOS=linux GOWORK=off

COPY payments-service/ ./payments-service/

RUN --mount=type=cache,target=/root/.cache/go-build \
  --mount=type=cache,target=/go/pkg/mod \
  go build -C payments-service -trimpath -ldflags='-s -w' -o /out/payments-service ./cmd/payments-service

## Stage 2: Final image ##

FROM gcr.io/distroless/static-debian12

COPY --from=builder /out/payments-service /payments-service

ENTRYPOINT ["/payments-service"]

EXPOSE 3001
