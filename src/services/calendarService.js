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
    // Set up global message listener for OAuth callbacks
    this.setupGlobalMessageListener();
  }

  static setupGlobalMessageListener() {
    // Only set up once
    if (window.calendarOAuthListener) return;
    
    window.calendarOAuthListener = (event) => {
      console.log('📅 ScoBro Logbook: Global message listener received:', event);
      
      if (event.origin !== window.location.origin) {
        console.log('📅 ScoBro Logbook: Ignoring message from different origin');
        return;
      }
      
      if (event.data.type === 'GOOGLE_OAUTH_SUCCESS') {
        console.log('📅 ScoBro Logbook: Global listener - Google OAuth success');
        // Mark this message as processed by global listener
        event.data._processedByGlobal = true;
        this.handleOAuthSuccess('google', event.data);
      } else if (event.data.type === 'MICROSOFT_OAUTH_SUCCESS') {
        console.log('📅 ScoBro Logbook: Global listener - Microsoft OAuth success');
        // Mark this message as processed by global listener
        event.data._processedByGlobal = true;
        this.handleOAuthSuccess('microsoft', event.data);
      }
    };
    
    window.addEventListener('message', window.calendarOAuthListener);
    console.log('📅 ScoBro Logbook: Global OAuth message listener set up');
  }

  static handleOAuthSuccess(provider, data) {
    try {
      console.log(`📅 ScoBro Logbook: Handling ${provider} OAuth success:`, data);
      
      // Create calendar configuration with real access tokens
      const calendarConfig = {
        provider: provider,
        name: provider === 'google' ? 'Google Calendar' : 'Microsoft Calendar',
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        email: data.email || 'Unknown Email',
        name: data.name || 'Unknown Name',
        enabled: true
      };
      
      const calendar = this.addCalendar(calendarConfig);
      console.log(`📅 ScoBro Logbook: ${provider} calendar added successfully:`, calendar);
      
      // Dispatch a custom event to notify the UI
      const event = new CustomEvent('calendarConnected', { 
        detail: { provider, calendar, data } 
      });
      window.dispatchEvent(event);
      
    } catch (error) {
      console.error(`📅 ScoBro Logbook: Error handling ${provider} OAuth success:`, error);
      
      // If it's a duplicate error, still dispatch the event to update the UI
      if (error.message.includes('already connected')) {
        console.log(`📅 ScoBro Logbook: ${provider} calendar already connected, updating UI anyway`);
        const event = new CustomEvent('calendarConnected', { 
          detail: { provider, data, error: error.message } 
        });
        window.dispatchEvent(event);
      }
    }
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
      
      // Check for duplicate email addresses with the same provider
      if (calendarConfig.email && config.calendars.some(cal => 
        cal.email === calendarConfig.email && cal.provider === calendarConfig.provider)) {
        throw new Error(`${calendarConfig.provider} calendar with email ${calendarConfig.email} is already connected`);
      }
      
      const newCalendar = {
        id: this.generateCalendarId(),
        provider: calendarConfig.provider, // 'google' or 'microsoft'
        name: calendarConfig.name,
        email: calendarConfig.email, // User's email address
        accessToken: calendarConfig.accessToken, // Real access token from backend
        refreshToken: calendarConfig.refreshToken, // Refresh token for token renewal
        calendarId: calendarConfig.calendarId || 'primary',
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
        // Don't check window.closed due to COOP restrictions
        // Instead, rely on the message handler and a timeout
        const timeout = setTimeout(() => {
          window.removeEventListener('message', messageHandler);
          reject(new Error('OAuth timeout - please try again'));
        }, 300000); // 5 minute timeout
        
        // Listen for OAuth callback message
        const messageHandler = (event) => {
          if (event.origin !== window.location.origin) return;
          
          if (event.data.type === 'GOOGLE_OAUTH_SUCCESS') {
            // Skip if already processed by global listener
            if (event.data._processedByGlobal) {
              console.log('📅 ScoBro Logbook: Google message already processed by global listener, skipping');
              clearTimeout(timeout);
              window.removeEventListener('message', messageHandler);
              return;
            }
            
            clearTimeout(timeout);
            window.removeEventListener('message', messageHandler);
            // Don't close window due to COOP restrictions - let user close manually
            
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
            clearTimeout(timeout);
            window.removeEventListener('message', messageHandler);
            // Don't close window due to COOP restrictions - let user close manually
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
      console.log('📅 ScoBro Logbook: About to open Microsoft OAuth popup...');
      const authWindow = window.open(authUrl, 'microsoft-oauth', 'width=600,height=700');
      console.log('📅 ScoBro Logbook: Microsoft OAuth popup opened:', authWindow);
      
      // Listen for OAuth callback
      return new Promise((resolve, reject) => {
        // Don't check window.closed due to COOP restrictions
        // Instead, rely on the message handler and a timeout
        const timeout = setTimeout(() => {
          window.removeEventListener('message', messageHandler);
          reject(new Error('OAuth timeout - please try again'));
        }, 300000); // 5 minute timeout
        
        // Listen for OAuth callback message
        const messageHandler = (event) => {
          console.log('📅 ScoBro Logbook: Received message event:', event);
          console.log('📅 ScoBro Logbook: Event origin:', event.origin, 'Expected:', window.location.origin);
          console.log('📅 ScoBro Logbook: Event data:', event.data);
          
          if (event.origin !== window.location.origin) {
            console.log('📅 ScoBro Logbook: Ignoring message from different origin');
            return;
          }
          
          if (event.data.type === 'MICROSOFT_OAUTH_SUCCESS') {
            console.log('📅 ScoBro Logbook: Received MICROSOFT_OAUTH_SUCCESS message');
            
            // Skip if already processed by global listener
            if (event.data._processedByGlobal) {
              console.log('📅 ScoBro Logbook: Message already processed by global listener, skipping');
              clearTimeout(timeout);
              window.removeEventListener('message', messageHandler);
              return;
            }
            
            clearTimeout(timeout);
            window.removeEventListener('message', messageHandler);
            // Don't close window due to COOP restrictions - let user close manually
            
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
            console.log('📅 ScoBro Logbook: Received MICROSOFT_OAUTH_ERROR message:', event.data.error);
            clearTimeout(timeout);
            window.removeEventListener('message', messageHandler);
            // Don't close window due to COOP restrictions - let user close manually
            reject(new Error(event.data.error));
          } else {
            console.log('📅 ScoBro Logbook: Received unknown message type:', event.data.type);
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
    
    const redirectUri = encodeURIComponent(window.location.origin + '/google-callback.html');
    console.log('📅 ScoBro Logbook: Redirect URI', redirectUri);
    console.log('🔍 Frontend window.location.origin:', window.location.origin);
    console.log('🔍 Frontend full redirect URI:', window.location.origin + '/google-callback.html');
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
    
    const redirectUri = encodeURIComponent(window.location.origin + '/microsoft-callback.html');
    const scope = encodeURIComponent('https://graph.microsoft.com/calendars.read');
    
    const authUrl = `https://login.microsoftonline.com/d620d048-fd69-4b9f-adf6-2cfd9b766119/oauth2/v2.0/authorize?` +
           `client_id=${clientId}&` +
           `response_type=code&` +
           `redirect_uri=${redirectUri}&` +
           `scope=${scope}&` +
           `response_mode=query&` +
           `state=calendar_sync`;
    
    console.log('📅 Microsoft OAuth URL generated:', authUrl);
    console.log('📅 Client ID:', clientId);
    console.log('📅 Redirect URI:', window.location.origin + '/microsoft-callback.html');
    console.log('📅 Scope:', 'https://graph.microsoft.com/calendars.read');
    
    return authUrl;
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
   * Fetch calendar events (generic function that calls the appropriate provider)
   */
  static async fetchCalendarEvents(calendar, startDate, endDate) {
    try {
      if (calendar.provider === 'google') {
        return await this.fetchGoogleCalendarEvents(calendar, startDate, endDate);
      } else if (calendar.provider === 'microsoft') {
        return await this.fetchMicrosoftCalendarEvents(calendar, startDate, endDate);
      } else {
        throw new Error(`Unsupported calendar provider: ${calendar.provider}`);
      }
    } catch (error) {
      console.error('Failed to fetch calendar events:', error);
      throw error;
    }
  }

  /**
   * Fetch Google Calendar events
   */
  static async fetchGoogleCalendarEvents(config, startDate, endDate) {
    try {
      console.log('📅 Fetching Google Calendar events...');
      console.log('📅 Calendar ID:', config.calendarId);
      console.log('📅 Date range:', startDate.toISOString(), 'to', endDate.toISOString());
      
      // Check if we have an access token
      if (!config.accessToken) {
        throw new Error('No access token available for Google Calendar');
      }

      // Call backend API to fetch Google Calendar events
      const response = await fetch('http://localhost:3001/api/calendar/google/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          access_token: config.accessToken,
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString()
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch Google Calendar events');
      }

      const data = await response.json();
      console.log(`✅ Retrieved ${data.events.length} Google Calendar events`);
      
      return data.events;
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
      console.log('📅 Fetching Microsoft Calendar events...');
      console.log('📅 Calendar ID:', config.calendarId);
      console.log('📅 Date range:', startDate.toISOString(), 'to', endDate.toISOString());
      
      // Check if we have an access token
      if (!config.accessToken) {
        throw new Error('No access token available for Microsoft Calendar');
      }

      // Call backend API to fetch Microsoft Calendar events
      const response = await fetch('http://localhost:3001/api/calendar/microsoft/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          access_token: config.accessToken,
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString()
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch Microsoft Calendar events');
      }

      const data = await response.json();
      console.log(`✅ Retrieved ${data.events.length} Microsoft Calendar events`);
      
      return data.events;
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
