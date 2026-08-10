@echo off
echo ========================================
echo FLEXI RETAIL - SECURITY MIGRATION DEPLOYMENT
echo ========================================
echo.

echo Step 1: Checking Laravel setup...
cd backend
if not exist ".env" (
    echo Error: .env file not found!
    echo Copy .env.example to .env and configure database settings
    pause
    exit /b 1
)

echo Step 2: Installing dependencies if needed...
if not exist "vendor" (
    echo Installing Composer dependencies...
    composer install --no-interaction --no-progress --no-suggest
)

echo Step 3: Generating application key...
php artisan key:generate --force

echo Step 4: Running database migrations...
php artisan migrate --force

echo Step 5: Clearing cache...
php artisan config:clear
php artisan cache:clear
php artisan route:clear

echo.
echo ========================================
echo DEPLOYMENT COMPLETE!
echo ========================================
echo.
echo Next steps:
echo 1. Start Laravel server: php artisan serve --port=8001
echo 2. Start Next.js frontend: npm run dev (in root directory)
echo 3. Test API endpoints
echo 4. Monitor error logs
echo.
pause