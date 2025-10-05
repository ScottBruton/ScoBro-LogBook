import React, { useState, useEffect } from 'react';
import { CalendarService } from '../services/calendarService.js';

/**
 * CalendarSyncModal - Clean calendar synchronization interface
 * Shows synced calendars, OAuth status, and export functionality
 */
export default function CalendarSyncModal({ isOpen, onClose, onEventsSynced }) {
  const [config, setConfig] = useState({
    enabled: false,
    calendars: [],
    syncInterval: 15,
    lastSync: null,
    autoCreateEntries: true,
    includeAllDayEvents: false,
    syncPastDays: 7,
    syncFutureDays: 30
  });
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

  // Listen for calendar connection events
  useEffect(() => {
    const handleCalendarConnected = (event) => {
      console.log('📅 CalendarSyncModal: Calendar connected event received:', event.detail);
      setIsLoading(false); // Reset loading state
      loadCalendarConfig();
      setTestResult({
        success: true,
        message: `Successfully connected to ${event.detail.provider} calendar: ${event.detail.calendar.name}${event.detail.calendar.email ? ` (${event.detail.calendar.email})` : ''}`
      });
    };

    window.addEventListener('calendarConnected', handleCalendarConnected);
    
    return () => {
      window.removeEventListener('calendarConnected', handleCalendarConnected);
    };
  }, []);

  const loadCalendarConfig = () => {
    try {
      console.log('📅 CalendarSyncModal: Loading calendar config...');
      const calendarConfig = CalendarService.getCalendarConfig();
      console.log('📅 CalendarSyncModal: Loaded config:', calendarConfig);
      setConfig(prevConfig => ({
        ...prevConfig,
        ...calendarConfig
      }));
      setSyncStatus(CalendarService.getSyncStatus());
      console.log('📅 CalendarSyncModal: Config state updated, calendars count:', calendarConfig.calendars?.length || 0);
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
      console.log('📅 CalendarSyncModal: Starting Google Calendar connection...');
      const newCalendar = await CalendarService.initializeGoogleCalendar();
      console.log('📅 CalendarSyncModal: Google Calendar connected:', newCalendar);
      // Reload the full config to get updated calendars array
      loadCalendarConfig();
      setTestResult({
        success: true,
        message: `Successfully connected to Google Calendar: ${newCalendar.name}${newCalendar.email ? ` (${newCalendar.email})` : ''}`
      });
    } catch (error) {
      console.error('📅 CalendarSyncModal: Google Calendar connection failed:', error);
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
      console.log('📅 CalendarSyncModal: Starting Microsoft Outlook connection...');
      const newCalendar = await CalendarService.initializeMicrosoftOutlook();
      console.log('📅 CalendarSyncModal: Microsoft Outlook connected:', newCalendar);
      // Reload the full config to get updated calendars array
      loadCalendarConfig();
      setTestResult({
        success: true,
        message: `Successfully connected to Microsoft Outlook: ${newCalendar.name}${newCalendar.email ? ` (${newCalendar.email})` : ''}`
      });
    } catch (error) {
      console.error('📅 CalendarSyncModal: Microsoft Outlook connection failed:', error);
      setTestResult({
        success: false,
        message: `Failed to connect to Microsoft Outlook: ${error.message}`
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsLoading(true);
    try {
      await loadCalendarConfig();
      await loadUpcomingEvents();
      setTestResult({
        success: true,
        message: 'Calendar data refreshed successfully'
      });
    } catch (error) {
      setTestResult({
        success: false,
        message: `Failed to refresh: ${error.message}`
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportCalendar = async (calendar) => {
    try {
      setIsLoading(true);
      // Get events for the past and future month
      const now = new Date();
      const pastMonth = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
      const futureMonth = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
      
      // For now, we'll create a mock export since we don't have real API integration
      const mockEvents = [
        {
          title: 'Sample Meeting',
          start: new Date().toISOString(),
          end: new Date(Date.now() + 3600000).toISOString(),
          description: 'This is a sample event for export',
          location: 'Conference Room A'
        }
      ];

      // Create Excel-like CSV content
      const csvContent = [
        'Title,Start Date,Start Time,End Date,End Time,Description,Location',
        ...mockEvents.map(event => {
          const start = new Date(event.start);
          const end = new Date(event.end);
          return [
            `"${event.title}"`,
            start.toLocaleDateString(),
            start.toLocaleTimeString(),
            end.toLocaleDateString(),
            end.toLocaleTimeString(),
            `"${event.description || ''}"`,
            `"${event.location || ''}"`
          ].join(',');
        })
      ].join('\n');

      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `${calendar.provider}_${calendar.name}_export.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setTestResult({
        success: true,
        message: `Calendar exported successfully: ${calendar.provider}_${calendar.name}_export.csv`
      });
    } catch (error) {
      setTestResult({
        success: false,
        message: `Export failed: ${error.message}`
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveCalendar = (calendar) => {
    if (confirm(`Are you sure you want to disconnect ${calendar.provider} calendar for ${calendar.email || 'this account'}?`)) {
      CalendarService.removeCalendar(calendar.id);
      loadCalendarConfig();
      setTestResult({
        success: true,
        message: `Successfully disconnected ${calendar.provider} calendar`
      });
    }
  };

  const getStatusPill = (calendar) => {
    // For now, assume all connected calendars are authorized
    // In a real implementation, you'd check the actual OAuth token status
    const isAuthorized = calendar.accessToken && calendar.accessToken !== 'mock_access_token';
    
    return (
      <span
        style={{
          padding: '2px 8px',
          borderRadius: '12px',
          fontSize: '10px',
          fontWeight: 'bold',
          backgroundColor: isAuthorized ? '#28a745' : '#ffc107',
          color: isAuthorized ? 'white' : 'black',
          textTransform: 'uppercase'
        }}
      >
        {isAuthorized ? 'Authorized' : 'Mock'}
      </span>
    );
  };

  const getProviderIcon = (provider) => {
    switch (provider) {
      case 'google': return '🔵';
      case 'microsoft': return '🔷';
      default: return '📅';
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
          maxWidth: '800px',
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            🗓️ Calendar Sync
          </h2>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={handleRefresh}
              disabled={isLoading}
              style={{
                padding: '6px 12px',
                backgroundColor: '#17a2b8',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                fontSize: '12px',
                opacity: isLoading ? 0.6 : 1,
                pointerEvents: isLoading ? 'none' : 'auto'
              }}
            >
              {isLoading ? '⏳' : '🔄'} Refresh
            </button>
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
          </div>

        {/* Connected Calendars */}
          <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0 }}>Connected Calendars</h3>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={handleGoogleConnect}
                disabled={isLoading}
                style={{
                  padding: '6px 12px',
                  backgroundColor: '#4285f4',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  fontSize: '12px',
                  opacity: isLoading ? 0.6 : 1
                }}
              >
                + Google
              </button>
              <button
                onClick={handleMicrosoftConnect}
                disabled={isLoading}
                style={{
                  padding: '6px 12px',
                    backgroundColor: '#0078d4',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: isLoading ? 'not-allowed' : 'pointer',
                    fontSize: '12px',
                    opacity: isLoading ? 0.6 : 1
                  }}
                >
                  + Microsoft
                </button>
                </div>
              </div>
              
          {config.calendars && config.calendars.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {config.calendars.map((calendar) => (
                <div
                  key={calendar.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '16px',
                    backgroundColor: '#f8f9fa',
                    border: '1px solid #dee2e6',
                    borderRadius: '8px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '20px' }}>
                      {getProviderIcon(calendar.provider)}
                    </span>
                    <div>
                      <div style={{ fontWeight: 'bold', fontSize: '14px' }}>
                        {calendar.provider.charAt(0).toUpperCase() + calendar.provider.slice(1)} Calendar
              </div>
                      <div style={{ fontSize: '12px', color: '#6c757d' }}>
                        {calendar.name}
                        {calendar.email && ` • ${calendar.email}`}
              </div>
              </div>
            </div>
            
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {getStatusPill(calendar)}
              <button
                      onClick={() => handleExportCalendar(calendar)}
                disabled={isLoading}
                style={{
                        padding: '4px 8px',
                        backgroundColor: '#28a745',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                        fontSize: '10px',
                  opacity: isLoading ? 0.6 : 1
                }}
              >
                      📊 Export
              </button>
              <button
                      onClick={() => handleRemoveCalendar(calendar)}
                style={{
                        padding: '4px 8px',
                        backgroundColor: '#dc3545',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '10px'
                }}
              >
                      ✕
              </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{
              padding: '32px',
              textAlign: 'center',
              backgroundColor: '#f8f9fa',
              border: '2px dashed #dee2e6',
              borderRadius: '8px',
              color: '#6c757d'
            }}>
              <div style={{ fontSize: '24px', marginBottom: '8px' }}>📅</div>
              <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>No calendars connected</div>
              <div style={{ fontSize: '12px' }}>Connect your Google or Microsoft calendar to get started</div>
          </div>
        )}
        </div>

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

        {/* Upcoming Events Preview */}
        {upcomingEvents.length > 0 && (
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ marginBottom: '12px' }}>📅 Upcoming Events (Next 24 Hours)</h3>
            <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
              {upcomingEvents.slice(0, 3).map((event) => (
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
                  <div style={{ fontSize: '12px', color: '#6c757d' }}>
                    {new Date(event.start).toLocaleString()} - {new Date(event.end).toLocaleString()}
                  </div>
                </div>
              ))}
              {upcomingEvents.length > 3 && (
                <div style={{ textAlign: 'center', fontSize: '12px', color: '#6c757d', padding: '8px' }}>
                  ... and {upcomingEvents.length - 3} more events
                </div>
              )}
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