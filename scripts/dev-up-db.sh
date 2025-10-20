#!/usr/bin/env bash
set -e

echo "Starting local MariaDB for development..."
# Load .env.local if present
if [ -f .env.local ]; then
  export $(grep -v '^#' .env.local | xargs)
fi

DB_COMPOSE_FILE=docker-compose.dev.yml

docker-compose -f ${DB_COMPOSE_FILE} up -d mariadb

echo "MariaDB started. Waiting for healthy status..."

# Wait for healthcheck to pass
until docker inspect --format='{{.State.Health.Status}}' asesoria-mariadb-dev 2>/dev/null | grep -q healthy; do
  echo "Waiting for mariadb container to become healthy..."
  sleep 2
done

echo "MariaDB is healthy and ready."

echo "You can now set DATABASE_URL in your .env or .env.local to point to:"
echo "mysql://$DB_USER:$DB_PASSWORD@127.0.0.1:3306/$DB_DATABASE?socket_timeout=60&connect_timeout=60"
