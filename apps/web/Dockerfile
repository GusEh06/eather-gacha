# Build context must be the REPO ROOT (not apps/web), since this app
# imports type-only declarations from ../../../packages/shared which
# must be present in the image. See docker-compose.yml / render.yaml.
FROM oven/bun:1 AS base
WORKDIR /repo

COPY package.json bun.lock ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN bun install --frozen-lockfile

COPY . .

WORKDIR /repo/apps/web

# Produccion: build estatico + servidor SSR; en dev (docker-compose)
# el bind-mount sobreescribe esto y corre `bun run dev` en su lugar.
ARG NODE_ENV=production
RUN if [ "$NODE_ENV" = "production" ]; then bun run build; fi

EXPOSE 3000
CMD ["sh", "-c", "if [ \"$NODE_ENV\" = \"production\" ]; then bun run preview --host 0.0.0.0 --port 3000; else bun run dev; fi"]
