#!/usr/bin/env bash
echo "Deploying Production"

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT}"
pwd

echo "Pulling latest code..."
git reset --hard
git clean -fd
git pull --ff-only

# Services and ports to deploy. Add them as you add services to the docker-compose.yml file.
services=(app1)
ports=(3000)

# Image tags
CURRENT_TAG="current"
PREVIOUS_TAG="previous"

check_health() {
  local port="$1"
  local attempts=30

  for ((i = 1; i <= attempts; i++)); do
    if curl -fsS --max-time 5 "http://127.0.0.1:${port}/health" >/dev/null; then
      return 0
    fi

    sleep 2
  done

  return 1
}

set_image_tag() {
  local tag="$1"
  printf 'IMAGE_TAG=%s\n' "${tag}" > .env.image.local
}

rollback_services() {
  local count="$1"

  echo "Switching compose image tag back to ${PREVIOUS_TAG}..."
  set_image_tag "${PREVIOUS_TAG}"

  for ((k = 0; k <= count; k++)); do
    local service="${services[$k]}"
    echo "Rolling back ${service}..."
    docker compose --env-file .env.image.local up -d --no-deps --force-recreate "${service}"
  done

  for ((k = 0; k <= count; k++)); do
    local service="${services[$k]}"
    local port="${ports[$k]}"

    echo "Verifying rollback health for ${service}..."
    if ! check_health "${port}"; then
      echo "Rollback healthcheck failed for ${service}"
      exit 1
    fi
  done
}

echo "Saving previous image..."
if docker image inspect "tanstart-elysia:${CURRENT_TAG}" >/dev/null 2>&1; then
  docker tag "tanstart-elysia:${CURRENT_TAG}" "tanstart-elysia:${PREVIOUS_TAG}"
fi

GIT_SHA="$(git rev-parse HEAD)"
echo "Building new image (DEPLOYMENT_ID=${GIT_SHA})..."
docker build --progress=plain \
  --build-arg "DEPLOYMENT_ID=${GIT_SHA}" \
  ${SENTRY_AUTH_TOKEN:+--secret id=sentry_auth_token,env=SENTRY_AUTH_TOKEN} \
  -t "tanstart-elysia:${CURRENT_TAG}" .

# Give the OS a moment to reclaim RAM after the build before cold-starting Bun/Nitro
sync || true
sleep 3

echo "Switching compose to image tag ${CURRENT_TAG}..."
set_image_tag "${CURRENT_TAG}"

for i in "${!services[@]}"; do
  service="${services[$i]}"
  port="${ports[$i]}"

  echo "Updating ${service}..."
  docker compose --env-file .env.image.local up -d --no-deps --force-recreate "${service}"

  echo "Waiting for health on ${service}..."
  if check_health "${port}"; then
    echo "${service} is healthy"
  else
    echo "${service} failed healthcheck"

    if docker image inspect "tanstart-elysia:${PREVIOUS_TAG}" >/dev/null 2>&1; then
      rollback_services "${i}"
      echo "Rollback completed"
    else
      echo "No previous image available for rollback"
    fi

    exit 1
  fi
done

echo "Production Deployment complete"
