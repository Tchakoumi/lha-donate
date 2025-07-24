#!/bin/sh

# PostgreSQL Backup Script for LHA Donate
# Runs daily at 2 AM via cron in the postgres-backup container

BACKUP_DIR="/backup"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="lha_donate_backup_${DATE}.sql"
RETENTION_DAYS=${BACKUP_RETENTION_DAYS:-30}

# Create backup directory
mkdir -p ${BACKUP_DIR}

# Log start
echo "$(date): Starting backup: ${BACKUP_FILE}"

# Create backup
PGPASSWORD=${POSTGRES_PASSWORD} pg_dump -h postgres -U ${POSTGRES_USER} -d ${POSTGRES_DB} > ${BACKUP_DIR}/${BACKUP_FILE}

if [ $? -eq 0 ]; then
    echo "$(date): Backup completed successfully: ${BACKUP_FILE}"
    
    # Compress backup
    gzip ${BACKUP_DIR}/${BACKUP_FILE}
    echo "$(date): Backup compressed: ${BACKUP_FILE}.gz"
    
    # Remove old backups
    find ${BACKUP_DIR} -name "lha_donate_backup_*.sql.gz" -mtime +${RETENTION_DAYS} -delete
    echo "$(date): Old backups cleaned up (retention: ${RETENTION_DAYS} days)"
    
    # Log backup size and count
    BACKUP_SIZE=$(du -h ${BACKUP_DIR}/${BACKUP_FILE}.gz | cut -f1)
    BACKUP_COUNT=$(ls -1 ${BACKUP_DIR}/lha_donate_backup_*.sql.gz 2>/dev/null | wc -l)
    echo "$(date): Backup size: ${BACKUP_SIZE}, Total backups: ${BACKUP_COUNT}"
    
    # Test backup integrity (optional)
    if command -v zcat >/dev/null 2>&1; then
        if zcat ${BACKUP_DIR}/${BACKUP_FILE}.gz | head -10 | grep -q "PostgreSQL database dump"; then
            echo "$(date): Backup integrity check passed"
        else
            echo "$(date): WARNING: Backup integrity check failed"
        fi
    fi
else
    echo "$(date): ERROR: Backup failed!"
    exit 1
fi

# Add cron job if not exists
CRON_JOB="0 2 * * * /backup-script.sh >> /var/log/backup.log 2>&1"
if ! crontab -l 2>/dev/null | grep -q "/backup-script.sh"; then
    (crontab -l 2>/dev/null; echo "$CRON_JOB") | crontab -
    echo "$(date): Cron job added for daily backups at 2 AM"
fi