@echo off
echo Running Laravel migrations...

cd backend
echo. Checking if vendor exists...
if not exist "vendor" (
    echo Vendor directory not found. Running composer install...
    composer install --no-interaction --no-progress
) else (
    echo Vendor directory exists.
)

echo. Running migrations...
php artisan migrate --force

echo. Running database seeders if needed...
php artisan db:seed --force

echo. Done!
pause