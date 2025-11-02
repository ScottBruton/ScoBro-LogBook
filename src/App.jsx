import React, { useEffect, useState } from 'react';
import UpdateBanner from './components/UpdateBanner.jsx';
import EntryPopup from './components/EntryPopup.jsx';
import Dashboard from './components/Dashboard.jsx';
import ProjectsManager from './components/ProjectsManager.jsx';
import TagsManager from './components/TagsManager.jsx';
import MeetingsManager from './components/MeetingsManager.jsx';
import AuthModal from './components/AuthModal.jsx';
import EmailConfigModal from './components/EmailConfigModal.jsx';
import SmartPromptsModal from './components/SmartPromptsModal.jsx';
import TimeTrackingModal from './components/TimeTrackingModal.jsx';
import CalendarSyncModal from './components/CalendarSyncModal.jsx';
import JiraApiModal from './components/JiraApiModal.jsx';
import AnalyticsDashboard from './components/AnalyticsDashboard.jsx';
import JiraDashboardPanel from './components/JiraDashboardPanel.jsx';
import AppHeader from './components/AppHeader.jsx';
import { ThemeProvider, useTheme } from './contexts/ThemeContext.jsx';
import { DataService } from './services/dataService.js';
import { SupabaseService } from './services/supabaseService.js';
import { SmartPromptsService } from './services/smartPromptsService.js';
import { TimeTrackingService } from './services/timeTrackingService.js';
import { CalendarService } from './services/calendarService.js';
import { JiraApiService } from './services/jiraApiService.js';
import { AnalyticsService } from './services/analyticsService.js';
import { ConnectionStatusService } from './services/connectionStatusService.js';
// import { FileLogger } from './services/fileLogger.js'; // Removed to prevent crash

// Check if we're running in Tauri environment
const isTauri = typeof window !== 'undefined' && window.__TAURI__;

/**
 * Top-level application component. It manages global state for
 * entries, popup visibility and handles saving/loading from
 * SQLite database via Tauri commands. It listens for tray menu
 * events to open the popup when running inside a Tauri environment.
 */
