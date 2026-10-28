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

# --env-file replaces the project .env. Pass both, or ${APP_PORT:-3000}
# interpolates to 3000 and the process never listens on the port in .env.
compose() {
  docker compose --env-file .env --env-file .env.image.local "$@"
}

read_port() {
  local key="$1"
  local fallback="$2"
  local raw=""

  if [[ -f .env ]]; then
    raw="$(grep -E "^${key}=" .env | tail -n 1 || true)"
    raw="${raw#*=}"
    raw="${raw//\"/}"
    raw="${raw//\'/}"
    raw="${raw//$'\r'/}"
    raw="${raw%%#*}"
    raw="${raw// /}"
  fi

  if [[ -z "${raw}" ]]; then
    printf '%s' "${fallback}"
  else
    printf '%s' "${raw}"
  fi
}

# Services and ports to deploy. Add them as you add services to the docker-compose.yml file.
services=(app1)
ports=("$(read_port APP_PORT 3000)")

# Image tags
CURRENT_TAG="current"
PREVIOUS_TAG="previous"

check_health() {
  local port="$1"
  local attempts=30
  local i

  for ((i = 1; i <= attempts; i++)); do
    if curl -fsS --max-time 5 "http://127.0.0.1:${port}/api/ready" >/dev/null; then
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
  local last="$1"
  local k service port

  if (( last < 0 || last >= ${#services[@]} )); then
    echo "Rollback index ${last} is outside the service list"
    exit 1
  fi

  echo "Switching compose image tag back to ${PREVIOUS_TAG}..."
  set_image_tag "${PREVIOUS_TAG}"

  for ((k = 0; k <= last; k++)); do
    service="${services[$k]}"
    echo "Rolling back ${service}..."
    compose up -d --no-deps --force-recreate "${service}"
  done

  for ((k = 0; k <= last; k++)); do
    service="${services[$k]}"
    port="${ports[$k]}"

    echo "Verifying rollback health for ${service} on port ${port}..."
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

echo "Health checks will use ports: ${ports[*]}"

for index in "${!services[@]}"; do
  service="${services[$index]}"
  port="${ports[$index]}"

  echo "Updating ${service} on port ${port}..."
  compose up -d --no-deps --force-recreate "${service}"

  echo "Waiting for health on ${service} (http://127.0.0.1:${port}/api/ready)..."
  if check_health "${port}"; then
    echo "${service} is healthy"
  else
    echo "${service} failed healthcheck"

    if docker image inspect "tanstart-elysia:${PREVIOUS_TAG}" >/dev/null 2>&1; then
      rollback_services "${index}"
      echo "Rollback completed"
    else
      echo "No previous image available for rollback"
    fi

    exit 1
  fi
done

echo "Production Deployment complete"
