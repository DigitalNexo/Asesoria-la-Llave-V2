#!/usr/bin/env bash
# Wrapper to run the TypeScript archiver with correct NODE_ENV and env
# Usage: ./scripts/prepare-archive.sh
set -euo pipefail

echo "Preparing to archive candidate tables (read-only copies to archive_*)"

# Ensure tsx is available
if ! command -v npx &> /dev/null; then
  echo "npx not found; please install Node.js/npm"
  exit 1
fi

npx tsx scripts/db-archive.ts

echo "Archiving script completed. Check reports/ for archive-report-*.json"
