#!/usr/bin/env bash
set -euo pipefail

OUT_DIR=backups
mkdir -p "$OUT_DIR"

# Load .env or .env.local if present
if [ -f .env.local ]; then
  # shellcheck disable=SC2046
  export $(grep -v '^#' .env.local | xargs) || true
fi
if [ -f .env ]; then
  # shellcheck disable=SC2046
  export $(grep -v '^#' .env | xargs) || true
fi

if [ -z "${DATABASE_URL:-}" ]; then
  echo "ERROR: DATABASE_URL no está definida. Exporta DATABASE_URL o coloca en .env(.local)." >&2
  exit 1
fi

DBURL=${DATABASE_URL#"}
DBURL=${DBURL%"}

# Parse mysql://user:pass@host:port/dbname?params
# Using parameter expansion / sed to extract components
USER=$(echo "$DBURL" | sed -E 's#mysql://([^:]+):.*@.*#\1#')
PASS=$(echo "$DBURL" | sed -E 's#mysql://[^:]+:([^@]+)@.*#\1#')
HOST=$(echo "$DBURL" | sed -E 's#mysql://[^@]+@([^:/?]+).*#\1#')
PORT=$(echo "$DBURL" | sed -E 's#mysql://[^@]+@[^:/?]+:([0-9]+).*#\1#' )
DBNAME=$(echo "$DBURL" | sed -E 's#.*/([^/?]+)(\?.*)?$#\1#')

# defaults
: ${PORT:=3306}

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
OUT_FILE="$OUT_DIR/db_backup_${TIMESTAMP}.sql"

echo "Backing up database '$DBNAME' from $HOST:$PORT as $USER to $OUT_FILE"

do_mysqldump() {
  if command -v mysqldump >/dev/null 2>&1; then
    mysqldump -h "$HOST" -P "$PORT" -u "$USER" -p"$PASS" "$DBNAME" > "$OUT_FILE"
    return $?
  fi
  return 2
}

do_docker_mysqldump() {
  if command -v docker >/dev/null 2>&1; then
    docker run --rm --network host -e MYSQL_PWD="$PASS" mysql:8 sh -c "exec mysqldump -h '$HOST' -P $PORT -u '$USER' '$DBNAME'" > "$OUT_FILE"
    return $?
  fi
  return 3
}

if do_mysqldump; then
  echo "Backup completed: $OUT_FILE"
  exit 0
fi

echo "mysqldump not available locally, trying with docker..."

if do_docker_mysqldump; then
  echo "Backup completed via docker: $OUT_FILE"
  exit 0
fi

echo "ERROR: Could not perform backup. Install 'mysqldump' (mysql client) or Docker." >&2
exit 1
