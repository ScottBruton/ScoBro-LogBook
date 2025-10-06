const axios = require('axios');

/**
 * ClarizenService - Backend service for Clarizen API integration
 * Handles authentication, session management, and data retrieval from Clarizen
 */
class ClarizenService {
  constructor() {
    this.baseUrl = process.env.CLARIZEN_BASE_URL || '';
    this.username = process.env.CLARIZEN_USERNAME || '';
    this.password = process.env.CLARIZEN_PASSWORD || '';
  }

  /**
   * Test connection to Clarizen API
   */
  async testConnection(config = null) {
    try {
      const baseUrl = config?.baseUrl || this.baseUrl;
      const username = config?.username || this.username;
      const password = config?.password || this.password;

      console.log('🔍 Testing Clarizen connection with:');
      console.log('  Base URL:', baseUrl);
      console.log('  Username:', username);
      console.log('  Password:', password ? '***PROVIDED***' : 'NOT PROVIDED');

      if (!baseUrl || !username || !password) {
        const missing = [];
        if (!baseUrl) missing.push('baseUrl');
        if (!username) missing.push('username');
        if (!password) missing.push('password');
        throw new Error(`Clarizen configuration is incomplete. Missing: ${missing.join(', ')}`);
      }

      // Authenticate and get session token
      const sessionToken = await this.authenticate(baseUrl, username, password);
      
      console.log('✅ Clarizen authentication successful');
      
      return {
        success: true,
        message: 'Successfully connected to Clarizen',
        accessToken: sessionToken,
        user: {
          username: username,
          baseUrl: baseUrl
        }
      };
    } catch (error) {
      console.error('❌ Clarizen connection test failed:', error);
      return {
        success: false,
        message: `Connection failed: ${error.message}`
      };
    }
  }

