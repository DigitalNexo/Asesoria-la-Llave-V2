#!/usr/bin/env bash
set -euo pipefail

DB_COMPOSE_FILE=docker-compose.dev.yml

COMPOSE_CMD=""
if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
  COMPOSE_CMD="docker compose"
elif command -v docker-compose >/dev/null 2>&1; then
  COMPOSE_CMD="docker-compose"
else
  echo "ERROR: Docker or docker-compose not found." >&2
  exit 127
fi

${COMPOSE_CMD} -f "${DB_COMPOSE_FILE}" down

echo "Stopped local MariaDB dev stack."
