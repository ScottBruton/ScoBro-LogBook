@echo off
echo ========================================
echo    ScoBro Logbook - Complete Startup
echo ========================================
echo.

echo Starting backend server...
start "ScoBro Backend" cmd /k "cd backend && npm run dev"

echo Waiting for backend to start...
timeout /t 3 /nobreak >nul

echo Starting frontend server...
start "ScoBro Frontend" cmd /k "npm run vite"

echo Waiting for frontend to start...
timeout /t 5 /nobreak >nul

echo Starting desktop app...
start "ScoBro Desktop" cmd /k "npx tauri dev"

echo.
echo ========================================
echo    All services started!
echo ========================================
echo.
echo Backend: http://localhost:3001
echo Frontend: http://localhost:5173
echo Desktop app should open shortly...
echo.
pause
