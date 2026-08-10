@echo off
echo ========================================
echo FLEXI RETAIL - START SERVERS
echo ========================================
echo.

echo Starting Laravel API server (Port 8001)...
echo Note: This will open a new command window
start cmd /k "cd /d "%~dp0backend" && php artisan serve --port=8001"

timeout /t 3 /nobreak > nul

echo.
echo Starting Next.js frontend (Port 3000)...
echo Note: This will open a new command window  
start cmd /k "cd /d "%~dp0" && npm run dev"

echo.
echo ========================================
echo SERVERS STARTING...
echo ========================================
echo.
echo API Server: http://localhost:8001
echo Frontend:   http://localhost:3000
echo.
echo Wait 10-15 seconds for servers to start...
echo Then test the application.
echo.
pause