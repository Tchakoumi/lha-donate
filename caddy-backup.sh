#!/bin/sh
set -e

# Caddy Certificate Backup Script for LHA Donate
# This script backs up Caddy's data directory including SSL certificates

# Configuration
BACKUP_DIR="/backup/caddy"
CADDY_DATA_DIR="/data"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="caddy_backup_${TIMESTAMP}.tar.gz"
RETENTION_DAYS=${BACKUP_RETENTION_DAYS:-30}

# Ensure backup directory exists
mkdir -p "${BACKUP_DIR}"

# Logging function
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log "🚀 Starting Caddy certificate backup..."

# Check if Caddy data directory exists and has certificates
if [ ! -d "${CADDY_DATA_DIR}/caddy/certificates" ]; then
    log "⚠️  No certificates directory found, skipping backup"
    exit 0
fi

# Create backup
log "📦 Creating backup of Caddy data..."
if tar -czf "${BACKUP_DIR}/${BACKUP_FILE}" -C "${CADDY_DATA_DIR}" .; then
    log "✅ Backup created successfully: ${BACKUP_FILE}"
    
    # Get backup size
    BACKUP_SIZE=$(du -h "${BACKUP_DIR}/${BACKUP_FILE}" | cut -f1)
    log "📊 Backup size: ${BACKUP_SIZE}"
else
    log "❌ Backup creation failed"
    exit 1
fi

# Clean up old backups
if [ "${RETENTION_DAYS}" -gt 0 ]; then
    log "🧹 Cleaning up backups older than ${RETENTION_DAYS} days..."
    find "${BACKUP_DIR}" -name "caddy_backup_*.tar.gz" -type f -mtime +${RETENTION_DAYS} -delete
    log "✨ Old backups cleaned up"
fi

# Count remaining backups
BACKUP_COUNT=$(ls -1 "${BACKUP_DIR}"/caddy_backup_*.tar.gz 2>/dev/null | wc -l)
log "📈 Total backups: ${BACKUP_COUNT}"

log "🎉 Caddy backup completed successfully"