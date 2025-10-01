/**
 * Calendar Service - Handles calendar synchronization with Google Calendar and Microsoft Outlook
 * Provides functionality to sync calendar events with ScoBro Logbook entries
 */

export class CalendarService {
  static STORAGE_KEY = 'calendarConfig';
  static GOOGLE_CALENDAR_API = 'https://www.googleapis.com/calendar/v3';
  static MICROSOFT_GRAPH_API = 'https://graph.microsoft.com/v1.0';

  /**
   * Get calendar configuration
   */
  static getCalendarConfig() {
    try {
      const config = localStorage.getItem(this.STORAGE_KEY);
      return config ? JSON.parse(config) : {
        enabled: false,
        provider: null, // 'google' or 'microsoft'
        accessToken: null,
        refreshToken: null,
        calendarId: null,
        syncInterval: 15, // minutes
        lastSync: null,
        autoCreateEntries: true,
        includeAllDayEvents: false,
        syncPastDays: 7,
        syncFutureDays: 30
      };
    } catch (error) {
      console.error('Failed to get calendar config:', error);
      return this.getDefaultConfig();
    }
  }

  /**
   * Save calendar configuration
   */
  static saveCalendarConfig(config) {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(config));
      return true;
    } catch (error) {
      console.error('Failed to save calendar config:', error);
      return false;
    }
  }

  /**
   * Get default configuration
   */
  static getDefaultConfig() {
    return {
      enabled: false,
      provider: null,
      accessToken: null,
      refreshToken: null,
      calendarId: null,
      syncInterval: 15,
      lastSync: null,
      autoCreateEntries: true,
      includeAllDayEvents: false,
      syncPastDays: 7,
      syncFutureDays: 30
    };
  }

  /**
   * Initialize Google Calendar OAuth
   */
  static async initializeGoogleCalendar() {
    try {
      // In a real implementation, you would use Google's OAuth 2.0 flow
      // For now, we'll simulate the process
      const authUrl = this.generateGoogleAuthUrl();
      
      // Open authorization window
      const authWindow = window.open(
        authUrl,
        'google-calendar-auth',
        'width=500,height=600,scrollbars=yes,resizable=yes'
      );

      return new Promise((resolve, reject) => {
        const checkClosed = setInterval(() => {
          if (authWindow.closed) {
            clearInterval(checkClosed);
            // In a real implementation, you would handle the OAuth callback
            // For now, we'll simulate success
            const mockConfig = {
              ...this.getCalendarConfig(),
              provider: 'google',
              accessToken: 'mock_access_token',
              refreshToken: 'mock_refresh_token',
              calendarId: 'primary',
              enabled: true
            };
            this.saveCalendarConfig(mockConfig);
            resolve(mockConfig);
          }
        }, 1000);
      });
    } catch (error) {
      console.error('Failed to initialize Google Calendar:', error);
      throw error;
    }
  }

  /**
   * Initialize Microsoft Outlook OAuth
   */
  static async initializeMicrosoftOutlook() {
    try {
      // In a real implementation, you would use Microsoft's OAuth 2.0 flow
      const authUrl = this.generateMicrosoftAuthUrl();
      
      const authWindow = window.open(
        authUrl,
        'microsoft-outlook-auth',
        'width=500,height=600,scrollbars=yes,resizable=yes'
      );

      return new Promise((resolve, reject) => {
        const checkClosed = setInterval(() => {
          if (authWindow.closed) {
            clearInterval(checkClosed);
            // Simulate success for demo
            const mockConfig = {
              ...this.getCalendarConfig(),
              provider: 'microsoft',
              accessToken: 'mock_access_token',
              refreshToken: 'mock_refresh_token',
              calendarId: 'primary',
              enabled: true
            };
            this.saveCalendarConfig(mockConfig);
            resolve(mockConfig);
          }
        }, 1000);
      });
    } catch (error) {
      console.error('Failed to initialize Microsoft Outlook:', error);
      throw error;
    }
  }

  /**
   * Generate Google OAuth URL
   */
  static generateGoogleAuthUrl() {
    const clientId = 'your_google_client_id'; // Replace with actual client ID
    const redirectUri = encodeURIComponent(window.location.origin + '/auth/google/callback');
    const scope = encodeURIComponent('https://www.googleapis.com/auth/calendar.readonly');
    
    return `https://accounts.google.com/o/oauth2/v2/auth?` +
           `client_id=${clientId}&` +
           `redirect_uri=${redirectUri}&` +
           `scope=${scope}&` +
           `response_type=code&` +
           `access_type=offline&` +
           `prompt=consent`;
  }

  /**
   * Generate Microsoft OAuth URL
   */
  static generateMicrosoftAuthUrl() {
    const clientId = 'your_microsoft_client_id'; // Replace with actual client ID
    const redirectUri = encodeURIComponent(window.location.origin + '/auth/microsoft/callback');
    const scope = encodeURIComponent('https://graph.microsoft.com/calendars.read');
    
    return `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?` +
           `client_id=${clientId}&` +
           `response_type=code&` +
           `redirect_uri=${redirectUri}&` +
           `scope=${scope}&` +
           `response_mode=query&` +
           `state=calendar_sync`;
  }

  /**
   * Sync calendar events
   */
  static async syncCalendarEvents() {
    try {
      const config = this.getCalendarConfig();
      if (!config.enabled || !config.provider) {
        throw new Error('Calendar sync not configured');
      }

      const now = new Date();
      const startDate = new Date(now.getTime() - (config.syncPastDays * 24 * 60 * 60 * 1000));
      const endDate = new Date(now.getTime() + (config.syncFutureDays * 24 * 60 * 60 * 1000));

      let events = [];
      
      if (config.provider === 'google') {
        events = await this.fetchGoogleCalendarEvents(config, startDate, endDate);
      } else if (config.provider === 'microsoft') {
        events = await this.fetchMicrosoftCalendarEvents(config, startDate, endDate);
      }

      // Update last sync time
      config.lastSync = now.toISOString();
      this.saveCalendarConfig(config);

      return events;
    } catch (error) {
      console.error('Failed to sync calendar events:', error);
      throw error;
    }
  }

  /**
   * Fetch Google Calendar events
   */
  static async fetchGoogleCalendarEvents(config, startDate, endDate) {
    try {
      // In a real implementation, you would make actual API calls
      // For now, we'll return mock data
      const mockEvents = [
        {
          id: 'google_event_1',
          title: 'Team Meeting',
          start: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
          end: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
          description: 'Weekly team sync meeting',
          location: 'Conference Room A',
          attendees: ['john@example.com', 'jane@example.com'],
          provider: 'google',
          calendarId: config.calendarId
        },
        {
          id: 'google_event_2',
          title: 'Project Review',
          start: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          end: new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString(),
          description: 'Monthly project review session',
          location: 'Virtual',
          attendees: ['manager@example.com'],
          provider: 'google',
          calendarId: config.calendarId
        }
      ];

      return mockEvents;
    } catch (error) {
      console.error('Failed to fetch Google Calendar events:', error);
      throw error;
    }
  }

  /**
   * Fetch Microsoft Calendar events
   */
  static async fetchMicrosoftCalendarEvents(config, startDate, endDate) {
    try {
      // Mock Microsoft Calendar events
      const mockEvents = [
        {
          id: 'microsoft_event_1',
          title: 'Client Call',
          start: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
          end: new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString(),
          description: 'Quarterly client review call',
          location: 'Online',
          attendees: ['client@example.com'],
          provider: 'microsoft',
          calendarId: config.calendarId
        }
      ];

      return mockEvents;
    } catch (error) {
      console.error('Failed to fetch Microsoft Calendar events:', error);
      throw error;
    }
  }

  /**
   * Convert calendar event to ScoBro entry
   */
  static convertEventToEntry(event) {
    const startTime = new Date(event.start);
    const endTime = new Date(event.end);
    const duration = Math.round((endTime - startTime) / (1000 * 60)); // minutes

    return {
      item_type: 'Meeting',
      content: `${event.title}${event.description ? ` - ${event.description}` : ''}`,
      project: 'Calendar Sync',
      tags: ['calendar', event.provider, 'meeting'],
      jira: [],
      people: event.attendees || [],
      metadata: {
        calendarEventId: event.id,
        provider: event.provider,
        location: event.location,
        duration: duration,
        originalEvent: event
      }
    };
  }

  /**
   * Get upcoming events
   */
  static async getUpcomingEvents(hours = 24) {
    try {
      const config = this.getCalendarConfig();
      if (!config.enabled) {
        return [];
      }

      const now = new Date();
      const endTime = new Date(now.getTime() + (hours * 60 * 60 * 1000));
      
      const events = await this.syncCalendarEvents();
      return events.filter(event => {
        const eventStart = new Date(event.start);
        return eventStart >= now && eventStart <= endTime;
      });
    } catch (error) {
      console.error('Failed to get upcoming events:', error);
      return [];
    }
  }

  /**
   * Test calendar connection
   */
  static async testConnection() {
    try {
      const config = this.getCalendarConfig();
      if (!config.enabled || !config.provider) {
        throw new Error('Calendar sync not configured');
      }

      // Test by fetching a small number of events
      const now = new Date();
      const tomorrow = new Date(now.getTime() + (24 * 60 * 60 * 1000));
      
      let events = [];
      if (config.provider === 'google') {
        events = await this.fetchGoogleCalendarEvents(config, now, tomorrow);
      } else if (config.provider === 'microsoft') {
        events = await this.fetchMicrosoftCalendarEvents(config, now, tomorrow);
      }

      return {
        success: true,
        message: `Successfully connected to ${config.provider} calendar. Found ${events.length} events.`,
        events: events
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to connect to calendar: ${error.message}`,
        events: []
      };
    }
  }

  /**
   * Disconnect calendar
   */
  static disconnectCalendar() {
    try {
      const defaultConfig = this.getDefaultConfig();
      this.saveCalendarConfig(defaultConfig);
      return true;
    } catch (error) {
      console.error('Failed to disconnect calendar:', error);
      return false;
    }
  }

  /**
   * Get sync status
   */
  static getSyncStatus() {
    try {
      const config = this.getCalendarConfig();
      if (!config.enabled) {
        return {
          status: 'disabled',
          message: 'Calendar sync is disabled',
          lastSync: null
        };
      }

      if (!config.lastSync) {
        return {
          status: 'never_synced',
          message: 'Calendar sync never performed',
          lastSync: null
        };
      }

      const lastSync = new Date(config.lastSync);
      const now = new Date();
      const timeSinceSync = now - lastSync;
      const minutesSinceSync = Math.floor(timeSinceSync / (1000 * 60));

      if (minutesSinceSync < 5) {
        return {
          status: 'synced',
          message: 'Recently synced',
          lastSync: config.lastSync
        };
      } else if (minutesSinceSync < config.syncInterval) {
        return {
          status: 'synced',
          message: `Synced ${minutesSinceSync} minutes ago`,
          lastSync: config.lastSync
        };
      } else {
        return {
          status: 'stale',
          message: `Last sync was ${minutesSinceSync} minutes ago`,
          lastSync: config.lastSync
        };
      }
    } catch (error) {
      return {
        status: 'error',
        message: 'Error checking sync status',
        lastSync: null
      };
    }
  }
}
