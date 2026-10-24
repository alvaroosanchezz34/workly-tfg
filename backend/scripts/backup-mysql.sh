#!/usr/bin/env bash
# Copia de seguridad de MySQL con retención.
# Uso: DB_HOST DB_USER DB_PASSWORD DB_NAME y, si quieres, BACKUP_DIR y BACKUP_RETENTION_DAYS.
set -euo pipefail

: "${DB_HOST:=localhost}"
: "${DB_PORT:=3306}"
: "${DB_USER:?Falta DB_USER}"
: "${DB_PASSWORD:?Falta DB_PASSWORD}"
: "${DB_NAME:?Falta DB_NAME}"
: "${BACKUP_DIR:=./backups}"
: "${BACKUP_RETENTION_DAYS:=30}"

mkdir -p "$BACKUP_DIR"
stamp="$(date -u +%Y%m%dT%H%M%SZ)"
file="${BACKUP_DIR}/${DB_NAME}-${stamp}.sql.gz"

mysqldump \
  --host="$DB_HOST" \
  --port="$DB_PORT" \
  --user="$DB_USER" \
  --password="$DB_PASSWORD" \
  --single-transaction \
  --routines \
  --triggers \
  "$DB_NAME" | gzip -c > "$file"

find "$BACKUP_DIR" -type f -name "${DB_NAME}-*.sql.gz" -mtime +"$BACKUP_RETENTION_DAYS" -delete
echo "Copia guardada en $file"
echo "Se conservan $BACKUP_RETENTION_DAYS días."
