#!/usr/bin/env node

/**
 * Comprehensive script to check all possible log locations for ScoBro Logbook
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

console.log('🔍 ScoBro Logbook - Comprehensive Log Checker');
console.log('=============================================');
console.log('');

// Check app logs folder for log file
const appPath = path.join(__dirname, 'logs');
const logFile = path.join(appPath, 'scobro-debug.log');

console.log('📁 Checking app logs folder...');
console.log(`   Path: ${logFile}`);

if (fs.existsSync(logFile)) {
  console.log('✅ Found log file in app logs folder!');
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
  console.log('❌ No log file found in app logs folder');
}

console.log('');
console.log('🌐 Checking for localStorage logs...');
console.log('');
console.log('To check localStorage logs, you need to:');
console.log('1. Open your browser (Chrome, Firefox, etc.)');
console.log('2. Open Developer Tools (F12)');
console.log('3. Go to the "Application" or "Storage" tab');
console.log('4. Look for "Local Storage" in the left sidebar');
console.log('5. Click on your app\'s domain (usually localhost:5173)');
console.log('6. Look for these keys:');
console.log('   - "scobro_debug_logs" (main logs)');
console.log('   - "scobro_early_logs" (early startup logs)');
console.log('');

console.log('💻 Browser Console Commands:');
console.log('');
console.log('// Check main logs');
console.log('console.log(localStorage.getItem("scobro_debug_logs") || "No main logs found");');
console.log('');
console.log('// Check early logs');
console.log('console.log(localStorage.getItem("scobro_early_logs") || "No early logs found");');
console.log('');
console.log('// Save all logs to a file');
console.log('const mainLogs = localStorage.getItem("scobro_debug_logs") || "";');
console.log('const earlyLogs = localStorage.getItem("scobro_early_logs") || "";');
console.log('const allLogs = "=== EARLY LOGS ===\\n" + earlyLogs + "\\n=== MAIN LOGS ===\\n" + mainLogs;');
console.log('const blob = new Blob([allLogs], { type: "text/plain" });');
console.log('const url = URL.createObjectURL(blob);');
console.log('const a = document.createElement("a");');
console.log('a.href = url;');
console.log('a.download = "scobro-all-logs.txt";');
console.log('a.click();');
console.log('');

console.log('🔧 If the app is completely frozen:');
console.log('1. Try opening the app in a different browser');
console.log('2. Check if the app is running in the background');
console.log('3. Look for any error messages in the browser console');
console.log('4. Try running the app in development mode: npm run dev');
console.log('');

console.log('📊 Summary:');
console.log('- App logs file: ' + (fs.existsSync(logFile) ? '✅ Found' : '❌ Not found'));
console.log('- localStorage logs: Check browser manually');
console.log('- Early logs: Check browser manually');
console.log('');

console.log('💡 If you find any logs, please share them so we can debug the issue!');
