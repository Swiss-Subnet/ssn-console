FROM docker.io/oven/bun:1 AS build

RUN apt-get update && apt-get install -y curl \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs

WORKDIR /app
ENV NODE_ENV=production

COPY package.json package.json
COPY bun.lock bun.lock

# copy all package.json files to "cache" the `node_modules`
COPY /src/backend-api/package.json ./src/backend-api/package.json
COPY /src/backend-tests/package.json ./src/backend-tests/package.json
COPY /src/canister-history-api/package.json ./src/canister-history-api/package.json
COPY /src/canister-history-tests/package.json ./src/canister-history-tests/package.json
COPY /src/canister-otlp-syncer/package.json ./src/canister-otlp-syncer/package.json
COPY /src/cycles-monitor-api/package.json ./src/cycles-monitor-api/package.json
COPY /src/cycles-monitor-tests/package.json ./src/cycles-monitor-tests/package.json
COPY /src/frontend/package.json ./src/frontend/package.json
COPY /src/management-canister/package.json ./src/management-canister/package.json
COPY /src/offchain-service/package.json ./src/offchain-service/package.json
COPY /src/scripts/package.json ./src/scripts/package.json
COPY /src/test-utils/package.json ./src/test-utils/package.json

RUN bun i --frozen-lockfile

COPY turbo.json ./
COPY /src/cycles-monitor-api ./src/cycles-monitor-api
COPY /src/canister-utils ./src/canister-utils
COPY /src/canister-otlp-syncer ./src/canister-otlp-syncer

RUN bun turbo -F canister-otlp-syncer build

FROM gcr.io/distroless/base

WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/src/canister-otlp-syncer/dist/main main

CMD ["./main"]
