#!/usr/bin/env node

/**
 * Simple script to view ScoBro Logbook debug logs
 * This script reads the log file and displays it in the terminal
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

// Get the app directory path (where the logs folder should be)
const appPath = path.join(__dirname, 'logs');
const logFile = path.join(appPath, 'scobro-debug.log');

console.log('🔍 ScoBro Logbook Debug Log Viewer');
console.log('==================================');
console.log(`📁 Looking for log file: ${logFile}`);
console.log('');

if (fs.existsSync(logFile)) {
  console.log('✅ Log file found!');
  console.log('');
  
  try {
    const logContent = fs.readFileSync(logFile, 'utf8');
    
    if (logContent.trim()) {
      console.log('📋 Log Content:');
      console.log('===============');
      console.log(logContent);
    } else {
      console.log('📝 Log file is empty');
    }
  } catch (error) {
    console.error('❌ Error reading log file:', error.message);
  }
} else {
  console.log('❌ Log file not found');
  console.log('');
  console.log('This could mean:');
  console.log('1. The app hasn\'t been started yet');
  console.log('2. The app is running but hasn\'t written any logs yet');
  console.log('3. The log file is in a different location');
  console.log('');
  console.log('Try running the app and then run this script again.');
}

console.log('');
console.log('💡 Tip: Run this script with "node view-logs.js" to check logs anytime');
console.log('💡 Tip: Use "tail -f" to follow the log file in real-time:');
console.log(`   tail -f "${logFile}"`);
