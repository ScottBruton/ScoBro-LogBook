# Emergency Logging System for ScoBro Logbook

## 🚨 When the App Freezes or Crashes

If your ScoBro Logbook app is freezing or crashing and you can't see any logs, we've implemented a comprehensive logging system to help debug the issue.

## 📍 Where to Find Logs

### 1. **App Logs Folder** (Primary)
- **File**: `logs/scobro-debug.log` (in app directory)
- **Check**: Run `node check-all-logs.js` to see if this file exists

### 2. **Browser localStorage** (Backup)
- **Keys**: `scobro_debug_logs` and `scobro_early_logs`
- **Check**: Use browser dev tools or run `node check-localStorage-logs.js`

## 🔍 How to Check for Logs

### Quick Check (Command Line)
```bash
node check-all-logs.js
```

### Manual Check (Browser)
1. Open your browser (Chrome, Firefox, etc.)
2. Open Developer Tools (F12)
3. Go to "Application" or "Storage" tab
4. Look for "Local Storage" in the left sidebar
5. Click on your app's domain (usually `localhost:5173`)
6. Look for these keys:
   - `scobro_debug_logs` (main logs)
   - `scobro_early_logs` (early startup logs)

### Browser Console Commands
```javascript
// Check main logs
console.log(localStorage.getItem("scobro_debug_logs") || "No main logs found");

// Check early logs
console.log(localStorage.getItem("scobro_early_logs") || "No early logs found");

// Save all logs to a file
const mainLogs = localStorage.getItem("scobro_debug_logs") || "";
const earlyLogs = localStorage.getItem("scobro_early_logs") || "";
const allLogs = "=== EARLY LOGS ===\n" + earlyLogs + "\n=== MAIN LOGS ===\n" + mainLogs;
const blob = new Blob([allLogs], { type: "text/plain" });
const url = URL.createObjectURL(blob);
const a = document.createElement("a");
a.href = url;
a.download = "scobro-all-logs.txt";
a.click();
```

## 🛠️ What Gets Logged

### Early Logs (HTML Level)
- App startup messages
- Basic console output
- Any errors before React loads

### Main Logs (React Level)
- Component loading
- Service initialization
- Database operations
- Calendar OAuth flows
- Error messages with stack traces

## 🚨 Troubleshooting Steps

### 1. **App Completely Frozen**
- Check if the app is running in the background
- Try opening in a different browser
- Look for error messages in browser console
- Try running in development mode: `npm run dev`

### 2. **No Logs Found**
- The app might be crashing before logging starts
- Check browser console for any error messages
- Try running the app in development mode
- Check if there are any network errors

### 3. **Logs Found but App Still Crashes**
- Share the log content for debugging
- Check the last successful log entry
- Look for any error messages in the logs

## 📋 Log Format

Each log entry includes:
- **Timestamp**: ISO format timestamp
- **Level**: INFO, ERROR, WARN, DEBUG
- **Message**: Human-readable description
- **Data**: Additional context (JSON format)

Example:
```
[2025-01-27T10:30:45.123Z] INFO: 🚀 ScoBro Logbook: Starting application...
[2025-01-27T10:30:45.456Z] ERROR: 💥 ScoBro Logbook: Failed to load entries
{
  "message": "Database connection failed",
  "stack": "Error: Database connection failed\n    at DataService.getAllEntries..."
}
```

## 🔧 Scripts Available

- `check-all-logs.js` - Comprehensive log checker
- `check-localStorage-logs.js` - localStorage log checker
- `view-logs.js` - View Downloads log file
- `clear-logs.js` - Clear log files

## 💡 Tips

- Logs are written to both file and localStorage for redundancy
- Early logs capture issues before React loads
- All logs include timestamps for debugging
- Logs are automatically saved every 5 seconds

## 🆘 Need Help?

If you find logs but the app still crashes:
1. Copy the log content
2. Share it for debugging
3. Include any error messages from the browser console
4. Mention what you were doing when the crash occurred

The logging system is designed to capture as much information as possible, even when the app crashes early in the startup process.
