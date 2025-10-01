/**
 * Connection Status Service - Manages status of all external connections
 * Provides centralized status tracking for Supabase, Email, Jira, Calendar, etc.
 */

export class ConnectionStatusService {
  static STORAGE_KEY = 'connectionStatuses';
  static DEFAULT_STATUSES = {
    supabase: { connected: false, status: 'not-configured', lastChecked: null },
    email: { connected: false, status: 'not-configured', lastChecked: null },
    jira: { connected: false, status: 'not-configured', lastChecked: null },
    calendar: { connected: false, status: 'not-configured', lastChecked: null },
    analytics: { connected: true, status: 'active', lastChecked: null }
  };

  /**
   * Get all connection statuses
   */
  static getConnectionStatuses() {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return stored ? JSON.parse(stored) : { ...this.DEFAULT_STATUSES };
    } catch (error) {
      console.error('Failed to get connection statuses:', error);
      return { ...this.DEFAULT_STATUSES };
    }
  }

  /**
   * Save connection statuses
   */
  static saveConnectionStatuses(statuses) {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(statuses));
      return true;
    } catch (error) {
      console.error('Failed to save connection statuses:', error);
      return false;
    }
  }

  /**
   * Update a specific connection status
   */
  static updateConnectionStatus(service, status, connected = null) {
    try {
      const statuses = this.getConnectionStatuses();
      statuses[service] = {
        ...statuses[service],
        status,
        connected: connected !== null ? connected : status === 'connected',
        lastChecked: new Date().toISOString()
      };
      this.saveConnectionStatuses(statuses);
      return statuses[service];
    } catch (error) {
      console.error(`Failed to update ${service} status:`, error);
      return null;
    }
  }

  /**
   * Check Supabase connection status
   */
  static async checkSupabaseStatus() {
    try {
      // Check if environment variables are configured
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      if (!supabaseUrl || !supabaseAnonKey) {
        return this.updateConnectionStatus('supabase', 'not-configured', false);
      }

      // Try to import and check Supabase client
      const { supabase } = await import('../supabaseClient.js');
      if (!supabase) {
        return this.updateConnectionStatus('supabase', 'not-configured', false);
      }

      // Test connection by getting current user
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error) {
        return this.updateConnectionStatus('supabase', 'error', false);
      }

      if (user) {
        return this.updateConnectionStatus('supabase', 'connected', true);
      } else {
        return this.updateConnectionStatus('supabase', 'not-authenticated', false);
      }
    } catch (error) {
      console.error('Failed to check Supabase status:', error);
      return this.updateConnectionStatus('supabase', 'error', false);
    }
  }

  /**
   * Check Email service status
   */
  static async checkEmailStatus() {
    try {
      const { EmailService } = await import('./emailService.js');
      const credentials = await EmailService.getCredentials();
      
      if (!credentials || !credentials.host || !credentials.username) {
        return this.updateConnectionStatus('email', 'not-configured', false);
      }

      // Test connection
      const testResult = await EmailService.testConnection();
      if (testResult.success) {
        return this.updateConnectionStatus('email', 'connected', true);
      } else {
        return this.updateConnectionStatus('email', 'error', false);
      }
    } catch (error) {
      console.error('Failed to check Email status:', error);
      return this.updateConnectionStatus('email', 'error', false);
    }
  }

  /**
   * Check Jira API status
   */
  static async checkJiraStatus() {
    try {
      const { JiraApiService } = await import('./jiraApiService.js');
      const config = JiraApiService.getJiraConfig();
      
      if (!config || !config.baseUrl || !config.username || !config.apiToken) {
        return this.updateConnectionStatus('jira', 'not-configured', false);
      }

      // Test connection
      const testResult = await JiraApiService.testConnection(config);
      if (testResult.success) {
        return this.updateConnectionStatus('jira', 'connected', true);
      } else {
        return this.updateConnectionStatus('jira', 'error', false);
      }
    } catch (error) {
      console.error('Failed to check Jira status:', error);
      return this.updateConnectionStatus('jira', 'error', false);
    }
  }

  /**
   * Check Calendar service status
   */
  static async checkCalendarStatus() {
    try {
      const { CalendarService } = await import('./calendarService.js');
      const config = CalendarService.getCalendarConfig();
      
      if (!config || (!config.google && !config.microsoft)) {
        return this.updateConnectionStatus('calendar', 'not-configured', false);
      }

      // Test connection
      const testResult = await CalendarService.testConnection();
      if (testResult.success) {
        return this.updateConnectionStatus('calendar', 'connected', true);
      } else {
        return this.updateConnectionStatus('calendar', 'error', false);
      }
    } catch (error) {
      console.error('Failed to check Calendar status:', error);
      return this.updateConnectionStatus('calendar', 'error', false);
    }
  }

  /**
   * Check Analytics service status
   */
  static async checkAnalyticsStatus() {
    try {
      const { AnalyticsService } = await import('./analyticsService.js');
      const config = AnalyticsService.getAnalyticsConfig();
      
      if (config.enabled) {
        return this.updateConnectionStatus('analytics', 'active', true);
      } else {
        return this.updateConnectionStatus('analytics', 'disabled', false);
      }
    } catch (error) {
      console.error('Failed to check Analytics status:', error);
      return this.updateConnectionStatus('analytics', 'error', false);
    }
  }

  /**
   * Check all connection statuses
   */
  static async checkAllStatuses() {
    try {
      const results = await Promise.allSettled([
        this.checkSupabaseStatus(),
        this.checkEmailStatus(),
        this.checkJiraStatus(),
        this.checkCalendarStatus(),
        this.checkAnalyticsStatus()
      ]);

      const statuses = this.getConnectionStatuses();
      return statuses;
    } catch (error) {
      console.error('Failed to check all statuses:', error);
      return this.getConnectionStatuses();
    }
  }

  /**
   * Get status pill configuration
   */
  static getStatusPillConfig(service, status) {
    const configs = {
      'not-configured': {
        color: '#6c757d',
        bgColor: '#f8f9fa',
        icon: '⚪',
        text: 'Not Configured',
        tooltip: 'Service not configured'
      },
      'not-authenticated': {
        color: '#fd7e14',
        bgColor: '#fff3cd',
        icon: '🟡',
        text: 'Not Signed In',
        tooltip: 'Service configured but not authenticated'
      },
      'connected': {
        color: '#28a745',
        bgColor: '#d4edda',
        icon: '🟢',
        text: 'Connected',
        tooltip: 'Service connected and working'
      },
      'active': {
        color: '#28a745',
        bgColor: '#d4edda',
        icon: '🟢',
        text: 'Active',
        tooltip: 'Service active and working'
      },
      'error': {
        color: '#dc3545',
        bgColor: '#f8d7da',
        icon: '🔴',
        text: 'Error',
        tooltip: 'Service has connection issues'
      },
      'disabled': {
        color: '#6c757d',
        bgColor: '#f8f9fa',
        icon: '⚫',
        text: 'Disabled',
        tooltip: 'Service is disabled'
      }
    };

    return configs[status] || configs['not-configured'];
  }

  /**
   * Get service display name
   */
  static getServiceDisplayName(service) {
    const names = {
      supabase: 'Database',
      email: 'Email',
      jira: 'Jira',
      calendar: 'Calendar',
      analytics: 'Analytics'
    };
    return names[service] || service;
  }
}
