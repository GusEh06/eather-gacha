# Build context must be the REPO ROOT (not apps/api), since this app
# imports type-only declarations from ../../packages/shared which must
# be present in the image. See docker-compose.yml / render.yaml.
FROM oven/bun:1 AS base
WORKDIR /repo

COPY package.json bun.lock ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN bun install --frozen-lockfile

COPY . .

WORKDIR /repo/apps/api
EXPOSE 3001
CMD ["bun", "run", "src/index.ts"]
