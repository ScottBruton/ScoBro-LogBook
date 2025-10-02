import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';

// Entry point for the React application. We create the root
// container and render the App component into the DOM. This file
// remains intentionally simple to keep the bootstrap process
// straightforward.

console.log('🚀 ScoBro Logbook: Starting application...');

// Global error handler
window.addEventListener('error', (event) => {
  const errorDetails = {
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
    stack: event.error?.stack
  };
  
  console.error('💥 ScoBro Logbook: Global error caught', errorDetails);
  console.error('💥 ScoBro Logbook: Global error caught:', event.error);
  console.error('Error details:', errorDetails);
});

window.addEventListener('unhandledrejection', (event) => {
  const rejectionDetails = {
    reason: event.reason?.toString(),
    stack: event.reason?.stack
  };
  
  console.error('💥 ScoBro Logbook: Unhandled promise rejection', rejectionDetails);
  console.error('💥 ScoBro Logbook: Unhandled promise rejection:', event.reason);
  console.error('Promise rejection details:', event.reason?.stack);
});

try {
  console.log('🔍 ScoBro Logbook: Looking for root container...');
  
  const container = document.getElementById('root');
  
  if (!container) {
    console.error('❌ ScoBro Logbook: Root container not found!');
    throw new Error('Root container not found');
  }
  
  console.log('✅ ScoBro Logbook: Root container found, creating React root...');
  
  const root = createRoot(container);
  
  console.log('🎨 ScoBro Logbook: Rendering App component...');
  
  root.render(<App />);
  
  console.log('✅ ScoBro Logbook: App rendered successfully!');
} catch (error) {
  console.error('💥 ScoBro Logbook: Fatal error during app initialization:', error);
  console.error('Stack trace:', error.stack);
  
  // Try to show error in the DOM
  const container = document.getElementById('root');
  if (container) {
    container.innerHTML = `
      <div style="padding: 20px; font-family: Arial, sans-serif; color: red;">
        <h2>🚨 ScoBro Logbook Error</h2>
        <p><strong>Error:</strong> ${error.message}</p>
        <p><strong>Stack:</strong></p>
        <pre style="background: #f5f5f5; padding: 10px; overflow: auto;">${error.stack}</pre>
        <p>Check the console for more details.</p>
        <p><strong>Log file location:</strong> logs/scobro-debug.log (in app directory)</p>
        <p><strong>Backup logs:</strong> Check localStorage for 'scobro_debug_logs'</p>
        <div style="margin-top: 20px;">
          <button onclick="window.showConsoleInDOM && window.showConsoleInDOM()" 
                  style="padding: 10px 20px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer; margin-right: 10px;">
            Show Debug Console
          </button>
          <button onclick="window.checkAppState && window.checkAppState()" 
                  style="padding: 10px 20px; background: #28a745; color: white; border: none; border-radius: 4px; cursor: pointer; margin-right: 10px;">
            Check App State
          </button>
          <button onclick="window.location.reload()" 
                  style="padding: 10px 20px; background: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer;">
            Reload App
          </button>
        </div>
        <script src="debug-console.js"></script>
      </div>
    `;
  }
}