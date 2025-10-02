# ScoBro Logbook Debug Logging System

## Overview

The ScoBro Logbook now includes a comprehensive file-based logging system that writes debug information to a text file. This is especially useful when the app freezes or crashes and you can't access the browser dev tools.

## Log File Location

The debug log is automatically saved to:
```
logs/scobro-debug.log
```
(in the app directory)

## How to Use

### 1. View Logs
```bash
node view-logs.js
```

### 2. Clear Logs
```bash
node clear-logs.js
```

### 3. Follow Logs in Real-Time
```bash
tail -f "logs/scobro-debug.log"
```

## What Gets Logged

The system logs:
- ✅ App startup and initialization
- ✅ Component loading and rendering
- ✅ Database operations
- ✅ Calendar OAuth flows
- ✅ Error messages with stack traces
- ✅ Authentication attempts
- ✅ Service connections
- ✅ All major app events

## Log Format

Each log entry includes:
- **Timestamp**: ISO format timestamp
- **Level**: INFO, ERROR, WARN, DEBUG
- **Message**: Human-readable description
- **Data**: Additional context (JSON format)

Example:
```
[2025-01-27T10:30:45.123Z] INFO: 🚀 ScoBro Logbook: Starting application...
[2025-01-27T10:30:45.456Z] INFO: 📊 ScoBro Logbook: Loading entries...
[2025-01-27T10:30:45.789Z] ERROR: 💥 ScoBro Logbook: Failed to load entries
{
  "message": "Database connection failed",
  "stack": "Error: Database connection failed\n    at DataService.getAllEntries..."
}
```

## Troubleshooting

### App Freezes During Startup
1. Run `node view-logs.js` to see where it's getting stuck
2. Look for the last successful log entry
3. Check for any error messages

### Calendar Connection Issues
1. Look for OAuth-related log entries
2. Check for environment variable errors
3. Verify redirect URI configuration

### Database Issues
1. Look for DataService-related errors
2. Check for SQLite connection problems
3. Verify database file permissions

## Log File Management

- **Size**: Log files can grow large over time
- **Rotation**: Consider clearing logs periodically with `clear-logs.js`
- **Backup**: Important logs can be copied before clearing

## Integration

The logging system is automatically enabled and requires no configuration. It works alongside the existing console logging and provides a persistent record of app behavior.

## File Logger API

The `FileLogger` class provides these methods:
- `FileLogger.info(message, data)` - Log informational messages
- `FileLogger.error(message, data)` - Log error messages
- `FileLogger.warn(message, data)` - Log warning messages
- `FileLogger.debug(message, data)` - Log debug messages
- `FileLogger.clearLog()` - Clear the log file
- `FileLogger.getLogPath()` - Get the log file path

## Notes

- Logs are written asynchronously to avoid blocking the UI
- If file writing fails, logs fall back to console output
- The system gracefully handles missing Tauri APIs in development mode
