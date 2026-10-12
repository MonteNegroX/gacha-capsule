# Worker image. The website stays on Vercel.
# Pokemon worker: node --import tsx scripts/capsule-worker.ts
# Rip Cars worker: node --import tsx scripts/ripcars-worker.ts
FROM node:22-bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@11.24.0 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY prisma ./prisma
RUN pnpm install --frozen-lockfile

COPY tsconfig.json ./
COPY scripts ./scripts
COPY lib ./lib
RUN DATABASE_URL="postgresql://build:build@127.0.0.1:5432/build" pnpm exec prisma generate

WORKDIR /bot
COPY opener/package.json opener/package-lock.json ./
RUN npm install
COPY opener/tsconfig.json ./tsconfig.json
COPY opener/src ./src

WORKDIR /app
ENV GACHA_BOT_DIR=/bot
ENV NODE_ENV=production

CMD ["node", "--import", "tsx", "scripts/capsule-worker.ts"]
