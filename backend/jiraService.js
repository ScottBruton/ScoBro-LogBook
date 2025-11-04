const axios = require('axios');

/**
 * Backend Jira Service
 * Handles Jira API integration on the server side
 */
class JiraService {
  constructor() {
    this.baseUrl = process.env.JIRA_COMPANY_EMAIL || '';
    this.username = process.env.JIRA_USER_EMAIL || '';
    this.apiToken = process.env.JIRA_KEY || '';
  }

  /**
   * Test Jira connection
   */
  async testConnection(config = null) {
    try {
      // Use provided config or fall back to environment variables
      const baseUrl = config?.baseUrl || this.baseUrl;
      const username = config?.username || this.username;
      const apiToken = config?.apiToken || this.apiToken;

      console.log('🔍 Testing Jira connection with:');
      console.log('  Base URL:', baseUrl);
      console.log('  Username:', username);
      console.log('  API Token:', apiToken ? `${apiToken.substring(0, 10)}...` : 'NOT PROVIDED');

      if (!baseUrl || !username || !apiToken) {
        const missing = [];
        if (!baseUrl) missing.push('baseUrl');
        if (!username) missing.push('username');
        if (!apiToken) missing.push('apiToken');
        throw new Error(`Jira configuration is incomplete. Missing: ${missing.join(', ')}`);
      }

      const response = await this.makeApiRequest('/myself', { baseUrl, username, apiToken });
      
      return {
        success: true,
        message: `Successfully connected to Jira as ${response.displayName}`,
        user: response
      };
    } catch (error) {
      console.error('❌ Jira connection test failed:', error.message);
      return {
        success: false,
        message: `Failed to connect to Jira: ${error.message}`,
        user: null
      };
    }
  }

  /**
   * Get all projects (with pagination support)
   */
  async getProjects(config = null) {
    try {
      const baseUrl = config?.baseUrl || this.baseUrl;
      const allProjects = [];
      let startAt = 0;
      const maxResults = 100; // Increased from default 50 to get more at once
      let hasMore = true;

      // Fetch all projects with pagination
      while (hasMore) {
        const endpoint = `/project?startAt=${startAt}&maxResults=${maxResults}&expand=description`;
        const response = await this.makeApiRequest(endpoint, config);
        
        // Handle both array response and paginated object response
        const projectsArray = Array.isArray(response) ? response : (response.values || response || []);
        
        const projects = projectsArray.map(project => ({
        key: project.key,
        name: project.name,
        projectTypeKey: project.projectTypeKey,
        description: project.description,
        lead: project.lead?.displayName,
        url: `${baseUrl.replace(/\/$/, '')}/browse/${project.key}`
      }));
        
        allProjects.push(...projects);
        
        // Check if there are more projects
        // If response is an object with values, check pagination info
        if (!Array.isArray(response) && response.isLast !== undefined) {
          hasMore = !response.isLast;
        } else {
          hasMore = projectsArray.length === maxResults;
        }
        startAt += maxResults;
        
        // Safety limit to prevent infinite loops (up to 1000 projects)
        if (startAt > 1000) {
          console.warn('Reached safety limit while fetching projects');
          break;
        }
      }
      
      console.log(`📁 Fetched ${allProjects.length} total projects from Jira`);
      return allProjects;
    } catch (error) {
      console.error('Failed to fetch projects:', error);
      throw error;
    }
  }

  /**
   * Get project details by key
   */
  async getProject(projectKey) {
    try {
      const response = await this.makeApiRequest(`/project/${projectKey}`);
      
      return {
        key: response.key,
        name: response.name,
        description: response.description,
        projectTypeKey: response.projectTypeKey,
        lead: response.lead?.displayName,
        components: response.components?.map(c => c.name) || [],
        issueTypes: response.issueTypes?.map(it => ({
          name: it.name,
          description: it.description,
          iconUrl: it.iconUrl
        })) || [],
        url: `${this.baseUrl.replace(/\/$/, '')}/browse/${response.key}`
      };
    } catch (error) {
      console.error(`Failed to fetch project ${projectKey}:`, error);
      throw error;
    }
  }

