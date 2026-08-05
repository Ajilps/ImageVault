FROM node:22-bookworm-slim AS base

RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*

FROM base AS dependencies

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

FROM dependencies AS build

COPY tsconfig.json prisma.config.ts ./
COPY prisma ./prisma
COPY src ./src

# Prisma loads its datasource URL while generating the client, but generation
# does not connect to this placeholder database.
RUN DATABASE_URL=postgresql://build:build@localhost:5432/build npx prisma generate \
    && npm run build

FROM build AS migration

USER node
CMD ["npx", "prisma", "migrate", "deploy"]

FROM base AS production-dependencies

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

FROM base AS runtime

ENV NODE_ENV=production
WORKDIR /app

COPY --from=production-dependencies --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --chown=node:node package.json ./package.json

USER node
EXPOSE 4000

CMD ["node", "dist/server.js"]
