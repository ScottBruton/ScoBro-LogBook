import React, { useEffect, useState } from 'react';
import UpdateBanner from './components/UpdateBanner.jsx';
import EntryPopup from './components/EntryPopup.jsx';
import Dashboard from './components/Dashboard.jsx';
import { DataService } from './services/dataService.js';
import { SupabaseService } from './services/supabaseService.js';

// Attempt to import global shortcut plugin from Tauri. If running in
// development (non-tauri) this will be undefined and the useEffect
// below will simply not register the hotkey.
import { register } from '@tauri-apps/plugin-global-shortcut';
import { listen } from '@tauri-apps/api/event';

/**
 * Top-level application component. It manages global state for
 * entries, popup visibility and handles saving/loading from
 * SQLite database via Tauri commands. It also registers a keyboard 
 * shortcut (Ctrl+Alt+N) for opening the popup when running inside 
 * a Tauri environment.
 */
export default function App() {
  const [entries, setEntries] = useState([]);
  const [showPopup, setShowPopup] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState('offline');

  // Load entries from SQLite database on mount.
  useEffect(() => {
    loadEntries();
  }, []);

  const loadEntries = async () => {
    try {
      setIsLoading(true);
      const data = await DataService.getAllEntries();
      setEntries(data);
    } catch (err) {
      console.error('Failed to load entries:', err);
      // Fallback to localStorage for development
      const stored = localStorage.getItem('scobro_entries');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setEntries(parsed);
        } catch (parseErr) {
          console.error('Failed to parse stored entries', parseErr);
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Register global shortcut in Tauri environment.
  useEffect(() => {
    async function registerShortcut() {
      if (typeof register === 'function') {
        try {
          await register('Ctrl+Alt+N', () => {
            setShowPopup(true);
          });
        } catch (err) {
          console.error('Failed to register global shortcut', err);
        }
      }
    }
    registerShortcut();
  }, []);

  // Listen for tray menu events
  useEffect(() => {
    let unlisten;
    if (typeof listen === 'function') {
      listen('quick-add', () => {
        setShowPopup(true);
      }).then((unlistenFn) => {
        unlisten = unlistenFn;
      });
    }
    return () => {
      if (unlisten) unlisten();
    };
  }, []);

  const handleSaveItems = async (items) => {
    try {
      const timestamp = new Date().toISOString();
      const newEntry = await DataService.createEntry(timestamp, items);
      setEntries((prev) => [newEntry, ...prev]);
      
      // Try to sync to Supabase in background
      try {
        await SupabaseService.syncEntries([newEntry]);
        setSyncStatus('synced');
      } catch (syncErr) {
        console.warn('Failed to sync to Supabase:', syncErr);
        setSyncStatus('pending');
      }
    } catch (err) {
      console.error('Failed to save entry:', err);
      // Fallback to localStorage for development
      const fallbackEntry = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        items: items.map((item) => ({
          ...item,
          tags: item.tags || [],
          jira: item.jira || [],
          people: item.people || [],
        })),
      };
      setEntries((prev) => [fallbackEntry, ...prev]);
    }
  };

  const handleDeleteItem = async (entryId, itemIndex) => {
    try {
      const entry = entries.find(e => e.id === entryId);
      if (entry && entry.items[itemIndex]) {
        await DataService.deleteEntryItem(entry.items[itemIndex].id);
        await loadEntries(); // Reload to get updated data
      }
    } catch (err) {
      console.error('Failed to delete item:', err);
      // Fallback to local state update
      setEntries((prev) => 
        prev.map((entry) => 
          entry.id === entryId 
            ? { ...entry, items: entry.items.filter((_, i) => i !== itemIndex) }
            : entry
        )
      );
    }
  };

  if (isLoading) {
    return (
      <div style={{ padding: '16px', fontFamily: 'sans-serif', maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
        <h1 style={{ margin: 0, fontSize: '1.5rem' }}>📒 ScoBro Logbook</h1>
        <p>Loading entries...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '16px', fontFamily: 'sans-serif', maxWidth: '800px', margin: '0 auto' }}>
      <UpdateBanner />
      <div style={{ marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.5rem' }}>📒 ScoBro Logbook</h1>
          <div style={{ fontSize: '12px', color: '#666', marginTop: '2px' }}>
            Status: {syncStatus === 'synced' ? '🟢 Synced' : syncStatus === 'pending' ? '🟡 Pending' : '🔴 Offline'}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => DataService.exportAndDownloadCSV()}
            style={{
              padding: '6px 12px',
              backgroundColor: '#28a745',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px',
            }}
          >
            📊 CSV
          </button>
          <button
            onClick={() => DataService.exportAndDownloadMarkdown()}
            style={{
              padding: '6px 12px',
              backgroundColor: '#6f42c1',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px',
            }}
          >
            📝 MD
          </button>
          <button
            onClick={() => setShowPopup(true)}
            style={{
              padding: '6px 12px',
              backgroundColor: '#0275d8',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            ➕ New Entry
          </button>
        </div>
      </div>
      <Dashboard entries={entries} onDeleteItem={handleDeleteItem} />
      <EntryPopup
        isOpen={showPopup}
        onSave={handleSaveItems}
        onClose={() => setShowPopup(false)}
      />
    </div>
  );
}