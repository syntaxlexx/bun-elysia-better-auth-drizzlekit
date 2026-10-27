# syntax=docker/dockerfile:1

FROM oven/bun:1 AS base
WORKDIR /app

# Install dependencies first for better caching
FROM base AS deps
COPY package.json bun.lock ./
# prepare runs `vp config`, which installs git hooks. The Bun image has no git,
# and hooks are unused in this build. VP_GIT_HOOKS=0 makes that step a no-op.
RUN VP_GIT_HOOKS=0 bun install --frozen-lockfile

# Build stage
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN bun run build

# Production stage
FROM oven/bun:1-slim AS production
WORKDIR /app
ENV NODE_ENV=production
# Git SHA from deploy scripts (`--build-arg DEPLOYMENT_ID=$(git rev-parse HEAD)`)
ARG DEPLOYMENT_ID=development
ENV DEPLOYMENT_ID=$DEPLOYMENT_ID

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates curl wget netcat-openbsd \
  && rm -rf /var/lib/apt/lists/*

# Nitro output includes `.output/server/node_modules` (production deps only); no root node_modules needed
COPY --from=build /app/.output ./.output

EXPOSE 3000

# Match package.json "serve": preload Sentry instrumentation when present
CMD ["bun", ".output/server/index.mjs"]
