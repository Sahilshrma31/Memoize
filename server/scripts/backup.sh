#!/usr/bin/env bash
#
# Back up the Memoize database to a timestamped gzip archive.
#
# Atlas M0 (free tier) has no automated backups, so this is the safety net.
# Works against local mongod or Atlas — it just reads MONGODB_URI.
#
# Usage:
#   ./scripts/backup.sh                 # writes to ./backups
#   BACKUP_DIR=~/memoize-backups ./scripts/backup.sh
#   RETENTION_DAYS=30 ./scripts/backup.sh
#
# Restore with:
#   mongorestore --uri="$MONGODB_URI" --gzip --archive=backups/<file>.gz --drop
#
# Requires mongodump (brew install mongodb-database-tools).

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVER_DIR="$(dirname "$SCRIPT_DIR")"

BACKUP_DIR="${BACKUP_DIR:-$SERVER_DIR/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"

# Load MONGODB_URI from .env if it isn't already exported.
if [ -z "${MONGODB_URI:-}" ] && [ -f "$SERVER_DIR/.env" ]; then
  MONGODB_URI="$(grep -E '^MONGODB_URI=' "$SERVER_DIR/.env" | head -1 | cut -d= -f2-)"
fi

if [ -z "${MONGODB_URI:-}" ]; then
  echo "error: MONGODB_URI is not set (checked env and $SERVER_DIR/.env)" >&2
  exit 1
fi

if ! command -v mongodump >/dev/null 2>&1; then
  echo "error: mongodump not found. Install with: brew install mongodb-database-tools" >&2
  exit 1
fi

mkdir -p "$BACKUP_DIR"
ARCHIVE="$BACKUP_DIR/memoize-$(date +%Y%m%d-%H%M%S).gz"

echo "Backing up to $ARCHIVE"
mongodump --uri="$MONGODB_URI" --gzip --archive="$ARCHIVE" --quiet

SIZE="$(du -h "$ARCHIVE" | cut -f1)"
echo "Wrote $ARCHIVE ($SIZE)"

# Prune old archives.
DELETED=$(find "$BACKUP_DIR" -name 'memoize-*.gz' -type f -mtime +"$RETENTION_DAYS" -print -delete | wc -l | tr -d ' ')
if [ "$DELETED" -gt 0 ]; then
  echo "Pruned $DELETED backup(s) older than ${RETENTION_DAYS} days"
fi

echo "Backups on disk: $(find "$BACKUP_DIR" -name 'memoize-*.gz' -type f | wc -l | tr -d ' ')"
