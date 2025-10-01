import React, { useState, useEffect } from 'react';
import { CalendarService } from '../services/calendarService.js';

/**
 * CalendarSyncModal - Calendar synchronization interface
 * Provides functionality to connect and sync with Google Calendar and Microsoft Outlook
 */
export default function CalendarSyncModal({ isOpen, onClose, onEventsSynced }) {
  const [config, setConfig] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [syncStatus, setSyncStatus] = useState(null);

  useEffect(() => {
    if (isOpen) {
      loadCalendarConfig();
      loadUpcomingEvents();
    }
  }, [isOpen]);

  const loadCalendarConfig = () => {
    try {
      const calendarConfig = CalendarService.getCalendarConfig();
      setConfig(calendarConfig);
      setSyncStatus(CalendarService.getSyncStatus());
    } catch (error) {
      console.error('Failed to load calendar config:', error);
    }
  };

  const loadUpcomingEvents = async () => {
    try {
      const events = await CalendarService.getUpcomingEvents(24);
      setUpcomingEvents(events);
    } catch (error) {
      console.error('Failed to load upcoming events:', error);
    }
  };

  const handleGoogleConnect = async () => {
    setIsLoading(true);
    try {
      const newConfig = await CalendarService.initializeGoogleCalendar();
      setConfig(newConfig);
      setSyncStatus(CalendarService.getSyncStatus());
      setTestResult({
        success: true,
        message: 'Successfully connected to Google Calendar!'
      });
    } catch (error) {
      setTestResult({
        success: false,
        message: `Failed to connect to Google Calendar: ${error.message}`
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleMicrosoftConnect = async () => {
    setIsLoading(true);
    try {
      const newConfig = await CalendarService.initializeMicrosoftOutlook();
      setConfig(newConfig);
      setSyncStatus(CalendarService.getSyncStatus());
      setTestResult({
        success: true,
        message: 'Successfully connected to Microsoft Outlook!'
      });
    } catch (error) {
      setTestResult({
        success: false,
        message: `Failed to connect to Microsoft Outlook: ${error.message}`
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = () => {
    if (confirm('Are you sure you want to disconnect your calendar?')) {
      CalendarService.disconnectCalendar();
      setConfig(CalendarService.getCalendarConfig());
      setSyncStatus(CalendarService.getSyncStatus());
      setUpcomingEvents([]);
      setTestResult(null);
    }
  };

  const handleTestConnection = async () => {
    setIsLoading(true);
    try {
      const result = await CalendarService.testConnection();
      setTestResult(result);
    } catch (error) {
      setTestResult({
        success: false,
        message: `Test failed: ${error.message}`
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSyncEvents = async () => {
    setIsLoading(true);
    try {
      const events = await CalendarService.syncCalendarEvents();
      setSyncStatus(CalendarService.getSyncStatus());
      await loadUpcomingEvents();
      
      if (onEventsSynced) {
        onEventsSynced(events);
      }
      
      setTestResult({
        success: true,
        message: `Successfully synced ${events.length} calendar events!`
      });
    } catch (error) {
      setTestResult({
        success: false,
        message: `Failed to sync events: ${error.message}`
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfigChange = (key, value) => {
    const newConfig = { ...config, [key]: value };
    setConfig(newConfig);
    CalendarService.saveCalendarConfig(newConfig);
  };

  const formatEventTime = (startTime, endTime) => {
    const start = new Date(startTime);
    const end = new Date(endTime);
    const startStr = start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const endStr = end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return `${startStr} - ${endStr}`;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'synced': return '#28a745';
      case 'stale': return '#ffc107';
      case 'disabled': return '#6c757d';
      case 'error': return '#dc3545';
      default: return '#6c757d';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'synced': return '✅';
      case 'stale': return '⚠️';
      case 'disabled': return '❌';
      case 'error': return '❌';
      default: return '❓';
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(0,0,0,0.3)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
      }}
    >
      <div
        style={{
          backgroundColor: 'white',
          padding: '24px',
          borderRadius: '8px',
          width: '90%',
          maxWidth: '900px',
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            🗓️ Calendar Sync
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: '20px',
              cursor: 'pointer',
              color: '#666'
            }}
          >
            ✕
          </button>
        </div>

        {/* Connection Status */}
        {syncStatus && (
          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ marginBottom: '8px' }}>Connection Status</h3>
            <div style={{
              padding: '12px',
              backgroundColor: '#f8f9fa',
              border: `2px solid ${getStatusColor(syncStatus.status)}`,
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span style={{ fontSize: '16px' }}>{getStatusIcon(syncStatus.status)}</span>
              <div>
                <div style={{ fontWeight: 'bold', color: getStatusColor(syncStatus.status) }}>
                  {syncStatus.status.charAt(0).toUpperCase() + syncStatus.status.slice(1).replace('_', ' ')}
                </div>
                <div style={{ fontSize: '14px', color: '#6c757d' }}>
                  {syncStatus.message}
                </div>
                {syncStatus.lastSync && (
                  <div style={{ fontSize: '12px', color: '#6c757d' }}>
                    Last sync: {new Date(syncStatus.lastSync).toLocaleString()}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Provider Selection */}
        {!config?.enabled && (
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ marginBottom: '12px' }}>Connect Your Calendar</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <button
                onClick={handleGoogleConnect}
                disabled={isLoading}
                style={{
                  padding: '20px',
                  backgroundColor: '#4285f4',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  opacity: isLoading ? 0.6 : 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <span style={{ fontSize: '24px' }}>📅</span>
                <div style={{ fontWeight: 'bold' }}>Google Calendar</div>
                <div style={{ fontSize: '12px', opacity: 0.9 }}>Sync with Google Calendar</div>
              </button>
              
              <button
                onClick={handleMicrosoftConnect}
                disabled={isLoading}
                style={{
                  padding: '20px',
                  backgroundColor: '#0078d4',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  opacity: isLoading ? 0.6 : 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <span style={{ fontSize: '24px' }}>📅</span>
                <div style={{ fontWeight: 'bold' }}>Microsoft Outlook</div>
                <div style={{ fontSize: '12px', opacity: 0.9 }}>Sync with Outlook Calendar</div>
              </button>
            </div>
          </div>
        )}

        {/* Configuration */}
        {config?.enabled && (
          <div style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0 }}>Configuration</h3>
              <button
                onClick={handleDisconnect}
                style={{
                  padding: '6px 12px',
                  backgroundColor: '#dc3545',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
              >
                Disconnect
              </button>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>
                  Provider
                </label>
                <div style={{
                  padding: '8px',
                  backgroundColor: '#f8f9fa',
                  borderRadius: '4px',
                  textTransform: 'capitalize'
                }}>
                  {config.provider}
                </div>
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>
                  Sync Interval (minutes)
                </label>
                <select
                  value={config.syncInterval}
                  onChange={(e) => handleConfigChange('syncInterval', parseInt(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #ccc',
                    borderRadius: '4px'
                  }}
                >
                  <option value={5}>5 minutes</option>
                  <option value={15}>15 minutes</option>
                  <option value={30}>30 minutes</option>
                  <option value={60}>1 hour</option>
                </select>
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>
                  Sync Past Days
                </label>
                <input
                  type="number"
                  value={config.syncPastDays}
                  onChange={(e) => handleConfigChange('syncPastDays', parseInt(e.target.value))}
                  min="1"
                  max="30"
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #ccc',
                    borderRadius: '4px'
                  }}
                />
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>
                  Sync Future Days
                </label>
                <input
                  type="number"
                  value={config.syncFutureDays}
                  onChange={(e) => handleConfigChange('syncFutureDays', parseInt(e.target.value))}
                  min="1"
                  max="90"
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #ccc',
                    borderRadius: '4px'
                  }}
                />
              </div>
            </div>
            
            <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="checkbox"
                  checked={config.autoCreateEntries}
                  onChange={(e) => handleConfigChange('autoCreateEntries', e.target.checked)}
                />
                Auto-create entries from events
              </label>
              
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="checkbox"
                  checked={config.includeAllDayEvents}
                  onChange={(e) => handleConfigChange('includeAllDayEvents', e.target.checked)}
                />
                Include all-day events
              </label>
            </div>
          </div>
        )}

        {/* Actions */}
        {config?.enabled && (
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ marginBottom: '12px' }}>Actions</h3>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={handleTestConnection}
                disabled={isLoading}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#17a2b8',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  opacity: isLoading ? 0.6 : 1
                }}
              >
                {isLoading ? '⏳' : '🔍'} Test Connection
              </button>
              
              <button
                onClick={handleSyncEvents}
                disabled={isLoading}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#28a745',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  opacity: isLoading ? 0.6 : 1
                }}
              >
                {isLoading ? '⏳' : '🔄'} Sync Events
              </button>
            </div>
          </div>
        )}

        {/* Test Result */}
        {testResult && (
          <div style={{ marginBottom: '24px' }}>
            <div style={{
              padding: '12px',
              backgroundColor: testResult.success ? '#d4edda' : '#f8d7da',
              border: `1px solid ${testResult.success ? '#c3e6cb' : '#f5c6cb'}`,
              borderRadius: '6px',
              color: testResult.success ? '#155724' : '#721c24'
            }}>
              <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                {testResult.success ? '✅ Success' : '❌ Error'}
              </div>
              <div>{testResult.message}</div>
            </div>
          </div>
        )}

        {/* Upcoming Events */}
        {upcomingEvents.length > 0 && (
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ marginBottom: '12px' }}>📅 Upcoming Events (Next 24 Hours)</h3>
            <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
              {upcomingEvents.map((event) => (
                <div
                  key={event.id}
                  style={{
                    padding: '12px',
                    backgroundColor: '#f8f9fa',
                    border: '1px solid #dee2e6',
                    borderRadius: '6px',
                    marginBottom: '8px'
                  }}
                >
                  <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                    {event.title}
                  </div>
                  <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '4px' }}>
                    {formatEventTime(event.start, event.end)}
                  </div>
                  {event.description && (
                    <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '4px' }}>
                      {event.description}
                    </div>
                  )}
                  {event.location && (
                    <div style={{ fontSize: '12px', color: '#6c757d' }}>
                      📍 {event.location}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Close Button */}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px',
              backgroundColor: '#6c757d',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
