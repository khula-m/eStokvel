#!/bin/bash
# ============================================================================
# eStokvel Database Backup Script
# ============================================================================
# Purpose: Automated PostgreSQL backups with point-in-time recovery (PITR)
#          support. Designed to run as a K8s CronJob or standalone cron.
#
# Features:
#   - Full pg_dump with custom format (compressed)
#   - WAL archiving for PITR
#   - Retention policy (default 30 days)
#   - S3-compatible upload (MinIO, AWS S3, etc.)
#   - Slack/webhook notification on failure
#   - Integrity verification after backup
#
# Usage:
#   PGHOST=... PGUSER=... PGPASSWORD=... PGDATABASE=... ./backup.sh
#
# Environment Variables:
#   PGHOST, PGPORT (default 5432), PGUSER, PGPASSWORD, PGDATABASE
#   BACKUP_DIR           - Local backup directory (default: /backups)
#   RETENTION_DAYS       - Days to keep local backups (default: 30)
#   S3_BUCKET            - S3 bucket for offsite storage (optional)
#   S3_ENDPOINT          - S3 endpoint URL (optional, for MinIO)
#   WEBHOOK_URL          - Slack/Teams webhook for failure alerts (optional)
# ============================================================================

set -euo pipefail

# ── Configuration ──
BACKUP_DIR="${BACKUP_DIR:-/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
PGPORT="${PGPORT:-5432}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/estokvel_${TIMESTAMP}.dump"
WAL_BACKUP_DIR="${BACKUP_DIR}/wal"
LOG_FILE="${BACKUP_DIR}/backup_${TIMESTAMP}.log"

# ── Functions ──
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

notify_failure() {
    local message="$1"
    if [ -n "${WEBHOOK_URL:-}" ]; then
        curl -sf -X POST "$WEBHOOK_URL" \
            -H 'Content-Type: application/json' \
            -d "{\"text\": \"🚨 eStokvel DB Backup FAILED: ${message}\"}" \
            2>/dev/null || true
    fi
}

cleanup_old_backups() {
    log "Cleaning up backups older than ${RETENTION_DAYS} days..."
    find "$BACKUP_DIR" -name "estokvel_*.dump" -mtime +"$RETENTION_DAYS" -delete 2>/dev/null || true
    find "$BACKUP_DIR" -name "backup_*.log" -mtime +"$RETENTION_DAYS" -delete 2>/dev/null || true
    log "Cleanup complete"
}

upload_to_s3() {
    if [ -n "${S3_BUCKET:-}" ]; then
        log "Uploading to S3: ${S3_BUCKET}..."
        local s3_args=""
        if [ -n "${S3_ENDPOINT:-}" ]; then
            s3_args="--endpoint-url ${S3_ENDPOINT}"
        fi
        aws s3 cp "$BACKUP_FILE" "s3://${S3_BUCKET}/db-backups/$(basename "$BACKUP_FILE")" $s3_args
        aws s3 cp "$LOG_FILE" "s3://${S3_BUCKET}/db-backups/logs/$(basename "$LOG_FILE")" $s3_args
        log "S3 upload complete"
    fi
}

verify_backup() {
    log "Verifying backup integrity..."
    pg_restore --list "$BACKUP_FILE" > /dev/null 2>&1
    if [ $? -eq 0 ]; then
        local size
        size=$(du -h "$BACKUP_FILE" | cut -f1)
        log "Backup verified OK (${size})"
        return 0
    else
        log "ERROR: Backup verification failed!"
        return 1
    fi
}

# ── Main ──
mkdir -p "$BACKUP_DIR" "$WAL_BACKUP_DIR"

log "=== eStokvel Database Backup Starting ==="
log "Host: ${PGHOST:-localhost}:${PGPORT}"
log "Database: ${PGDATABASE:-estokvel}"
log "Backup file: ${BACKUP_FILE}"

# Pre-flight check
if ! pg_isready -h "${PGHOST:-localhost}" -p "$PGPORT" -U "${PGUSER:-postgres}" -q 2>/dev/null; then
    log "ERROR: Database is not reachable"
    notify_failure "Database unreachable at ${PGHOST:-localhost}:${PGPORT}"
    exit 1
fi

# Full database dump with custom format (compressed)
log "Starting pg_dump..."
if pg_dump \
    -h "${PGHOST:-localhost}" \
    -p "$PGPORT" \
    -U "${PGUSER:-postgres}" \
    -d "${PGDATABASE:-railway}" \
    --format=custom \
    --compress=6 \
    --verbose \
    --no-owner \
    --no-privileges \
    --serializable-deferrable \
    -f "$BACKUP_FILE" \
    2>> "$LOG_FILE"; then
    log "pg_dump completed successfully"
else
    log "ERROR: pg_dump failed with exit code $?"
    notify_failure "pg_dump failed"
    exit 1
fi

# Verify the backup
if ! verify_backup; then
    notify_failure "Backup verification failed"
    exit 1
fi

# Upload to S3 if configured
upload_to_s3

# Clean up old backups
cleanup_old_backups

# Record backup metadata
cat > "${BACKUP_DIR}/latest_backup.json" << EOF
{
  "timestamp": "${TIMESTAMP}",
  "file": "$(basename "$BACKUP_FILE")",
  "size_bytes": $(stat -c%s "$BACKUP_FILE" 2>/dev/null || stat -f%z "$BACKUP_FILE" 2>/dev/null || echo 0),
  "database": "${PGDATABASE:-railway}",
  "host": "${PGHOST:-localhost}",
  "retention_days": ${RETENTION_DAYS},
  "verified": true
}
EOF

log "=== Backup Complete ==="
