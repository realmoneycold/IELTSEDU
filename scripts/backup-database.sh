#!/bin/bash

# ==============================================================================
# Database Backup Script for IELTSPRACTICE
# ==============================================================================

# Configuration - Defaults for local development
BACKUP_DIR="/home/ahror/Documents/IELTSPRACTICE2/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/db_$TIMESTAMP.sql"

# Load environment variables if .env exists
if [ -f "/home/ahror/Documents/IELTSPRACTICE2/.env" ]; then
    export $(grep -v '^#' /home/ahror/Documents/IELTSPRACTICE2/.env | xargs)
fi

# Determine connection parameters from DATABASE_URL if available
# DATABASE_URL="postgresql://user:password@localhost:5432/ieltspractice?schema=public"
if [[ $DATABASE_URL =~ postgresql://([^:]+):([^@]+)@([^:/]+):([0-9]+)/([^?]+) ]]; then
    DB_USER="${BASH_REMATCH[1]}"
    DB_PASS="${BASH_REMATCH[2]}"
    DB_HOST="${BASH_REMATCH[3]}"
    DB_PORT="${BASH_REMATCH[4]}"
    DB_NAME="${BASH_REMATCH[5]}"
else
    # Fallback to defaults or environment variables
    DB_USER=${DB_USER:-"postgres"}
    DB_PASS=${DB_PASS:-""}
    DB_HOST=${DB_HOST:-"localhost"}
    DB_PORT=${DB_PORT:-"5432"}
    DB_NAME=${DB_NAME:-"ieltspractice"}
fi

# Ensure backup directory exists
mkdir -p "$BACKUP_DIR"

echo "⏳ Starting backup of database '$DB_NAME' at $(date)..."

# Execute pg_dump
PGPASSWORD="$DB_PASS" pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$DB_NAME" > "$BACKUP_FILE"

# Check if backup was successful
if [ $? -eq 0 ]; then
    echo "✅ Backup created successfully: $BACKUP_FILE"
    # Optional: compress the backup to save space
    gzip "$BACKUP_FILE"
    echo "📦 Compressed backup: ${BACKUP_FILE}.gz"
    
    # Keep only last 30 days
    find "$BACKUP_DIR" -name "*.sql.gz" -mtime +30 -delete
    echo "🧹 Old backups cleaned up (older than 30 days)"
else
    echo "❌ Backup failed!"
    exit 1
fi
