/**
 * ClarizenApiService - Service for interacting with Clarizen API
 * Handles authentication, session management, and data retrieval
 */
export class ClarizenApiService {
  static STORAGE_KEY = 'clarizenApiConfig';
  static BACKEND_URL = 'http://localhost:3001';

  static DEFAULT_CONFIG = {
    enabled: false,
    baseUrl: 'https://app2.clarizen.com/Clarizen',
    username: 'scott@idegroup.com.au',
    password: '',
    accessToken: null,
    lastSync: null
  };

  /**
   * Get Clarizen configuration from localStorage
   */
  static getClarizenConfig() {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return stored ? { ...this.DEFAULT_CONFIG, ...JSON.parse(stored) } : this.DEFAULT_CONFIG;
    } catch (error) {
      console.error('Failed to load Clarizen config:', error);
      return this.DEFAULT_CONFIG;
    }
  }

  /**
   * Save Clarizen configuration to localStorage
   */
  static saveClarizenConfig(config) {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(config));
      console.log('✅ Clarizen config saved successfully');
    } catch (error) {
      console.error('Failed to save Clarizen config:', error);
      throw error;
    }
  }

  /**
   * Test connection to Clarizen API
   */
  static async testConnection(config = null) {
    try {
      const clarizenConfig = config || this.getClarizenConfig();

      console.log('🔍 Frontend Clarizen config:', {
        baseUrl: clarizenConfig.baseUrl,
        username: clarizenConfig.username,
        password: clarizenConfig.password ? '***PROVIDED***' : 'NOT PROVIDED'
      });

      if (!clarizenConfig.baseUrl || !clarizenConfig.username || !clarizenConfig.password) {
        throw new Error('Please provide Clarizen URL, username, and password');
      }

      const requestBody = {
        baseUrl: clarizenConfig.baseUrl,
        username: clarizenConfig.username,
        password: clarizenConfig.password
      };

      console.log('📤 Sending request to backend:', {
        url: `${this.BACKEND_URL}/api/clarizen/test`,
        body: {
          baseUrl: requestBody.baseUrl,
          username: requestBody.username,
          password: '***PROVIDED***'
        }
      });

      const response = await fetch(`${this.BACKEND_URL}/api/clarizen/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      const result = await response.json();
      console.log('📥 Backend response:', result);
      return result;
    } catch (error) {
      console.error('❌ Clarizen test connection failed:', error);
      return {
        success: false,
        message: `Connection test failed: ${error.message}`
      };
    }
  }

  /**
   * Get resourcing data from Clarizen
   */
  static async getResourcingData() {
    try {
      console.log('📊 Fetching Clarizen resourcing data...');
      
      const response = await fetch(`${this.BACKEND_URL}/api/clarizen/resourcing`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      console.log('📥 Clarizen resourcing data received:', result);
      
      return result.resourcing || [];
    } catch (error) {
      console.error('❌ Failed to fetch Clarizen resourcing data:', error);
      throw new Error(`Failed to fetch resourcing data: ${error.message}`);
    }
  }

  /**
   * Get user information from Clarizen
   */
  static async getUserInfo() {
    try {
      console.log('👤 Fetching Clarizen user info...');
      
      const response = await fetch(`${this.BACKEND_URL}/api/clarizen/user`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      console.log('📥 Clarizen user info received:', result);
      
      return result.user || null;
    } catch (error) {
      console.error('❌ Failed to fetch Clarizen user info:', error);
      throw new Error(`Failed to fetch user info: ${error.message}`);
    }
  }

  /**
   * Get projects from Clarizen
   */
  static async getProjects() {
    try {
      console.log('📁 Fetching Clarizen projects...');
      
      const response = await fetch(`${this.BACKEND_URL}/api/clarizen/projects`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      console.log('📥 Clarizen projects received:', result);
      
      return result.projects || [];
    } catch (error) {
      console.error('❌ Failed to fetch Clarizen projects:', error);
      throw new Error(`Failed to fetch projects: ${error.message}`);
    }
  }

  /**
   * Disconnect from Clarizen (clear stored credentials)
   */
  static disconnect() {
    try {
      const config = this.getClarizenConfig();
      config.accessToken = null;
      config.enabled = false;
      this.saveClarizenConfig(config);
      console.log('🔌 Clarizen disconnected successfully');
    } catch (error) {
      console.error('Failed to disconnect Clarizen:', error);
    }
  }

  /**
   * Check if Clarizen is configured and authenticated
   */
  static isConfigured() {
    const config = this.getClarizenConfig();
    return !!(config.baseUrl && config.username && config.accessToken);
  }

  /**
   * Get sync status
   */
  static getSyncStatus() {
    const config = this.getClarizenConfig();
    if (!config.baseUrl || !config.username) {
      return 'not-configured';
    }
    if (!config.accessToken) {
      return 'not-authenticated';
    }
    return 'connected';
  }
}
