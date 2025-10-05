@echo off
echo ========================================
echo    ScoBro Logbook - Starting App
echo ========================================
echo.

echo Killing processes on port 5173...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5173') do (
    echo Killing process %%a
    taskkill /F /PID %%a >nul 2>&1
)

echo Killing any remaining Node.js processes...
taskkill /F /IM node.exe >nul 2>&1

echo Port 5173 is now free!
echo.

echo Starting Vite dev server...
start "Vite Dev Server" cmd /k "npm run vite"

echo Waiting for server to start...
timeout /t 5 /nobreak >nul

echo Starting Tauri desktop app...
npm run start

echo.
echo ScoBro Logbook should now be running!
pause