  /**
   * Search issues by JQL (with pagination support)
   */
  async searchIssues(jql, config = null, maxResults = 50, startAt = 0, nextPageToken = null) {
    try {
      // Use the new /search/jql endpoint (POST) instead of deprecated /search?jql=... (GET)
      // Endpoint changed per Jira API migration: https://developer.atlassian.com/changelog/#CHANGE-2046
      // New API uses token-based pagination with nextPageToken instead of startAt
      const endpoint = `/search/jql`;
      const requestBody = {
        jql: jql,
        maxResults: maxResults,
        fields: [
          'summary',
          'status',
          'priority',
          'issuetype',
          'assignee',
          'reporter',
          'created',
          'updated',
          'duedate',
          'labels',
          'components',
          'fixVersions',
          'project',
          'resolution',
          'timetracking',
          'environment',
          'customfield_10020', // Sprint
          'customfield_10014', // Epic
          'customfield_10016'  // Story Points
        ]
      };

      // Add nextPageToken if provided (for pagination with new API)
      if (nextPageToken) {
        requestBody.nextPageToken = nextPageToken;
      }
      
      const response = await this.makeApiRequest(endpoint, config, 'POST', requestBody);
      
      console.log(`🔍 Fetched ${response.issues.length} issues from Jira (total: ${response.total})`);
      
      // Log first few issues to debug project key extraction BEFORE formatting
      if (response.issues.length > 0) {
        console.log('🔍 Raw Jira API response - Sample issue project data:', 
          response.issues.slice(0, 5).map(issue => ({
            key: issue.key,
            projectKey: issue.fields?.project?.key,
            projectName: issue.fields?.project?.name,
            projectId: issue.fields?.project?.id,
            hasProject: !!issue.fields?.project
          }))
        );
      }
      
      // Format all issues with config
      const formattedIssues = response.issues.map(issue => this.formatIssueData(issue, config));
      
      // Log summary of formatted issues
      const projectSummary = formattedIssues.slice(0, 10).reduce((acc, issue) => {
        const key = issue.projectKey || 'UNKNOWN';
        if (!acc[key]) acc[key] = { count: 0, examples: [] };
        acc[key].count++;
        if (acc[key].examples.length < 2) {
          acc[key].examples.push(issue.key);
        }
        return acc;
      }, {});
      console.log('🔍 Formatted issues summary (first 10):', projectSummary);
      
      return {
        issues: formattedIssues,
        total: response.total || formattedIssues.length,
        maxResults: response.maxResults || maxResults,
        startAt: response.startAt || startAt,
        nextPageToken: response.nextPageToken || null // New API pagination token
      };
    } catch (error) {
      console.error('Failed to search issues:', error);
      throw error;
    }
  }

  /**
   * Get issues assigned to user (with pagination support)
   */
  async getAssignedIssues(config = null) {
    try {
      // Use quotes around "Done" in case status names are case-sensitive or need quotes
      const jql = `assignee = currentUser() AND status != "Done" ORDER BY priority DESC, updated DESC`;
      const allIssues = [];
      const maxResults = 50;
      let nextPageToken = null;
      let hasMore = true;
      let requestCount = 0;

      // Fetch all assigned issues with pagination (new API uses nextPageToken)
      while (hasMore) {
        const result = await this.searchIssues(jql, config, maxResults, 0, nextPageToken);
        allIssues.push(...result.issues);
        
        // Check if there are more issues (new API uses nextPageToken for pagination)
        nextPageToken = result.nextPageToken || null;
        hasMore = !!nextPageToken && result.issues.length > 0;
        requestCount++;
        
        // Safety limit to prevent infinite loops (up to 500 issues or 10 requests)
        if (allIssues.length >= 500 || requestCount >= 10) {
          console.warn(`Reached safety limit while fetching assigned issues (${allIssues.length} issues, ${requestCount} requests)`);
          break;
        }
      }
      
      console.log(`📋 Fetched ${allIssues.length} total assigned issues from Jira`);
      
      // Log breakdown by project
      const projectBreakdown = allIssues.reduce((acc, issue) => {
        const key = issue.projectKey || 'UNKNOWN';
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {});
      console.log('📋 Assigned issues breakdown by project:', projectBreakdown);
      console.log('📋 Unique project keys in assigned issues:', Object.keys(projectBreakdown));
      
      return allIssues;
    } catch (error) {
      console.error('❌ Failed to get assigned issues:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        response: error.response?.data,
        status: error.response?.status
      });
      // Re-throw so the caller knows there was an error
      throw error;
    }
  }

