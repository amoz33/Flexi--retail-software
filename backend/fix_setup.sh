#!/usr/bin/env bash
set -euo pipefail

# fix_setup.sh - helper to clear Laravel caches, install doctrine/dbal,
# and run migrations. Run this from the project root:
# cd backend
# ./fix_setup.sh

echo "Backing up .env to .env.bak"
cp .env .env.bak || true

echo "Ensure APP_DEBUG is enabled in .env for troubleshooting"
grep -q "^APP_DEBUG=true" .env || sed -i.bak 's/^APP_DEBUG=.*/APP_DEBUG=true/' .env || true

echo "Clearing Laravel caches..."
php artisan config:clear || true
php artisan cache:clear || true
php artisan route:clear || true
php artisan view:clear || true

echo "Installing doctrine/dbal (required for column changes)..."
composer require doctrine/dbal --no-interaction || true

echo "Running migrations..."
php artisan migrate --force || true

echo "Done. Check backend/storage/logs/laravel.log for any errors and restart your server if necessary."
