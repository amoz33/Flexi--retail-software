#!/usr/bin/env bash
set -euo pipefail

# import_sql.sh
# Usage:
# 1) With local mysql client:
#    DB_USER=root DB_PASS=secret DB_NAME=flexi_retail_new ./import_sql.sh
# 2) With Docker (will start a temporary MySQL container and import):
#    DOCKER=1 MYSQL_ROOT_PASSWORD=secret DB_NAME=flexi_retail_new ./import_sql.sh

SQL_FILES=("flexi_retail_seed_remaining.sql" "flexi_retail_seed.sql" "retail_data.sql")
ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"

DB_USER=${DB_USER:-root}
DB_PASS=${DB_PASS:-}
DB_NAME=${DB_NAME:-flexi_retail}
DOCKER_MODE=${DOCKER:-0}

if [ "$DOCKER_MODE" != "0" ]; then
  CONTAINER_NAME="flexiretail-temp-mysql"
  MYSQL_ROOT_PASSWORD=${MYSQL_ROOT_PASSWORD:-root}
  echo "Starting temporary MySQL container ($CONTAINER_NAME) with password from MYSQL_ROOT_PASSWORD..."
  docker run --name "$CONTAINER_NAME" -e MYSQL_ROOT_PASSWORD="$MYSQL_ROOT_PASSWORD" -e MYSQL_DATABASE="$DB_NAME" -p 3307:3306 -d mysql:8.0 --default-authentication-plugin=mysql_native_password
  echo "Waiting for MySQL to become ready..."
  until docker exec "$CONTAINER_NAME" mysqladmin --user=root --password="$MYSQL_ROOT_PASSWORD" ping --silent; do
    sleep 1
  done
  echo "MySQL ready. Importing SQL files into database: $DB_NAME"
  for f in "${SQL_FILES[@]}"; do
    path="$ROOT_DIR/$f"
    if [ -f "$path" ]; then
      echo "Importing $f..."
      docker exec -i "$CONTAINER_NAME" mysql -u root -p"$MYSQL_ROOT_PASSWORD" "$DB_NAME" < "$path"
    else
      echo "Warning: $f not found at $path, skipping"
    fi
  done
  echo "Import complete. Container name: $CONTAINER_NAME. You can keep or remove it as needed."
  echo "To stop and remove the container: docker rm -f $CONTAINER_NAME"
  exit 0
fi

# Local mysql client path
MYSQL_CMD=$(command -v mysql || true)
if [ -z "$MYSQL_CMD" ]; then
  echo "mysql client not found. Either install MySQL client or run with DOCKER=1 and Docker installed."
  exit 1
fi

# Create database if not exists
if [ -n "$DB_PASS" ]; then
  echo "Creating database $DB_NAME (if not exists) and importing files..."
  "$MYSQL_CMD" -u "$DB_USER" -p"$DB_PASS" -e "CREATE DATABASE IF NOT EXISTS \\`$DB_NAME\\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
  for f in "${SQL_FILES[@]}"; do
    path="$ROOT_DIR/$f"
    if [ -f "$path" ]; then
      echo "Importing $f..."
      "$MYSQL_CMD" -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" < "$path"
    else
      echo "Warning: $f not found at $path, skipping"
    fi
  done
  echo "Import complete into database: $DB_NAME"
else
  echo "No DB_PASS provided. Attempting passwordless mysql connection..."
  "$MYSQL_CMD" -u "$DB_USER" -e "CREATE DATABASE IF NOT EXISTS \\`$DB_NAME\\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
  for f in "${SQL_FILES[@]}"; do
    path="$ROOT_DIR/$f"
    if [ -f "$path" ]; then
      echo "Importing $f..."
      "$MYSQL_CMD" -u "$DB_USER" "$DB_NAME" < "$path"
    else
      echo "Warning: $f not found at $path, skipping"
    fi
  done
  echo "Import complete into database: $DB_NAME"
fi
