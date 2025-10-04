@echo off
echo Killing processes on port 5173...

REM Find processes using port 5173
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5173') do (
    echo Killing process %%a
    taskkill /F /PID %%a >nul 2>&1
)

REM Also kill any remaining Node.js processes
taskkill /F /IM node.exe >nul 2>&1

echo Port 5173 is now free!
echo Starting Vite dev server...
