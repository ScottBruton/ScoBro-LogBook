/**
 * Calendar Service - Handles calendar synchronization with Google Calendar and Microsoft Outlook
 * Provides functionality to sync calendar events with ScoBro Logbook entries
 */

export class CalendarService {
  static STORAGE_KEY = 'calendarConfig';
  static GOOGLE_CALENDAR_API = 'https://www.googleapis.com/calendar/v3';
  static MICROSOFT_GRAPH_API = 'https://graph.microsoft.com/v1.0';

  static {
    console.log('📅 ScoBro Logbook: CalendarService class loaded');
  }

  /**
   * Get calendar configuration
   */
  static getCalendarConfig() {
    try {
      const config = localStorage.getItem(this.STORAGE_KEY);
      return config ? JSON.parse(config) : {
        enabled: false,
        calendars: [], // Array of calendar configurations
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
      calendars: [], // Array of calendar configurations
      syncInterval: 15,
      lastSync: null,
      autoCreateEntries: true,
      includeAllDayEvents: false,
      syncPastDays: 7,
      syncFutureDays: 30
    };
  }

  /**
   * Add a new calendar configuration
   */
  static addCalendar(calendarConfig) {
    try {
      const config = this.getCalendarConfig();
      
      // Check for duplicate email addresses
      if (calendarConfig.email && config.calendars.some(cal => cal.email === calendarConfig.email)) {
        throw new Error(`Calendar with email ${calendarConfig.email} is already connected`);
      }
      
      const newCalendar = {
        id: this.generateCalendarId(),
        provider: calendarConfig.provider, // 'google' or 'microsoft'
        name: calendarConfig.name,
        email: calendarConfig.email, // User's email address
        accessToken: calendarConfig.accessToken,
        refreshToken: calendarConfig.refreshToken,
        calendarId: calendarConfig.calendarId,
        enabled: true,
        addedAt: new Date().toISOString()
      };
      
      config.calendars.push(newCalendar);
      config.enabled = true; // Enable calendar sync if any calendars are configured
      this.saveCalendarConfig(config);
      
      return newCalendar;
    } catch (error) {
      console.error('Failed to add calendar:', error);
      throw error;
    }
  }

  /**
   * Remove a calendar configuration
   */
  static removeCalendar(calendarId) {
    try {
      const config = this.getCalendarConfig();
      config.calendars = config.calendars.filter(cal => cal.id !== calendarId);
      
      // Disable calendar sync if no calendars are configured
      if (config.calendars.length === 0) {
        config.enabled = false;
      }
      
      this.saveCalendarConfig(config);
      return true;
    } catch (error) {
      console.error('Failed to remove calendar:', error);
      throw error;
    }
  }

  /**
   * Update a calendar configuration
   */
  static updateCalendar(calendarId, updates) {
    try {
      const config = this.getCalendarConfig();
      const calendarIndex = config.calendars.findIndex(cal => cal.id === calendarId);
      
      if (calendarIndex === -1) {
        throw new Error('Calendar not found');
      }
      
      config.calendars[calendarIndex] = {
        ...config.calendars[calendarIndex],
        ...updates,
        updatedAt: new Date().toISOString()
      };
      
      this.saveCalendarConfig(config);
      return config.calendars[calendarIndex];
    } catch (error) {
      console.error('Failed to update calendar:', error);
      throw error;
    }
  }

  /**
   * Get all configured calendars
   */
  static getCalendars() {
    try {
      const config = this.getCalendarConfig();
      return config.calendars || [];
    } catch (error) {
      console.error('Failed to get calendars:', error);
      return [];
    }
  }

  /**
   * Generate a unique calendar ID
   */
  static generateCalendarId() {
    return 'cal_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Initialize Google Calendar OAuth
   */
  static async initializeGoogleCalendar() {
    try {
      console.log('📅 ScoBro Logbook: Initializing Google Calendar OAuth...');
      // Check if Google OAuth is properly configured
      // In Tauri, environment variables are accessed via import.meta.env
      const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || 'your_google_client_id';
      
      if (clientId === 'your_google_client_id') {
        const error = 'Google OAuth not configured. Please set VITE_GOOGLE_CLIENT_ID environment variable.';
        console.error('📅 ScoBro Logbook: Google OAuth not configured');
        throw new Error(error);
      }
      
      // Generate OAuth URL and redirect to Google login
      const authUrl = this.generateGoogleAuthUrl();
      console.log('📅 ScoBro Logbook: Redirecting to Google OAuth', { authUrl });
      console.log('📅 Redirecting to Google OAuth:', authUrl);
      
      // Open OAuth flow in new window
      const authWindow = window.open(authUrl, 'google-oauth', 'width=600,height=700');
      
      // Listen for OAuth callback
      return new Promise((resolve, reject) => {
        const checkClosed = setInterval(() => {
          if (authWindow.closed) {
            clearInterval(checkClosed);
            reject(new Error('OAuth window was closed'));
          }
        }, 1000);
        
        // Listen for OAuth callback message
        const messageHandler = (event) => {
          if (event.origin !== window.location.origin) return;
          
          if (event.data.type === 'GOOGLE_OAUTH_SUCCESS') {
            clearInterval(checkClosed);
            window.removeEventListener('message', messageHandler);
            authWindow.close();
            
            // Create calendar configuration with real tokens
            const calendarConfig = {
              provider: 'google',
              name: 'Google Calendar',
              email: event.data.email || 'Unknown Email',
              accessToken: event.data.accessToken,
              refreshToken: event.data.refreshToken,
              calendarId: 'primary',
              enabled: true
            };
            
            const calendar = this.addCalendar(calendarConfig);
            resolve(calendar);
          } else if (event.data.type === 'GOOGLE_OAUTH_ERROR') {
            clearInterval(checkClosed);
            window.removeEventListener('message', messageHandler);
            authWindow.close();
            reject(new Error(event.data.error));
          }
        };
        
        window.addEventListener('message', messageHandler);
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
      console.log('📅 ScoBro Logbook: Initializing Microsoft Outlook OAuth...');
      // Check if Microsoft OAuth is properly configured
      // In Tauri, environment variables are accessed via import.meta.env
      const clientId = import.meta.env.VITE_MICROSOFT_CLIENT_ID || 'your_microsoft_client_id';
      
      if (clientId === 'your_microsoft_client_id') {
        const error = 'Microsoft OAuth not configured. Please set VITE_MICROSOFT_CLIENT_ID environment variable.';
        console.error('📅 ScoBro Logbook: Microsoft OAuth not configured');
        throw new Error(error);
      }
      
      // Generate OAuth URL and redirect to Microsoft login
      const authUrl = this.generateMicrosoftAuthUrl();
      console.log('📅 ScoBro Logbook: Redirecting to Microsoft OAuth', { authUrl });
      console.log('📅 Redirecting to Microsoft OAuth:', authUrl);
      
      // Open OAuth flow in new window
      const authWindow = window.open(authUrl, 'microsoft-oauth', 'width=600,height=700');
      
      // Listen for OAuth callback
      return new Promise((resolve, reject) => {
        const checkClosed = setInterval(() => {
          if (authWindow.closed) {
            clearInterval(checkClosed);
            reject(new Error('OAuth window was closed'));
          }
        }, 1000);
        
        // Listen for OAuth callback message
        const messageHandler = (event) => {
          if (event.origin !== window.location.origin) return;
          
          if (event.data.type === 'MICROSOFT_OAUTH_SUCCESS') {
            clearInterval(checkClosed);
            window.removeEventListener('message', messageHandler);
            authWindow.close();
            
            // Create calendar configuration with real tokens
            const calendarConfig = {
              provider: 'microsoft',
              name: 'Microsoft Calendar',
              email: event.data.email || 'Unknown Email',
              accessToken: event.data.accessToken,
              refreshToken: event.data.refreshToken,
              calendarId: 'primary',
              enabled: true
            };
            
            const calendar = this.addCalendar(calendarConfig);
            resolve(calendar);
          } else if (event.data.type === 'MICROSOFT_OAUTH_ERROR') {
            clearInterval(checkClosed);
            window.removeEventListener('message', messageHandler);
            authWindow.close();
            reject(new Error(event.data.error));
          }
        };
        
        window.addEventListener('message', messageHandler);
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
    // Check if Google OAuth is properly configured
    // In Tauri, environment variables are accessed via import.meta.env
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || 'your_google_client_id';
    
    if (clientId === 'your_google_client_id') {
      throw new Error('Google OAuth not configured. Please set VITE_GOOGLE_CLIENT_ID environment variable.');
    }
    
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
    // Check if Microsoft OAuth is properly configured
    // In Tauri, environment variables are accessed via import.meta.env
    const clientId = import.meta.env.VITE_MICROSOFT_CLIENT_ID || 'your_microsoft_client_id';
    
    if (clientId === 'your_microsoft_client_id') {
      throw new Error('Microsoft OAuth not configured. Please set VITE_MICROSOFT_CLIENT_ID environment variable.');
    }
    
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
   * Sync calendar events from all configured calendars
   */
  static async syncCalendarEvents() {
    try {
      const config = this.getCalendarConfig();
      if (!config.enabled || !config.calendars || config.calendars.length === 0) {
        throw new Error('Calendar sync not configured');
      }

      const now = new Date();
      const startDate = new Date(now.getTime() - (config.syncPastDays * 24 * 60 * 60 * 1000));
      const endDate = new Date(now.getTime() + (config.syncFutureDays * 24 * 60 * 60 * 1000));

      let allEvents = [];
      
      // Sync events from all configured calendars
      for (const calendar of config.calendars) {
        if (!calendar.enabled) continue;
        
        try {
          let events = [];
          if (calendar.provider === 'google') {
            events = await this.fetchGoogleCalendarEvents(calendar, startDate, endDate);
          } else if (calendar.provider === 'microsoft') {
            events = await this.fetchMicrosoftCalendarEvents(calendar, startDate, endDate);
          }
          
          // Add calendar info to each event
          events = events.map(event => ({
            ...event,
            calendarId: calendar.id,
            calendarName: calendar.name,
            calendarProvider: calendar.provider
          }));
          
          allEvents = allEvents.concat(events);
        } catch (error) {
          console.error(`Failed to sync calendar ${calendar.name}:`, error);
          // Continue with other calendars even if one fails
        }
      }

      // Update last sync time
      config.lastSync = now.toISOString();
      this.saveCalendarConfig(config);

      return allEvents;
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
      console.log('📅 Google Calendar API integration not yet implemented');
      console.log('📅 Would fetch events from:', config.calendarId);
      console.log('📅 Date range:', startDate.toISOString(), 'to', endDate.toISOString());
      
      // TODO: Implement real Google Calendar API integration
      // This would require:
      // 1. OAuth 2.0 authentication flow
      // 2. Google Calendar API client setup
      // 3. Proper error handling for API limits and permissions
      
      // For now, return empty array to avoid showing fake data
      return [];
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
      console.log('📅 Microsoft Calendar API integration not yet implemented');
      console.log('📅 Would fetch events from:', config.calendarId);
      console.log('📅 Date range:', startDate.toISOString(), 'to', endDate.toISOString());
      
      // TODO: Implement real Microsoft Graph API integration
      // This would require:
      // 1. Microsoft OAuth 2.0 authentication flow
      // 2. Microsoft Graph API client setup
      // 3. Proper error handling for API limits and permissions
      
      // For now, return empty array to avoid showing fake data
      return [];
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
   * Test calendar connection for all configured calendars
   */
  static async testConnection() {
    try {
      const config = this.getCalendarConfig();
      if (!config.enabled || !config.calendars || config.calendars.length === 0) {
        throw new Error('Calendar sync not configured');
      }

      // Test by fetching a small number of events from all calendars
      const now = new Date();
      const tomorrow = new Date(now.getTime() + (24 * 60 * 60 * 1000));
      
      let allEvents = [];
      let successfulCalendars = 0;
      let failedCalendars = 0;
      
      for (const calendar of config.calendars) {
        if (!calendar.enabled) continue;
        
        try {
          let events = [];
          if (calendar.provider === 'google') {
            events = await this.fetchGoogleCalendarEvents(calendar, now, tomorrow);
          } else if (calendar.provider === 'microsoft') {
            events = await this.fetchMicrosoftCalendarEvents(calendar, now, tomorrow);
          }
          
          allEvents = allEvents.concat(events);
          successfulCalendars++;
        } catch (error) {
          console.error(`Failed to test calendar ${calendar.name}:`, error);
          failedCalendars++;
        }
      }

      const totalCalendars = successfulCalendars + failedCalendars;
      const providerNames = [...new Set(config.calendars.map(cal => cal.provider))].join(', ');

      return {
        success: successfulCalendars > 0,
        message: `Calendar service configured for ${providerNames}. ${successfulCalendars}/${totalCalendars} calendars connected. Note: Real API integration requires OAuth setup.`,
        events: allEvents,
        successfulCalendars,
        failedCalendars,
        totalCalendars
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to connect to calendar: ${error.message}`,
        events: [],
        successfulCalendars: 0,
        failedCalendars: 0,
        totalCalendars: 0
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
