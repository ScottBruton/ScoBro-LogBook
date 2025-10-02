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
        const existingLogs = localStorage.getItem('scobro_debug_logs') || '';
        const newLogs = existingLogs + content;
        localStorage.setItem('scobro_debug_logs', newLogs);
      }
    } catch (err) {
      console.error('Failed to write log:', err);
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
