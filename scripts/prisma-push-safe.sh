#!/usr/bin/env bash
set -euo pipefail

echo "This script will backup the database before running 'npx prisma db push'."

SUGGESTED_BACKUP="./scripts/db-backup.sh"

if [ ! -f "$SUGGESTED_BACKUP" ]; then
  echo "Backup script not found: $SUGGESTED_BACKUP" >&2
  echo "Aborting to avoid accidental schema changes on production db." >&2
  exit 1
fi

read -r -p "Proceed to create backup now? [y/N] " answer
case "$answer" in
  [yY][eE][sS]|[yY])
    bash "$SUGGESTED_BACKUP"
    ;;
  *)
    echo "Backup cancelled. Aborting prisma db push."
    exit 1
    ;;
esac

read -r -p "Run 'npx prisma db push' now? This may alter the remote schema. Confirm [y/N] " confirm
case "$confirm" in
  [yY][eE][sS]|[yY])
    npx prisma db push
    ;;
  *)
    echo "Operation cancelled."
    exit 1
    ;;
esac
