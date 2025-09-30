import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';

// Entry point for the React application. We create the root
// container and render the App component into the DOM. This file
// remains intentionally simple to keep the bootstrap process
// straightforward.

const container = document.getElementById('root');
const root = createRoot(container);
root.render(<App />);