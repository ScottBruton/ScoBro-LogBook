// Debug Console Helper for ScoBro Logbook
// Run this in the browser console to get detailed logging

console.log('🔧 ScoBro Logbook Debug Helper Loaded');

// Function to show all console logs in the DOM
function showConsoleInDOM() {
  const originalLog = console.log;
  const originalError = console.error;
  const originalWarn = console.warn;
  
  const logs = [];
  
  // Override console methods
  console.log = function(...args) {
    logs.push({ type: 'log', message: args.join(' '), timestamp: new Date().toISOString() });
    originalLog.apply(console, args);
  };
  
  console.error = function(...args) {
    logs.push({ type: 'error', message: args.join(' '), timestamp: new Date().toISOString() });
    originalError.apply(console, args);
  };
  
  console.warn = function(...args) {
    logs.push({ type: 'warn', message: args.join(' '), timestamp: new Date().toISOString() });
    originalWarn.apply(console, args);
  };
  
  // Create debug panel
  const debugPanel = document.createElement('div');
  debugPanel.id = 'scobro-debug-panel';
  debugPanel.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0.9);
    color: white;
    font-family: monospace;
    font-size: 12px;
    overflow-y: auto;
    z-index: 9999;
    padding: 20px;
    box-sizing: border-box;
  `;
  
  const header = document.createElement('div');
  header.innerHTML = `
    <h2 style="color: #00ff00; margin: 0 0 20px 0;">🔧 ScoBro Logbook Debug Console</h2>
    <button onclick="document.getElementById('scobro-debug-panel').remove()" 
            style="position: absolute; top: 20px; right: 20px; background: #ff0000; color: white; border: none; padding: 10px; cursor: pointer;">
      Close
    </button>
    <button onclick="clearLogs()" 
            style="position: absolute; top: 20px; right: 120px; background: #ffaa00; color: white; border: none; padding: 10px; cursor: pointer;">
      Clear
    </button>
  `;
  
  const logContainer = document.createElement('div');
  logContainer.id = 'scobro-log-container';
  logContainer.style.cssText = `
    background: #000;
    padding: 10px;
    border-radius: 5px;
    max-height: 80vh;
    overflow-y: auto;
  `;
  
  debugPanel.appendChild(header);
  debugPanel.appendChild(logContainer);
  document.body.appendChild(debugPanel);
  
  // Function to update logs display
  function updateLogs() {
    const container = document.getElementById('scobro-log-container');
    if (container) {
      container.innerHTML = logs.map(log => {
        const color = log.type === 'error' ? '#ff0000' : 
                     log.type === 'warn' ? '#ffaa00' : '#00ff00';
        return `<div style="color: ${color}; margin: 2px 0;">
          [${log.timestamp}] ${log.type.toUpperCase()}: ${log.message}
        </div>`;
      }).join('');
      container.scrollTop = container.scrollHeight;
    }
  }
  
  // Update logs every second
  setInterval(updateLogs, 1000);
  
  // Global function to clear logs
  window.clearLogs = function() {
    logs.length = 0;
    updateLogs();
  };
  
  console.log('✅ Debug panel created. Use clearLogs() to clear the log display.');
}

// Function to check app state
function checkAppState() {
  console.log('🔍 Checking ScoBro Logbook App State...');
  
  // Check if React root exists
  const root = document.getElementById('root');
  console.log('Root element:', root);
  console.log('Root innerHTML length:', root?.innerHTML?.length || 0);
  
  // Check localStorage
  const entries = localStorage.getItem('scobro_entries');
  console.log('LocalStorage entries:', entries ? 'Found' : 'Not found');
  
  // Check calendar config
  const calendarConfig = localStorage.getItem('calendarConfig');
  console.log('Calendar config:', calendarConfig ? 'Found' : 'Not found');
  
  // Check for any global errors
  if (window.lastError) {
    console.log('Last global error:', window.lastError);
  }
}

// Make functions globally available
window.showConsoleInDOM = showConsoleInDOM;
window.checkAppState = checkAppState;

console.log('🔧 Debug functions available:');
console.log('  - showConsoleInDOM() - Show console logs in DOM');
console.log('  - checkAppState() - Check app state and configuration');
console.log('  - clearLogs() - Clear the debug log display (after showing console)');
