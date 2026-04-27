# syntax=docker/dockerfile:1.6

# --- Stage 1: install deps --------------------------------------------------
FROM node:20-slim AS deps
WORKDIR /app

# Build tools for native modules (better-sqlite3)
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ ca-certificates \
 && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json* ./
RUN npm ci --no-audit --no-fund

# --- Stage 2: build ---------------------------------------------------------
FROM node:20-slim AS builder
WORKDIR /app

ARG BUILD_SHA
ARG BUILD_DATE
ENV NEXT_PUBLIC_BUILD_SHA=$BUILD_SHA
ENV NEXT_PUBLIC_BUILD_DATE=$BUILD_DATE

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npm run build

# --- Stage 3: runtime -------------------------------------------------------
FROM node:20-slim AS runtime
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    wget ca-certificates \
 && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV PORT=3300
ENV HOSTNAME=0.0.0.0

ARG BUILD_SHA
ARG BUILD_DATE
ENV NEXT_PUBLIC_BUILD_SHA=$BUILD_SHA
ENV NEXT_PUBLIC_BUILD_DATE=$BUILD_DATE

# Standalone output includes its own minimal node_modules
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Seed catalog files at /app/catalog-seed — outside the ./data volume mount so they
# are never shadowed when docker-compose binds ./data:/app/data on a new server.
COPY --from=builder /app/data/seed ./catalog-seed
# Non-catalog static data
COPY --from=builder /app/data/instances.json ./data/instances.json
COPY --from=builder /app/data/throughput.json ./data/throughput.json
COPY --from=builder /app/data/explain ./data/explain

# Migration files (applied at startup via instrumentation.ts)
COPY --from=builder /app/lib/db/migrations ./lib/db/migrations

# DB + uploads live on volumes — create mount points
RUN mkdir -p /app/data /app/uploads

EXPOSE 3300

CMD ["node", "server.js"]