  /**
   * Get recent issues
   */
  async getRecentIssues(config = null, days = 7) {
    try {
      const date = new Date();
      date.setDate(date.getDate() - days);
      const dateStr = date.toISOString().split('T')[0];

      const jql = `updated >= "${dateStr}" ORDER BY updated DESC`;
      const result = await this.searchIssues(jql, config, 20);
      return result.issues;
    } catch (error) {
      console.error('Failed to get recent issues:', error);
      return [];
    }
  }

  /**
   * Fetch issue details by key
   */
  async fetchIssue(issueKey) {
    try {
      const issue = await this.makeApiRequest(`/issue/${issueKey}`);
      return this.formatIssueData(issue);
    } catch (error) {
      console.error(`Failed to fetch issue ${issueKey}:`, error);
      throw error;
    }
  }

  /**
   * Get all users visible to the account (active + inactive)
   * Uses Jira Cloud REST API /users/search endpoint
   */
  async getAllUsers(config = null) {
    try {
      const baseUrl = config?.baseUrl || this.baseUrl;
      const username = config?.username || this.username;
      const apiToken = config?.apiToken || this.apiToken;

      if (!baseUrl || !username || !apiToken) {
        throw new Error('Jira configuration is incomplete');
      }

      const allUsers = [];
      let startAt = 0;
      const maxResults = 1000; // Jira API max
      let hasMore = true;

      // Page through all users
      while (hasMore) {
        const endpoint = `/users/search?startAt=${startAt}&maxResults=${maxResults}`;
        const url = `${baseUrl.replace(/\/$/, '')}/rest/api/3${endpoint}`;
        const auth = Buffer.from(`${username}:${apiToken}`).toString('base64');

        try {
          const response = await axios({
            method: 'get',
            url: url,
            headers: {
              'Authorization': `Basic ${auth}`,
              'Accept': 'application/json'
            }
          });

          const users = response.data || [];
          
          // Extract display names from users
          const userNames = users
            .filter(user => user.displayName) // Only users with display names
            .map(user => user.displayName);

          allUsers.push(...userNames);

          // Check if there are more users
          hasMore = users.length === maxResults;
          startAt += maxResults;

          // Safety limit to prevent infinite loops
          if (startAt > 10000) {
            console.warn('Reached safety limit while fetching users');
            break;
          }
        } catch (error) {
          console.error(`Error fetching users at startAt=${startAt}:`, error.message);
          // If we get an error, break the loop but return what we have
          hasMore = false;
        }
      }

      // Remove duplicates and sort
      const uniqueUsers = [...new Set(allUsers)].sort();
      console.log(`👥 Fetched ${uniqueUsers.length} unique users from Jira`);
      
      return uniqueUsers;
    } catch (error) {
      console.error('Failed to get all users:', error);
      throw error;
    }
  }

  /**
   * Fetch multiple issues by keys
   */
  async fetchIssues(issueKeys) {
    try {
      if (!issueKeys.length) return [];

      // Jira API allows fetching up to 50 issues at once
      const chunks = this.chunkArray(issueKeys, 50);
      const allIssues = [];

      for (const chunk of chunks) {
        const jql = `key in (${chunk.join(', ')})`;
        // Use new /search/jql endpoint
        const response = await this.searchIssues(jql, null, 50, 0);
        
        const formattedIssues = response.issues.map(issue => this.formatIssueData(issue, null));
        allIssues.push(...formattedIssues);
      }

      return allIssues;
    } catch (error) {
      console.error('Failed to fetch issues:', error);
      throw error;
    }
  }

