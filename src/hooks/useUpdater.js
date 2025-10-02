import { useEffect, useState } from 'react';

// Import the updater functions from the Tauri API. These will only
// resolve at runtime when the app runs inside a Tauri environment. When
// running in a regular browser (development), these imports will
// evaluate to undefined functions, so be sure to guard their usage in
// your components.
import { checkUpdate, installUpdate } from '@tauri-apps/api/updater';

/**
 * Custom React hook that encapsulates update checking and installation.
 *
 * On mount it triggers a check for available updates via the Tauri
 * updater plugin. If an update is available, the hook exposes a state
 * flag and the manifest (with version information). When the user
 * chooses to install the update, the hook will download and install
 * the update while updating the progress state.
 *
 * When running in a non-Tauri environment (e.g. local web dev), the
 * functions provided by @tauri-apps/plugin-updater are undefined. The
 * hook gracefully handles this case by returning false for
 * updateAvailable and no-op for install.
 */
export function useUpdater() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [latestVersion, setLatestVersion] = useState(null);
  const [progress, setProgress] = useState(null);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function check() {
      // Check if we're in Tauri environment
      if (typeof window === 'undefined' || !window.__TAURI__) {
        console.log('🔧 ScoBro Logbook: Running in browser mode - skipping update check');
        return;
      }
      
      if (typeof checkUpdate !== 'function') {
        // Not running in Tauri; skip update check.
        return;
      }
      try {
        const { shouldUpdate, manifest } = await checkUpdate();
        if (isMounted && shouldUpdate) {
          setUpdateAvailable(true);
          setLatestVersion(manifest?.version ?? null);
        }
      } catch (err) {
        console.error('Error checking for updates', err);
      }
    }
    check();
    return () => {
      isMounted = false;
    };
  }, []);

  const install = async () => {
    if (typeof installUpdate !== 'function') {
      return;
    }
    setInstalling(true);
    try {
      await installUpdate((event) => {
        if (event?.progress != null) {
          setProgress(event.progress * 100);
        }
      });
      // After install the app will restart automatically.
    } catch (err) {
      console.error('Error installing update', err);
    }
  };

  return { updateAvailable, latestVersion, progress, installing, install };
}