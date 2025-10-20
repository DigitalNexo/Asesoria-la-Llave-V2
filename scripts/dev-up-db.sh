done
#!/usr/bin/env bash
set -euo pipefail

echo "Starting local MariaDB for development..."
# Load .env.local if present
if [ -f .env.local ]; then
  # shellcheck disable=SC2046
  export $(grep -v '^#' .env.local | xargs)
fi

DB_COMPOSE_FILE=docker-compose.dev.yml

# Prefer 'docker compose' (v2) but fall back to 'docker-compose'
COMPOSE_CMD=""
if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
  COMPOSE_CMD="docker compose"
elif command -v docker-compose >/dev/null 2>&1; then
  COMPOSE_CMD="docker-compose"
else
  echo "\nERROR: Docker or docker-compose not found.\n" >&2
  echo "Please install Docker Desktop (macOS) or Docker Engine + Compose, then retry." >&2
  exit 127
fi

echo "Using compose command: $COMPOSE_CMD"

${COMPOSE_CMD} -f "${DB_COMPOSE_FILE}" up -d mariadb

echo "MariaDB started. Waiting for healthy status..."

# Wait for healthcheck to pass (container name: asesoria-mariadb-dev)
until ${COMPOSE_CMD} -f "${DB_COMPOSE_FILE}" ps --services --filter "status=running" | grep -q mariadb || \
      docker inspect --format='{{.State.Health.Status}}' asesoria-mariadb-dev 2>/dev/null | grep -q healthy; do
  echo "Waiting for mariadb container to become healthy..."
  sleep 2
done

echo "MariaDB is healthy and ready."

echo "You can now set DATABASE_URL in your .env or .env.local to point to:"
echo "mysql://${DB_USER}:${DB_PASSWORD}@127.0.0.1:3306/${DB_DATABASE}?socket_timeout=60&connect_timeout=60"
