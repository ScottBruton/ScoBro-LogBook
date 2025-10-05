@echo off
echo ========================================
echo    ScoBro Logbook Backend Server
echo ========================================
echo.

echo [1/3] Checking for Node.js...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)
echo [OK] Node.js found

echo.
echo [2/3] Installing dependencies...
if not exist node_modules (
    echo Installing npm packages...
    npm install
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to install dependencies
        pause
        exit /b 1
    )
) else (
    echo [OK] Dependencies already installed
)

echo.
echo [3/3] Starting backend server...
echo.
echo Backend server will run on: http://localhost:3001
echo Health check: http://localhost:3001/health
echo.
echo Press Ctrl+C to stop the server
echo.

npm run dev
