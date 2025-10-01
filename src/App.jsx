import React, { useEffect, useState } from 'react';
import UpdateBanner from './components/UpdateBanner.jsx';
import EntryPopup from './components/EntryPopup.jsx';
import Dashboard from './components/Dashboard.jsx';
import ProjectsManager from './components/ProjectsManager.jsx';
import TagsManager from './components/TagsManager.jsx';
import MeetingsManager from './components/MeetingsManager.jsx';
import AuthModal from './components/AuthModal.jsx';
import EmailConfigModal from './components/EmailConfigModal.jsx';
import { DataService } from './services/dataService.js';
import { SupabaseService } from './services/supabaseService.js';

// Attempt to import Tauri APIs. If running in development (non-tauri) 
// these will be undefined and the useEffect below will simply not register.
import { listen } from '@tauri-apps/api/event';

/**
 * Top-level application component. It manages global state for
 * entries, popup visibility and handles saving/loading from
 * SQLite database via Tauri commands. It listens for tray menu
 * events to open the popup when running inside a Tauri environment.
 */
export default function App() {
  const [entries, setEntries] = useState([]);
  const [showPopup, setShowPopup] = useState(false);
  const [showProjectsManager, setShowProjectsManager] = useState(false);
  const [showTagsManager, setShowTagsManager] = useState(false);
  const [showMeetingsManager, setShowMeetingsManager] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showEmailConfig, setShowEmailConfig] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState('offline');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);

  // Load entries from SQLite database on mount and check authentication
  useEffect(() => {
    loadEntries();
    checkAuthentication();
  }, []);

  // Set up real-time sync when authenticated
  useEffect(() => {
    let subscription = null;
    
    if (isAuthenticated) {
      // Set up real-time subscription
      subscription = SupabaseService.subscribeToEntries((payload) => {
        console.log('Real-time update received:', payload);
        // Reload entries to get the latest data
        loadEntries();
      });
    }

    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, [isAuthenticated]);

  const checkAuthentication = async () => {
    try {
      const authStatus = await SupabaseService.isAuthenticated();
      setIsAuthenticated(authStatus);
      
      if (authStatus) {
        const { data: { user } } = await SupabaseService.getCurrentUser();
        setUser(user);
        setSyncStatus('synced');
      } else {
        setSyncStatus('offline');
      }
    } catch (error) {
      console.error('Failed to check authentication:', error);
      setIsAuthenticated(false);
      setSyncStatus('offline');
    }
  };

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

  // Note: Global shortcuts are not available in Tauri 2.0 beta
  // Users can use the tray menu or the New Entry button instead

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
      
      // Try to sync to Supabase in background if authenticated
      if (isAuthenticated) {
        try {
          await SupabaseService.syncEntries([newEntry]);
          setSyncStatus('synced');
        } catch (syncErr) {
          console.warn('Failed to sync to Supabase:', syncErr);
          setSyncStatus('pending');
        }
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

  const handleAuthSuccess = async () => {
    setIsAuthenticated(true);
    setShowAuthModal(false);
    await checkAuthentication();
    
    // Sync existing entries to Supabase
    try {
      await SupabaseService.syncEntries(entries);
      setSyncStatus('synced');
    } catch (error) {
      console.warn('Failed to sync existing entries:', error);
      setSyncStatus('pending');
    }
  };

  const handleSignOut = async () => {
    try {
      await SupabaseService.signOut();
      setIsAuthenticated(false);
      setUser(null);
      setSyncStatus('offline');
    } catch (error) {
      console.error('Failed to sign out:', error);
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
            {isAuthenticated && user && (
              <span style={{ marginLeft: '8px' }}>
                • 👤 {user.email}
              </span>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setShowProjectsManager(true)}
            style={{
              padding: '6px 12px',
              backgroundColor: '#17a2b8',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px',
            }}
          >
            📂 Projects
          </button>
          <button
            onClick={() => setShowTagsManager(true)}
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
            🏷️ Tags
          </button>
          <button
            onClick={() => setShowMeetingsManager(true)}
            style={{
              padding: '6px 12px',
              backgroundColor: '#fd7e14',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px',
            }}
          >
            📅 Meetings
          </button>
          <button
            onClick={() => setShowEmailConfig(true)}
            style={{
              padding: '6px 12px',
              backgroundColor: '#e83e8c',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px',
            }}
          >
            📧 Email
          </button>
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
              backgroundColor: '#6c757d',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px',
            }}
          >
            📝 MD
          </button>
          {!isAuthenticated && (
            <button
              onClick={() => setShowAuthModal(true)}
              style={{
                padding: '6px 12px',
                backgroundColor: '#17a2b8',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px',
              }}
            >
              🔐 Sign In
            </button>
          )}
          {isAuthenticated && (
            <>
              <button
                onClick={async () => {
                  try {
                    setSyncStatus('pending');
                    await SupabaseService.syncEntriesBidirectional(entries);
                    setSyncStatus('synced');
                  } catch (error) {
                    console.error('Sync failed:', error);
                    setSyncStatus('offline');
                  }
                }}
                style={{
                  padding: '6px 12px',
                  backgroundColor: '#17a2b8',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px',
                }}
              >
                🔄 Sync
              </button>
              <button
                onClick={handleSignOut}
                style={{
                  padding: '6px 12px',
                  backgroundColor: '#6c757d',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px',
                }}
              >
                🚪 Sign Out
              </button>
            </>
          )}
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
      <ProjectsManager
        isOpen={showProjectsManager}
        onClose={() => setShowProjectsManager(false)}
      />
      <TagsManager
        isOpen={showTagsManager}
        onClose={() => setShowTagsManager(false)}
      />
      <MeetingsManager
        isOpen={showMeetingsManager}
        onClose={() => setShowMeetingsManager(false)}
      />
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onAuthSuccess={handleAuthSuccess}
      />
      <EmailConfigModal
        isOpen={showEmailConfig}
        onClose={() => setShowEmailConfig(false)}
      />
    </div>
  );
}