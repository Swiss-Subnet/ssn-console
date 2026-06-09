## Stage 1: Prune the workspace ##

FROM docker.io/oven/bun:1 AS pruner

WORKDIR /app
ENV NODE_ENV=production

COPY . .
RUN TURBO_TELEMETRY_DISABLED=1 && \
  TURBO_VERSION=$(bun -e "console.log(require('./package.json').devDependencies.turbo)") && \
  bunx turbo@$TURBO_VERSION prune canister-otlp-syncer --docker

## Stage 2: Install dependencies ##

FROM docker.io/oven/bun:1 AS installer

WORKDIR /app
ENV NODE_ENV=production

COPY --from=pruner /app/out/json/ .

# install node modules using shared bun cache
RUN --mount=type=cache,id=bun-cache,target=/root/.bun/install/cache \
  bun install --frozen-lockfile

## Stage 3: Build the application ##

FROM docker.io/oven/bun:1 AS builder

WORKDIR /app
ENV NODE_ENV=production

COPY --from=pruner /app/out/full/ .
COPY --from=installer /app/ .
COPY src/canister-utils/error.did ./src/canister-utils/error.did

RUN TURBO_TELEMETRY_DISABLED=1 && \
  bun turbo -F canister-otlp-syncer build

## Stage 4: Final Image ##

FROM gcr.io/distroless/base

WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app .

CMD ["./src/canister-otlp-syncer/dist/main"]
