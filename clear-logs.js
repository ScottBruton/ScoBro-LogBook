#!/usr/bin/env node

/**
 * Simple script to clear ScoBro Logbook debug logs
 * This script clears the log file
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

// Get the app directory path (where the logs folder should be)
const appPath = path.join(__dirname, 'logs');
const logFile = path.join(appPath, 'scobro-debug.log');

console.log('🧹 ScoBro Logbook Log Cleaner');
console.log('=============================');
console.log(`📁 Log file: ${logFile}`);
console.log('');

if (fs.existsSync(logFile)) {
  try {
    fs.writeFileSync(logFile, '');
    console.log('✅ Log file cleared successfully!');
  } catch (error) {
    console.error('❌ Error clearing log file:', error.message);
  }
} else {
  console.log('ℹ️ Log file doesn\'t exist yet');
}

console.log('');
console.log('💡 The log file will be recreated when the app starts logging again');
