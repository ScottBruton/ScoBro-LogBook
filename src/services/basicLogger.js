// Basic Logger Service for ScoBro Logbook
// This works even when the app crashes early in startup

export class BasicLogger {
  static logFile = 'logs/scobro-debug.log';
  static logs = [];

  static log(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      data: data ? JSON.stringify(data, null, 2) : null
    };

    const logLine = `[${timestamp}] ${level.toUpperCase()}: ${message}${data ? '\n' + data : ''}\n`;

    // Store in memory
    this.logs.push(logEntry);

    // Try to write to file immediately (synchronous)
    this.writeToFileSync(logLine);

    // Also log to console
    console.log(logLine);
  }

  static writeToFileSync(content) {
    try {
      // Try to use Tauri's filesystem API
      if (window.__TAURI__) {
        // We'll use a different approach for Tauri
        this.writeToFileAsync(content);
      } else {
        // Fallback: try to write to localStorage as backup
        try {
          const existingLogs = localStorage.getItem('scobro_debug_logs') || '';
          const MAX_LOG_SIZE = 100000; // ~100KB max for debug logs
          const MAX_LOG_LINES = 2000; // Max number of log lines to keep
          
          let newLogs = existingLogs + content;
          
          // Limit by size
          if (newLogs.length > MAX_LOG_SIZE) {
            // Keep only the most recent portion
            newLogs = newLogs.slice(-MAX_LOG_SIZE);
          }
          
          // Limit by number of lines
          const lines = newLogs.split('\n');
          if (lines.length > MAX_LOG_LINES) {
            newLogs = lines.slice(-MAX_LOG_LINES).join('\n');
          }
          
          localStorage.setItem('scobro_debug_logs', newLogs);
        } catch (storageError) {
          // Handle quota exceeded error gracefully
          if (storageError.name === 'QuotaExceededError' || storageError.message.includes('quota')) {
            try {
              // Try to clear and keep only recent logs
              const recentLines = content.split('\n').slice(-50).join('\n'); // Keep only last 50 lines
              localStorage.setItem('scobro_debug_logs', recentLines);
              console.warn('⚠️ ScoBro Logbook: LocalStorage quota exceeded for debug logs. Clearing old logs.');
            } catch (clearError) {
              // If even that fails, remove the key entirely
              try {
                localStorage.removeItem('scobro_debug_logs');
              } catch (e) {
                // Ignore errors when trying to clear
              }
              console.warn('⚠️ ScoBro Logbook: LocalStorage quota exceeded for debug logs. Stopping localStorage logging.');
            }
          } else {
            throw storageError; // Re-throw non-quota errors
          }
        }
      }
    } catch (err) {
      // Don't log quota errors to prevent infinite loops
      if (!(err.name === 'QuotaExceededError' || err.message?.includes('quota'))) {
        console.error('Failed to write log:', err);
      }
    }
  }

  static async writeToFileAsync(content) {
    try {
      const { writeTextFile, readTextFile, createDir, BaseDirectory } = await import('@tauri-apps/api/fs');
      
      // Create logs directory if it doesn't exist
      try {
        await createDir('logs', { dir: BaseDirectory.App, recursive: true });
      } catch (err) {
        // Directory might already exist, that's okay
      }
      
      // Read existing content first
      let existingContent = '';
      try {
        existingContent = await readTextFile(this.logFile, { dir: BaseDirectory.App });
      } catch (err) {
        // File doesn't exist yet, that's okay
      }

      // Append new content
      const newContent = existingContent + content;
      
      // Write to logs folder in app directory
      await writeTextFile(this.logFile, newContent, { 
        dir: BaseDirectory.App 
      });
    } catch (err) {
      console.error('Failed to write log file:', err);
    }
  }

  static info(message, data = null) {
    this.log('info', message, data);
  }

  static error(message, data = null) {
    this.log('error', message, data);
  }

  static warn(message, data = null) {
    this.log('warn', message, data);
  }

  static debug(message, data = null) {
    this.log('debug', message, data);
  }

  static getLogsFromStorage() {
    try {
      return localStorage.getItem('scobro_debug_logs') || '';
    } catch (err) {
      return '';
    }
  }

  static clearLogsFromStorage() {
    try {
      localStorage.removeItem('scobro_debug_logs');
    } catch (err) {
      console.error('Failed to clear logs from storage:', err);
    }
  }
}

// Make it globally available
window.BasicLogger = BasicLogger;