export default function App() {
  console.log('🎯 ScoBro Logbook: App component initializing...');
  
  const [entries, setEntries] = useState([]);
  const [showPopup, setShowPopup] = useState(false);
  const [showProjectsManager, setShowProjectsManager] = useState(false);
  const [showTagsManager, setShowTagsManager] = useState(false);
  const [showMeetingsManager, setShowMeetingsManager] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showEmailConfig, setShowEmailConfig] = useState(false);
  const [showSmartPrompts, setShowSmartPrompts] = useState(false);
  const [showTimeTracking, setShowTimeTracking] = useState(false);
  const [showCalendarSync, setShowCalendarSync] = useState(false);
  const [showJiraApi, setShowJiraApi] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState('offline');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [smartPromptNudge, setSmartPromptNudge] = useState(null);
  const [statusRefreshTrigger, setStatusRefreshTrigger] = useState(0);
  const [jiraDashboardRefreshTrigger, setJiraDashboardRefreshTrigger] = useState(0);
  const [isJiraMenuOpen, setIsJiraMenuOpen] = useState(false);

  // Load entries from SQLite database on mount and check authentication
  useEffect(() => {
    // // FileLogger.info('🔄 ScoBro Logbook: App useEffect starting...');
    console.log('🔄 ScoBro Logbook: App useEffect starting...');
    try {
      // FileLogger.info('📊 ScoBro Logbook: Loading entries...');
      console.log('📊 ScoBro Logbook: Loading entries...');
      loadEntries();
      // FileLogger.info('🔐 ScoBro Logbook: Checking authentication...');
      console.log('🔐 ScoBro Logbook: Checking authentication...');
      checkAuthentication();
      // FileLogger.info('🧠 ScoBro Logbook: Setting up smart prompts...');
      console.log('🧠 ScoBro Logbook: Setting up smart prompts...');
      setupSmartPrompts();
      // FileLogger.info('✅ ScoBro Logbook: App useEffect completed successfully');
      console.log('✅ ScoBro Logbook: App useEffect completed successfully');
    } catch (error) {
      // FileLogger.error('💥 ScoBro Logbook: Error in App useEffect', { message: error.message, stack: error.stack });
      console.error('💥 ScoBro Logbook: Error in App useEffect:', error);
      console.error('Stack trace:', error.stack);
    }
  }, []);

  // Set up smart prompts nudges
  useEffect(() => {
    const interval = setInterval(() => {
      checkForSmartPromptNudge();
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [entries]);

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

  // Set up debug keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (event) => {
      // Ctrl+Shift+D to toggle debug button
      if (event.ctrlKey && event.shiftKey && event.key === 'D') {
        event.preventDefault();
        const debugButton = document.getElementById('debug-button');
        if (debugButton) {
          debugButton.style.display = debugButton.style.display === 'none' ? 'block' : 'none';
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const checkAuthentication = async () => {
    console.log('🔐 ScoBro Logbook: checkAuthentication function called');
    try {
      console.log('🔍 ScoBro Logbook: Checking authentication status...');
      const authStatus = await SupabaseService.isAuthenticated();
      console.log('✅ ScoBro Logbook: Authentication status:', authStatus);
      setIsAuthenticated(authStatus);
      
      if (authStatus) {
        console.log('👤 ScoBro Logbook: Getting current user...');
        const { data: { user } } = await SupabaseService.getCurrentUser();
        console.log('✅ ScoBro Logbook: User loaded:', user?.email || 'Unknown');
        setUser(user);
        setSyncStatus('synced');
      } else {
        console.log('ℹ️ ScoBro Logbook: User not authenticated, setting offline status');
        setSyncStatus('offline');
      }
    } catch (error) {
      console.error('💥 ScoBro Logbook: Failed to check authentication:', error);
      console.error('Stack trace:', error.stack);
      setIsAuthenticated(false);
      setSyncStatus('offline');
    }
  };

  const loadEntries = async () => {
    // FileLogger.info('📊 ScoBro Logbook: loadEntries function called');
    console.log('📊 ScoBro Logbook: loadEntries function called');
    try {
      // FileLogger.info('⏳ ScoBro Logbook: Setting loading state...');
      console.log('⏳ ScoBro Logbook: Setting loading state...');
      setIsLoading(true);
      // FileLogger.info('🔍 ScoBro Logbook: Calling DataService.getAllEntries()...');
      console.log('🔍 ScoBro Logbook: Calling DataService.getAllEntries()...');
      const data = await DataService.getAllEntries();
      // FileLogger.info('✅ ScoBro Logbook: Entries loaded successfully', { entryCount: data?.length || 0 });
      console.log('✅ ScoBro Logbook: Entries loaded successfully:', data?.length || 0, 'entries');
      setEntries(data);
    } catch (err) {
      // FileLogger.error('💥 ScoBro Logbook: Failed to load entries', { message: err.message, stack: err.stack });
      console.error('💥 ScoBro Logbook: Failed to load entries:', err);
      console.error('Stack trace:', err.stack);
      // Fallback to localStorage for development
      // FileLogger.info('🔄 ScoBro Logbook: Attempting localStorage fallback...');
      console.log('🔄 ScoBro Logbook: Attempting localStorage fallback...');
      const stored = localStorage.getItem('scobro_entries');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          // FileLogger.info('✅ ScoBro Logbook: Loaded entries from localStorage', { entryCount: parsed?.length || 0 });
          console.log('✅ ScoBro Logbook: Loaded entries from localStorage:', parsed?.length || 0, 'entries');
          setEntries(parsed);
        } catch (parseErr) {
          // FileLogger.error('💥 ScoBro Logbook: Failed to parse stored entries', { message: parseErr.message, stack: parseErr.stack });
          console.error('💥 ScoBro Logbook: Failed to parse stored entries', parseErr);
        }
      } else {
        console.log('ℹ️ ScoBro Logbook: No entries found in localStorage');
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
    if (isTauri) {
      // Only try to use Tauri APIs if we're in Tauri environment
      import('@tauri-apps/api/event').then(({ listen: tauriListen }) => {
        tauriListen('quick-add', () => {
          setShowPopup(true);
        }).then((unlistenFn) => {
          unlisten = unlistenFn;
        });
      }).catch((error) => {
        console.log('🔧 ScoBro Logbook: Tauri event listener not available:', error.message);
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

  const setupSmartPrompts = () => {
    console.log('🧠 ScoBro Logbook: setupSmartPrompts function called');
    try {
      console.log('🔍 ScoBro Logbook: Getting nudge config...');
      const config = SmartPromptsService.getNudgeConfig();
      console.log('✅ ScoBro Logbook: Nudge config loaded:', config);
      if (config.enabled) {
        console.log('🔔 ScoBro Logbook: Smart prompts enabled, checking for nudges...');
        checkForSmartPromptNudge();
      } else {
        console.log('ℹ️ ScoBro Logbook: Smart prompts disabled');
      }
    } catch (error) {
      console.error('💥 ScoBro Logbook: Error in setupSmartPrompts:', error);
      console.error('Stack trace:', error.stack);
    }
  };

  const checkForSmartPromptNudge = async () => {
    try {
      const config = SmartPromptsService.getNudgeConfig();
      if (!config.enabled || SmartPromptsService.isQuietHours()) {
        return;
      }

      const lastNudgeTime = localStorage.getItem('lastSmartPromptNudge');
      if (!SmartPromptsService.shouldShowNudge(lastNudgeTime)) {
        return;
      }

      const prompt = await SmartPromptsService.getSmartPrompt();
      if (prompt.priority === 'high' || Math.random() < 0.3) { // 30% chance for medium/low priority
        setSmartPromptNudge(prompt);
        localStorage.setItem('lastSmartPromptNudge', new Date().toISOString());
      }
    } catch (error) {
      console.error('Failed to check for smart prompt nudge:', error);
    }
  };

  const handleSmartPromptSelect = (prompt) => {
    // Create a new entry with the selected prompt
    const items = [{
      item_type: 'Note',
      content: prompt,
      project: '',
      tags: ['smart-prompt'],
      jira: [],
      people: []
    }];
    
    handleSaveItems(items);
    setSmartPromptNudge(null);
  };

  const handleTimerComplete = async (completedTimer) => {
    try {
      // Create an entry from the completed timer
      const entry = TimeTrackingService.createEntryFromTimer(completedTimer, 'Note');
      const items = [entry];
      
      await handleSaveItems(items);
    } catch (error) {
      console.error('Failed to create entry from timer:', error);
    }
  };

  const handleCalendarEventsSynced = async (events) => {
    try {
      const config = CalendarService.getCalendarConfig();
      if (!config.autoCreateEntries) {
        return;
      }

      // Convert calendar events to entries
      const entries = events.map(event => CalendarService.convertEventToEntry(event));
      
      if (entries.length > 0) {
        await handleSaveItems(entries);
      }
    } catch (error) {
      console.error('Failed to create entries from calendar events:', error);
    }
  };

  const handleJiraIssuesSynced = async (issues) => {
    try {
      // Refresh the Jira dashboard panel when data is synced
      setJiraDashboardRefreshTrigger(prev => prev + 1);
      
      // Create entries from synced Jira issues (if issues array is provided)
      if (issues && Array.isArray(issues)) {
        const newEntries = issues.map(issue => ({
        item_type: 'Note',
        content: `${JiraApiService.getIssueTypeIcon(issue.issueType)} ${issue.key}: ${issue.summary}`,
        project: issue.project,
        tags: ['jira', issue.issueType.toLowerCase(), issue.status.toLowerCase()],
        jira: [issue.key],
        people: [issue.assignee, issue.reporter].filter(Boolean),
        metadata: {
          jiraIssue: issue,
          syncedAt: new Date().toISOString()
        }
      }));
      
      if (newEntries.length > 0) {
        await handleSaveItems(newEntries);
      }
      }
    } catch (error) {
      console.error('Failed to create entries from Jira issues:', error);
    }
  };

  const handleStatusClick = (service) => {
    switch (service) {
      case 'supabase':
        setShowAuthModal(true);
        break;
      case 'email':
        setShowEmailConfig(true);
        break;
      case 'jira':
        setShowJiraApi(true);
        break;
      case 'calendar':
        setShowCalendarSync(true);
        break;
      case 'analytics':
        setShowAnalytics(true);
        break;
      default:
        console.log(`Status clicked for ${service}`);
    }
  };

  if (isLoading) {
    console.log('⏳ ScoBro Logbook: App is loading, showing loading screen');
    return (
      <div style={{ padding: '16px', fontFamily: 'sans-serif', maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
        <h1 style={{ margin: 0, fontSize: '1.5rem' }}>📒 ScoBro Logbook</h1>
        <p>Loading entries...</p>
      </div>
    );
  }

  console.log('🎨 ScoBro Logbook: Rendering main app interface');
  try {
    return (
    <ThemeProvider>
      <AppContent 
        entries={entries}
        onDeleteItem={handleDeleteItem}
        showPopup={showPopup}
        setShowPopup={setShowPopup}
        handleSaveItems={handleSaveItems}
        showProjectsManager={showProjectsManager}
        setShowProjectsManager={setShowProjectsManager}
        showTagsManager={showTagsManager}
        setShowTagsManager={setShowTagsManager}
        showMeetingsManager={showMeetingsManager}
        setShowMeetingsManager={setShowMeetingsManager}
        showAuthModal={showAuthModal}
        setShowAuthModal={setShowAuthModal}
        showEmailConfig={showEmailConfig}
        setShowEmailConfig={setShowEmailConfig}
        showSmartPrompts={showSmartPrompts}
        setShowSmartPrompts={setShowSmartPrompts}
        showTimeTracking={showTimeTracking}
        setShowTimeTracking={setShowTimeTracking}
        showCalendarSync={showCalendarSync}
        setShowCalendarSync={setShowCalendarSync}
        showJiraApi={showJiraApi}
        setShowJiraApi={setShowJiraApi}
        showAnalytics={showAnalytics}
        setShowAnalytics={setShowAnalytics}
        syncStatus={syncStatus}
        setSyncStatus={setSyncStatus}
        isAuthenticated={isAuthenticated}
        user={user}
        handleStatusClick={handleStatusClick}
        statusRefreshTrigger={statusRefreshTrigger}
        setStatusRefreshTrigger={setStatusRefreshTrigger}
        handleSignOut={handleSignOut}
        handleAuthSuccess={handleAuthSuccess}
        handleSmartPromptSelect={handleSmartPromptSelect}
        handleTimerComplete={handleTimerComplete}
        handleCalendarEventsSynced={handleCalendarEventsSynced}
        handleJiraIssuesSynced={handleJiraIssuesSynced}
        jiraDashboardRefreshTrigger={jiraDashboardRefreshTrigger}
        smartPromptNudge={smartPromptNudge}
        setSmartPromptNudge={setSmartPromptNudge}
        SupabaseService={SupabaseService}
        DataService={DataService}
        isJiraMenuOpen={isJiraMenuOpen}
        setIsJiraMenuOpen={setIsJiraMenuOpen}
      />
    </ThemeProvider>
  );
  } catch (error) {
    console.error('💥 ScoBro Logbook: Error rendering App component:', error);
    console.error('Stack trace:', error.stack);
    
    return (
      <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif', color: 'red', maxWidth: '800px', margin: '0 auto' }}>
        <h2>🚨 ScoBro Logbook Render Error</h2>
        <p><strong>Error:</strong> {error.message}</p>
        <p><strong>Stack:</strong></p>
        <pre style={{ background: '#f5f5f5', padding: '10px', overflow: 'auto', fontSize: '12px' }}>{error.stack}</pre>
        <p>Check the console for more details.</p>
        <div style={{ marginTop: '20px' }}>
          <button 
            onClick={() => window.showConsoleInDOM && window.showConsoleInDOM()} 
            style={{ 
              padding: '10px 20px', 
              backgroundColor: '#007bff', 
              color: 'white', 
              border: 'none', 
              borderRadius: '4px', 
              cursor: 'pointer',
              marginRight: '10px'
            }}
          >
            Show Debug Console
          </button>
          <button 
            onClick={() => window.checkAppState && window.checkAppState()} 
            style={{ 
              padding: '10px 20px', 
              backgroundColor: '#28a745', 
              color: 'white', 
              border: 'none', 
              borderRadius: '4px', 
              cursor: 'pointer',
              marginRight: '10px'
            }}
          >
            Check App State
          </button>
          <button 
            onClick={() => window.location.reload()} 
            style={{ 
              padding: '10px 20px', 
              backgroundColor: '#dc3545', 
              color: 'white', 
              border: 'none', 
              borderRadius: '4px', 
              cursor: 'pointer'
            }}
          >
            Reload App
          </button>
        </div>
        <script src="debug-console.js"></script>
      </div>
    );
  }
}

// Separate component for the main app content
function AppContent({
  entries,
  onDeleteItem,
  showPopup,
  setShowPopup,
  handleSaveItems,
  showProjectsManager,
  setShowProjectsManager,
  showTagsManager,
  setShowTagsManager,
  showMeetingsManager,
  setShowMeetingsManager,
  showAuthModal,
  setShowAuthModal,
  showEmailConfig,
  setShowEmailConfig,
  showSmartPrompts,
  setShowSmartPrompts,
  showTimeTracking,
  setShowTimeTracking,
  showCalendarSync,
  setShowCalendarSync,
  showJiraApi,
  setShowJiraApi,
  showAnalytics,
  setShowAnalytics,
  syncStatus,
  setSyncStatus,
  isAuthenticated,
  user,
  handleStatusClick,
  statusRefreshTrigger,
  setStatusRefreshTrigger,
  handleSignOut,
  handleAuthSuccess,
  handleSmartPromptSelect,
  handleTimerComplete,
  handleCalendarEventsSynced,
  handleJiraIssuesSynced,
  jiraDashboardRefreshTrigger,
  smartPromptNudge,
  setSmartPromptNudge,
  SupabaseService,
  DataService,
  isJiraMenuOpen,
  setIsJiraMenuOpen
}) {
  const theme = useTheme();
  
  return (
    <div style={{ 
      padding: '16px', 
      fontFamily: 'sans-serif', 
      maxWidth: '800px', 
      margin: '0 auto',
      backgroundColor: theme.colors.background,
      color: theme.colors.text,
      minHeight: '100vh'
    }}>
      <UpdateBanner />
      
      {/* Hidden Debug Button - Press Ctrl+Shift+D to show */}
      <div id="debug-button" style={{ 
        position: 'fixed', 
        top: '10px', 
        right: '10px', 
        zIndex: 1000,
        display: 'none'
      }}>
        <button 
          onClick={() => window.showConsoleInDOM && window.showConsoleInDOM()} 
          style={{ 
            padding: '5px 10px', 
            backgroundColor: '#007bff', 
            color: 'white', 
            border: 'none', 
            borderRadius: '4px', 
            cursor: 'pointer',
            fontSize: '12px'
          }}
        >
          🔧 Debug
        </button>
      </div>
      {/* App Header with Burger Menu and Status Pills */}
      <AppHeader
        onProjectsClick={() => setShowProjectsManager(true)}
        onTagsClick={() => setShowTagsManager(true)}
        onMeetingsClick={() => setShowMeetingsManager(true)}
        onSmartPromptsClick={() => setShowSmartPrompts(true)}
        onTimeTrackingClick={() => setShowTimeTracking(true)}
        onCsvClick={() => DataService.exportAndDownloadCSV()}
        onMarkdownClick={() => DataService.exportAndDownloadMarkdown()}
        onSyncClick={async () => {
                  try {
                    setSyncStatus('pending');
                    await SupabaseService.syncEntriesBidirectional(entries);
                    setSyncStatus('synced');
                  } catch (error) {
                    console.error('Sync failed:', error);
                    setSyncStatus('offline');
                  }
                }}
        onSignOutClick={handleSignOut}
        onNewEntryClick={() => setShowPopup(true)}
        onStatusClick={handleStatusClick}
        isAuthenticated={isAuthenticated}
        refreshTrigger={statusRefreshTrigger}
        syncStatus={syncStatus}
        user={user}
        onSignInClick={() => setShowAuthModal(true)}
        onJiraMenuToggle={() => setIsJiraMenuOpen(prev => !prev)}
      />

      {/* Main Content - Add top padding to account for fixed header */}
      <div style={{ paddingTop: '70px' }}>
        <Dashboard entries={entries} onDeleteItem={onDeleteItem} jiraDashboardRefreshTrigger={jiraDashboardRefreshTrigger} />
      </div>
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
        onSave={() => {
          // Trigger status refresh
          setStatusRefreshTrigger(prev => prev + 1);
          console.log('📧 Email configured, triggering status refresh');
        }}
      />
      <SmartPromptsModal
        isOpen={showSmartPrompts}
        onClose={() => setShowSmartPrompts(false)}
        onPromptSelect={handleSmartPromptSelect}
        entries={entries}
      />
      <TimeTrackingModal
        isOpen={showTimeTracking}
        onClose={() => setShowTimeTracking(false)}
        onTimerComplete={handleTimerComplete}
      />
      <CalendarSyncModal
        isOpen={showCalendarSync}
        onClose={() => setShowCalendarSync(false)}
        onEventsSynced={handleCalendarEventsSynced}
      />
      <JiraApiModal
        isOpen={showJiraApi}
        onClose={() => setShowJiraApi(false)}
        onIssuesSynced={handleJiraIssuesSynced}
      />
      <AnalyticsDashboard
        isOpen={showAnalytics}
        onClose={() => setShowAnalytics(false)}
        entries={entries}
      />
      
      {/* Right-side Jira Tasks Menu */}
      <JiraDashboardPanel
        isOpen={isJiraMenuOpen}
        onClose={() => setIsJiraMenuOpen(false)}
        refreshTrigger={jiraDashboardRefreshTrigger}
      />
      
      {/* Smart Prompt Nudge */}
      {smartPromptNudge && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            backgroundColor: '#fff',
            border: '2px solid #6f42c1',
            borderRadius: '8px',
            padding: '16px',
            maxWidth: '300px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            zIndex: 1001,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
            <h4 style={{ margin: 0, color: '#6f42c1' }}>🧠 Smart Prompt</h4>
            <button
              onClick={() => setSmartPromptNudge(null)}
              style={{
                background: 'transparent',
                border: 'none',
                fontSize: '16px',
                cursor: 'pointer',
                color: '#666'
              }}
            >
              ✕
            </button>
          </div>
          <p style={{ margin: '0 0 12px 0', fontSize: '14px', lineHeight: '1.4' }}>
            {smartPromptNudge.prompt}
          </p>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => handleSmartPromptSelect(smartPromptNudge.prompt)}
              style={{
                padding: '6px 12px',
                backgroundColor: '#6f42c1',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px',
                flex: 1
              }}
            >
              Use This Prompt
            </button>
            <button
              onClick={() => setSmartPromptNudge(null)}
              style={{
                padding: '6px 12px',
                backgroundColor: '#6c757d',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
    </div>
    );
}