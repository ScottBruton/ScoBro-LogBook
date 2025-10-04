Write-Host "Killing processes on port 5173..." -ForegroundColor Yellow

# Find and kill processes using port 5173
$processes = netstat -ano | Select-String ":5173" | ForEach-Object {
    $parts = $_.Line -split '\s+'
    $processId = $parts[-1]
    if ($processId -match '^\d+$') {
        Write-Host "Killing process $processId" -ForegroundColor Red
        taskkill /F /PID $processId 2>$null
    }
}

# Also kill any remaining Node.js processes
taskkill /F /IM node.exe 2>$null

Write-Host "Port 5173 is now free!" -ForegroundColor Green
Write-Host "Starting Vite dev server..." -ForegroundColor Cyan

# Start Vite
npm run vite
