@echo off
echo Killing processes on port 5173...

REM Find and kill processes using port 5173
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":5173"') do (
    echo Killing process %%a
    taskkill /F /PID %%a >nul 2>&1
)

echo Port 5173 is now free!
echo Starting Tauri dev server...

REM Start Vite
call npm run tauri

