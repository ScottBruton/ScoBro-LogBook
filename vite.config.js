import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Vite configuration for the ScoBro Logbook project. This file
// configures Vite to use the React plugin and to honour the Tauri
// application environment when bundling for desktop. You can extend
// this configuration with additional plugins (e.g. Tailwind) as you
// evolve the app.

export default defineConfig({
  plugins: [react()],
  build: {
    target: 'esnext',
    // Tauri requires you to set the output directory to a folder that
    // Tauri knows how to locate. The default is `dist` which matches
    // the settings in src-tauri/tauri.conf.json.
    outDir: 'dist',
  },
  server: {
    // Configure Vite dev server to serve OAuth callback files directly
    middlewareMode: false,
    port: 5173, // Fixed port for OAuth consistency
    strictPort: true, // Fail if port is already in use
  },
  // Configure how static files are served
  publicDir: 'public',
});