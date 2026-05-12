# Build the Go binary in a full toolchain image, then ship just the static
# binary in distroless. Build context is services/auth-service/ so unrelated
# repo churn (frontend, canisters) doesn't bust the layer cache.

FROM docker.io/library/golang:1.25 AS builder

WORKDIR /src

COPY go.mod go.sum ./
RUN go mod download

COPY . .

RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build \
    -trimpath -ldflags="-s -w" \
    -o /out/auth-service ./cmd/auth-service

FROM gcr.io/distroless/static-debian12:nonroot

COPY --from=builder /out/auth-service /usr/local/bin/auth-service

USER nonroot:nonroot
EXPOSE 3000
ENTRYPOINT ["/usr/local/bin/auth-service"]