  /**
   * Make authenticated API request to Jira
   * @param {string} endpoint - API endpoint path
   * @param {object} config - Configuration object with baseUrl, username, apiToken
   * @param {string} method - HTTP method ('GET', 'POST', etc.)
   * @param {object} data - Request body for POST requests
   */
  async makeApiRequest(endpoint, config = null, method = 'GET', data = null) {
    const baseUrl = config?.baseUrl || this.baseUrl;
    const username = config?.username || this.username;
    const apiToken = config?.apiToken || this.apiToken;

    if (!baseUrl || !username || !apiToken) {
      throw new Error('Jira configuration is incomplete');
    }

    // Try API v3 first, fall back to v2 if needed
    let url = `${baseUrl.replace(/\/$/, '')}/rest/api/3${endpoint}`;
    const auth = Buffer.from(`${username}:${apiToken}`).toString('base64');

    console.log(`🌐 Making Jira API ${method} request to:`, url);
    if (data && method === 'POST') {
      console.log('📤 Request body:', JSON.stringify(data, null, 2));
    }

    try {
      const axiosConfig = {
        method: method.toLowerCase(),
        url: url,
        headers: {
          'Authorization': `Basic ${auth}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      };

      if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
        axiosConfig.data = data;
      }

      const response = await axios(axiosConfig);

      return response.data;
    } catch (error) {
      // Better error handling - log the actual Jira error message
      if (error.response) {
        const status = error.response.status;
        const errorData = error.response.data;
        const errorMessages = errorData?.errorMessages || [];
        const errors = errorData?.errors || {};
        
        console.error(`❌ Jira API Error ${status}:`, {
          url,
          errorMessages,
          errors,
          fullError: errorData,
          responseHeaders: error.response.headers
        });
        
        const errorMsg = errorMessages.length > 0 
          ? errorMessages.join('; ') 
          : `HTTP ${status}: ${error.response.statusText}`;
        
        throw new Error(`Jira API error: ${errorMsg}`);
      } else if (error.request) {
        console.error('❌ No response from Jira API:', error.request);
        throw new Error('No response from Jira API - check network connection');
      } else {
        console.error('❌ Error setting up Jira API request:', error.message);
        throw error;
      }
    }
  }

  /**
   * Format issue data for frontend (matches old working implementation)
   */
  formatIssueData(issue, config = null) {
    const fields = issue.fields;
    // Use config baseUrl if provided, otherwise fall back to instance baseUrl
    const baseUrl = config?.baseUrl || this.baseUrl || '';
    
    // Extract project key and name - this is critical for filtering
    const projectKey = fields.project?.key || 'UNKNOWN';
    const projectName = fields.project?.name || 'Unknown';
    
    // Debug logging to verify project key extraction - only warn on missing keys
    if (projectKey === 'UNKNOWN' || !fields.project?.key) {
      console.warn(`⚠️ Issue ${issue.key} has no project key. fields.project:`, {
        key: fields.project?.key,
        id: fields.project?.id,
        name: fields.project?.name,
        fullProject: fields.project
      });
    }
    
    return {
      key: issue.key,
      summary: fields.summary,
      description: fields.description,
      status: fields.status?.name || 'Unknown',
      priority: fields.priority?.name || 'Medium',
      issueType: fields.issuetype?.name || 'Task',
      assignee: fields.assignee?.displayName || 'Unassigned',
      reporter: fields.reporter?.displayName || 'Unknown',
      created: fields.created,
      updated: fields.updated,
      dueDate: fields.duedate,
      labels: fields.labels || [],
      components: fields.components?.map(c => c.name) || [],
      fixVersions: fields.fixVersions?.map(v => v.name) || [],
      project: projectName,
      projectKey: projectKey, // This is what we use for filtering!
      url: `${baseUrl.replace(/\/$/, '')}/browse/${issue.key}`,
      resolution: fields.resolution?.name,
      timeTracking: fields.timetracking,
      environment: fields.environment,
      // Additional fields for assigned tasks panel
      originalEstimate: fields.timetracking?.originalEstimate || null,
      remainingEstimate: fields.timetracking?.remainingEstimate || null,
      timeSpent: fields.timetracking?.timeSpent || null,
      sprint: fields.customfield_10020?.[0]?.name || 'No Sprint',
      epic: fields.customfield_10014 || null,
      storyPoints: fields.customfield_10016 || null,
      fixVersion: fields.fixVersions?.[0]?.name || null
    };
  }

  /**
   * Utility function to chunk array
   */
  chunkArray(array, size) {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * Add work log to a Jira issue
   * @param {string} issueKey - Issue key (e.g., "CMC-123")
   * @param {number} timeSpentSeconds - Time spent in seconds
   * @param {string} comment - Optional comment for the work log
   * @param {object} config - Configuration object
   */
  async addWorkLog(issueKey, timeSpentSeconds, comment = '', config = null) {
    try {
      const endpoint = `/issue/${issueKey}/worklog`;
      const requestBody = {
        timeSpentSeconds: timeSpentSeconds,
        ...(comment && { comment: { type: 'doc', version: 1, content: [{ type: 'paragraph', content: [{ type: 'text', text: comment }] }] } })
      };
      
      const response = await this.makeApiRequest(endpoint, config, 'POST', requestBody);
      return response;
    } catch (error) {
      console.error(`Failed to add work log to ${issueKey}:`, error);
      throw error;
    }
  }

  /**
   * Add comment to a Jira issue
   * @param {string} issueKey - Issue key (e.g., "CMC-123")
   * @param {string} body - Comment body text
   * @param {object} config - Configuration object
   */
  async addComment(issueKey, body, config = null) {
    try {
      const endpoint = `/issue/${issueKey}/comment`;
      const requestBody = {
        body: {
          type: 'doc',
          version: 1,
          content: [
            {
              type: 'paragraph',
              content: [
                {
                  type: 'text',
                  text: body
                }
              ]
            }
          ]
        }
      };
      
      const response = await this.makeApiRequest(endpoint, config, 'POST', requestBody);
      return response;
    } catch (error) {
      console.error(`Failed to add comment to ${issueKey}:`, error);
      throw error;
    }
  }

  /**
   * Update issue remaining estimate and/or due date
   * @param {string} issueKey - Issue key (e.g., "CMC-123")
   * @param {number} remainingEstimateSeconds - Remaining estimate in seconds (optional)
   * @param {string} dueDate - Due date in ISO format (optional)
   * @param {object} config - Configuration object
   */
  async updateIssue(issueKey, remainingEstimateSeconds = null, dueDate = null, config = null) {
    try {
      const endpoint = `/issue/${issueKey}`;
      const update = {};
      
      if (remainingEstimateSeconds !== null) {
        update.timetracking = {
          remainingEstimate: `${remainingEstimateSeconds}s`
        };
      }
      
      if (dueDate !== null) {
        update.duedate = dueDate;
      }
      
      const requestBody = {
        fields: update
      };
      
      const response = await this.makeApiRequest(endpoint, config, 'PUT', requestBody);
      return response;
    } catch (error) {
      console.error(`Failed to update issue ${issueKey}:`, error);
      throw error;
    }
  }

  /**
   * Get Jira statistics
   */
  async getJiraStats() {
    try {
      const [assignedIssues, recentIssues, projects] = await Promise.all([
        this.getAssignedIssues(),
        this.getRecentIssues(7),
        this.getProjects()
      ]);

      return {
        assignedCount: assignedIssues.length,
        recentCount: recentIssues.length,
        projectCount: projects.length,
        projects: projects.map(p => p.key),
        lastSync: new Date().toISOString()
      };
    } catch (error) {
      console.error('Failed to get Jira stats:', error);
      return null;
    }
  }
}

module.exports = new JiraService();
