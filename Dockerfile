# syntax=docker/dockerfile:1

FROM oven/bun:1 AS deps
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --ignore-scripts

FROM deps AS build
COPY . .
ENV DATABASE_URL=postgres://postgres:postgres@127.0.0.1:5432/elysia_tanstart
RUN bun run build

FROM deps AS migrate
COPY . .
CMD ["bun", "run", "db:migrate"]

FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3000
RUN groupadd --system --gid 1001 app \
  && useradd --uid 1001 --gid app --home-dir /app --shell /usr/sbin/nologin app \
  && mkdir -p /app/storage/avatars
COPY --from=build --chown=app:app /app/.output ./.output
COPY docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
EXPOSE 3000
ENTRYPOINT ["/entrypoint.sh"]
