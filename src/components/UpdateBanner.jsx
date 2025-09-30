import React from 'react';
import { useUpdater } from '../hooks/useUpdater.js';

/**
 * Banner component that notifies the user when an update is
 * available. If the update is downloading, it shows a progress bar. If
 * the update is ready to install, it displays an install button.
 */
export default function UpdateBanner() {
  const { updateAvailable, latestVersion, progress, installing, install } = useUpdater();

  if (!updateAvailable) return null;

  return (
    <div
      style={{
        backgroundColor: '#fffae6',
        border: '1px solid #f0c36d',
        padding: '8px 12px',
        marginBottom: '8px',
        borderRadius: '4px',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
      }}
    >
      {!installing ? (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: 500 }}>
            🚀 Update {latestVersion ?? ''} available!
          </span>
          <button
            onClick={install}
            style={{
              backgroundColor: '#f0c36d',
              border: 'none',
              padding: '4px 8px',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Install Now
          </button>
        </div>
      ) : (
        <div>
          <span>
            ⬇️ Downloading update… {progress != null ? `${progress.toFixed(0)}%` : 'Starting…'}
          </span>
          <div
            style={{
              height: '6px',
              backgroundColor: '#eee',
              borderRadius: '3px',
              marginTop: '4px',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${progress ?? 0}%`,
                backgroundColor: '#f0c36d',
                borderRadius: '3px',
                transition: 'width 0.3s ease',
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}