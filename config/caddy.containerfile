# Builder runs on the native build arch ($BUILDPLATFORM) to avoid QEMU; xcaddy
# cross-compiles to the target arch via GOARCH. Without this, a --platform=amd64
# build on an arm64 host emulates the whole xcaddy compile (very slow).
FROM --platform=$BUILDPLATFORM docker.io/library/caddy:2-builder-alpine AS builder

ARG TARGETOS
ARG TARGETARCH
ENV GOOS=$TARGETOS GOARCH=$TARGETARCH

RUN xcaddy build \
  --with github.com/caddy-dns/cloudflare

FROM docker.io/library/caddy:2-alpine

COPY --from=builder /usr/bin/caddy /usr/bin/caddy
