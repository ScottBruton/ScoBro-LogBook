#!/usr/bin/env node

/**
 * Script to check localStorage logs from ScoBro Logbook
 * This checks the browser's localStorage for backup logs
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 ScoBro Logbook LocalStorage Log Checker');
console.log('==========================================');
console.log('');

console.log('This script checks for backup logs stored in localStorage.');
console.log('Since localStorage is browser-specific, you need to:');
console.log('');
console.log('1. Open your browser (Chrome, Firefox, etc.)');
console.log('2. Open Developer Tools (F12)');
console.log('3. Go to the "Application" or "Storage" tab');
console.log('4. Look for "Local Storage" in the left sidebar');
console.log('5. Click on your app\'s domain (usually localhost:5173)');
console.log('6. Look for a key called "scobro_debug_logs"');
console.log('7. Copy the value and paste it here or save it to a file');
console.log('');

console.log('Alternatively, you can run this in the browser console:');
console.log('');
console.log('// Check if logs exist');
console.log('const logs = localStorage.getItem("scobro_debug_logs");');
console.log('if (logs) {');
console.log('  console.log("Found logs:");');
console.log('  console.log(logs);');
console.log('} else {');
console.log('  console.log("No logs found in localStorage");');
console.log('}');
console.log('');

console.log('// Save logs to a file');
console.log('const logs = localStorage.getItem("scobro_debug_logs");');
console.log('if (logs) {');
console.log('  const blob = new Blob([logs], { type: "text/plain" });');
console.log('  const url = URL.createObjectURL(blob);');
console.log('  const a = document.createElement("a");');
console.log('  a.href = url;');
console.log('  a.download = "scobro-debug-logs.txt";');
console.log('  a.click();');
console.log('}');
console.log('');

console.log('💡 If you find logs, please share them so we can debug the issue!');