  /**
   * Authenticate with Clarizen and get session token
   */
  async authenticate(baseUrl, username, password) {
    try {
      // Try multiple authentication endpoints for Clarizen/Planview AdaptiveWork
      const authEndpoints = [
        `${baseUrl.replace(/\/$/, '')}/rest/api/3/authentication/login`,
        `${baseUrl.replace(/\/$/, '')}/rest/api/2/authentication/login`,
        `${baseUrl.replace(/\/$/, '')}/api/authentication/login`,
        `${baseUrl.replace(/\/$/, '')}/rest/authentication/login`
      ];

      let lastError = null;
      
      for (const authUrl of authEndpoints) {
        try {
          console.log('🔐 Trying Clarizen authentication:', authUrl);
          
          const response = await axios.post(authUrl, {
            username: username,
            password: password
          }, {
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            timeout: 30000
          });

          if (response.data && (response.data.sessionId || response.data.token || response.data.accessToken)) {
            const token = response.data.sessionId || response.data.token || response.data.accessToken;
            console.log('✅ Clarizen authentication successful, token received');
            return token;
          }
        } catch (error) {
          console.log(`❌ Authentication failed for ${authUrl}:`, error.response?.status, error.response?.data || error.message);
          lastError = error;
          continue;
        }
      }

      // If all endpoints failed, try basic auth approach
      console.log('🔐 Trying basic authentication approach...');
      const basicAuthUrl = `${baseUrl.replace(/\/$/, '')}/rest/api/3/myself`;
      const auth = Buffer.from(`${username}:${password}`).toString('base64');
      
      const response = await axios.get(basicAuthUrl, {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Accept': 'application/json'
        },
        timeout: 30000
      });

      if (response.data) {
        console.log('✅ Clarizen basic authentication successful');
        return 'basic-auth-token'; // Return a placeholder token for basic auth
      }

      throw lastError || new Error('All authentication methods failed');
      
    } catch (error) {
      console.error('❌ Clarizen authentication failed:', error.response?.data || error.message);
      
      if (error.response?.status === 401) {
        throw new Error('Invalid username or password');
      } else if (error.response?.status === 403) {
        throw new Error('Access denied - check your permissions');
      } else if (error.code === 'ECONNREFUSED') {
        throw new Error('Cannot connect to Clarizen server - check URL');
      } else {
        throw new Error(`Authentication failed: ${error.response?.data?.message || error.message}`);
      }
    }
  }

  /**
   * Make authenticated API request to Clarizen
   */
  async makeApiRequest(endpoint, config = null, sessionToken = null) {
    const baseUrl = config?.baseUrl || this.baseUrl;
    const token = sessionToken || config?.accessToken;
    const username = config?.username || this.username;
    const password = config?.password || this.password;

    if (!baseUrl) {
      throw new Error('Clarizen configuration is incomplete - missing baseUrl');
    }

    // Try different API endpoint patterns
    const apiEndpoints = [
      `${baseUrl.replace(/\/$/, '')}/rest/api/3${endpoint}`,
      `${baseUrl.replace(/\/$/, '')}/rest/api/2${endpoint}`,
      `${baseUrl.replace(/\/$/, '')}/api${endpoint}`,
      `${baseUrl.replace(/\/$/, '')}/rest${endpoint}`
    ];

    let lastError = null;

    for (const url of apiEndpoints) {
      try {
        console.log('🌐 Making Clarizen API request to:', url);

        let headers = {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        };

        // Use appropriate authentication method
        if (token && token !== 'basic-auth-token') {
          headers['Authorization'] = `Bearer ${token}`;
        } else if (username && password) {
          const auth = Buffer.from(`${username}:${password}`).toString('base64');
          headers['Authorization'] = `Basic ${auth}`;
        } else {
          throw new Error('No authentication method available');
        }

        const response = await axios.get(url, {
          headers: headers,
          timeout: 30000
        });

        return response.data;
      } catch (error) {
        console.log(`❌ API request failed for ${url}:`, error.response?.status, error.response?.data || error.message);
        lastError = error;
        continue;
      }
    }

    throw new Error(`All API endpoints failed: ${lastError?.response?.data?.message || lastError?.message}`);
  }

  /**
   * Get user information
   */
  async getUserInfo(config = null, sessionToken = null) {
    try {
      const response = await this.makeApiRequest('/user/me', config, sessionToken);
      return {
        id: response.id,
        username: response.username,
        email: response.email,
        firstName: response.firstName,
        lastName: response.lastName,
        fullName: `${response.firstName || ''} ${response.lastName || ''}`.trim()
      };
    } catch (error) {
      console.error('❌ Failed to fetch user info:', error);
      throw new Error(`Failed to fetch user info: ${error.message}`);
    }
  }

  /**
   * Get projects from Clarizen
   */
  async getProjects(config = null, sessionToken = null) {
    try {
      const response = await this.makeApiRequest('/projects', config, sessionToken);
      
      return (response.projects || []).map(project => ({
        id: project.id,
        name: project.name,
        description: project.description,
        status: project.status,
        startDate: project.startDate,
        endDate: project.endDate,
        owner: project.owner,
        tags: project.tags || []
      }));
    } catch (error) {
      console.error('❌ Failed to fetch projects:', error);
      throw new Error(`Failed to fetch projects: ${error.message}`);
    }
  }

  /**
   * Get resourcing data for the current user
   */
  async getResourcingData(config = null, sessionToken = null) {
    try {
      // Get user info first
      const userInfo = await this.getUserInfo(config, sessionToken);
      
      // Get resourcing data
      const response = await this.makeApiRequest(`/resourcing/user/${userInfo.id}`, config, sessionToken);
      
      return (response.resourcing || []).map(resource => ({
        id: resource.id,
        projectId: resource.projectId,
        projectName: resource.projectName,
        clarizenTag: resource.clarizenTag || resource.projectTag,
        userName: userInfo.fullName || userInfo.username,
        hours: resource.allocatedHours || resource.hours,
        startDate: resource.startDate,
        endDate: resource.endDate,
        status: resource.status,
        role: resource.role,
        percentage: resource.percentage
      }));
    } catch (error) {
      console.error('❌ Failed to fetch resourcing data:', error);
      throw new Error(`Failed to fetch resourcing data: ${error.message}`);
    }
  }

  /**
   * Get project details by ID
   */
  async getProject(projectId, config = null, sessionToken = null) {
    try {
      const response = await this.makeApiRequest(`/projects/${projectId}`, config, sessionToken);
      
      return {
        id: response.id,
        name: response.name,
        description: response.description,
        status: response.status,
        startDate: response.startDate,
        endDate: response.endDate,
        owner: response.owner,
        team: response.team || [],
        tags: response.tags || []
      };
    } catch (error) {
      console.error('❌ Failed to fetch project:', error);
      throw new Error(`Failed to fetch project: ${error.message}`);
    }
  }
}

module.exports = new ClarizenService();
