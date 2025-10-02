// File Logger Service for ScoBro Logbook
// Writes logs to a text file for debugging when dev tools aren't accessible

export class FileLogger {
  static logFile = 'logs/scobro-debug.log';
  static isEnabled = true;

  static log(level, message, data = null) {
    if (!this.isEnabled) return;

    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      data: data ? JSON.stringify(data, null, 2) : null
    };

    const logLine = `[${timestamp}] ${level.toUpperCase()}: ${message}${data ? '\n' + data : ''}\n`;

    // Try to write to file using Tauri's filesystem API
    this.writeToFile(logLine).catch(err => {
      // Fallback to console if file writing fails
      console.log(`[FileLogger] Failed to write to file: ${err.message}`);
      console.log(logLine);
    });
  }

  static async writeToFile(content) {
    try {
      // Use Tauri's filesystem API to write to file
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
      throw new Error(`Failed to write log file: ${err.message}`);
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

  static async clearLog() {
    try {
      const { writeTextFile, BaseDirectory } = await import('@tauri-apps/api/fs');
      await writeTextFile(this.logFile, '', { dir: BaseDirectory.App });
      console.log('Log file cleared');
    } catch (err) {
      console.error('Failed to clear log file:', err);
    }
  }

  static async getLogPath() {
    try {
      const { appDataDir } = await import('@tauri-apps/api/path');
      const appDataPath = await appDataDir();
      return `${appDataPath}/${this.logFile}`;
    } catch (err) {
      return 'logs/scobro-debug.log';
    }
  }
}

// Make it globally available
window.FileLogger = FileLogger;
