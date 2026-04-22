FROM docker.io/oven/bun:1 AS build

WORKDIR /app

COPY package.json package.json
COPY bun.lock bun.lock

# copy all package.json files to "cache" the `node_modules`
COPY /src/backend-api/package.json ./src/backend-api/package.json
COPY /src/backend-tests/package.json ./src/backend-tests/package.json
COPY /src/canister-history-api/package.json ./src/canister-history-api/package.json
COPY /src/canister-history-tests/package.json ./src/canister-history-tests/package.json
COPY /src/cycles-monitor-api/package.json ./src/cycles-monitor-api/package.json
COPY /src/cycles-monitor-tests/package.json ./src/cycles-monitor-tests/package.json
COPY /src/frontend/package.json ./src/frontend/package.json
COPY /src/management-canister/package.json ./src/management-canister/package.json
COPY /src/offchain-service/package.json ./src/offchain-service/package.json
COPY /src/scripts/package.json ./src/scripts/package.json
COPY /src/test-utils/package.json ./src/test-utils/package.json

RUN bun i --frozen-lockfile

COPY /src/offchain-service ./src/offchain-service

ENV NODE_ENV=production

RUN bun build \
  --compile \
	--minify-whitespace \
	--minify-syntax \
	--outfile server \
	./src/offchain-service/src/index.ts

FROM gcr.io/distroless/base

WORKDIR /app

COPY --from=build /app/server server

ENV NODE_ENV=production

CMD ["./server"]

EXPOSE 3000
