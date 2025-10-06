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
   * Get all projects
   */
  async getProjects(config = null) {
    try {
      const response = await this.makeApiRequest('/project', config);
      
      const baseUrl = config?.baseUrl || this.baseUrl;
      
      return response.map(project => ({
        key: project.key,
        name: project.name,
        projectTypeKey: project.projectTypeKey,
        description: project.description,
        lead: project.lead?.displayName,
        url: `${baseUrl.replace(/\/$/, '')}/browse/${project.key}`
      }));
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
   * Search issues by JQL
   */
  async searchIssues(jql, config = null, maxResults = 50) {
    try {
      const response = await this.makeApiRequest(`/search?jql=${encodeURIComponent(jql)}&maxResults=${maxResults}`, config);
      
      return {
        issues: response.issues.map(issue => this.formatIssueData(issue)),
        total: response.total,
        maxResults: response.maxResults
      };
    } catch (error) {
      console.error('Failed to search issues:', error);
      throw error;
    }
  }

  /**
   * Get issues assigned to user
   */
  async getAssignedIssues(config = null) {
    try {
      const jql = `assignee = currentUser() AND status != Done ORDER BY priority DESC, updated DESC`;
      const result = await this.searchIssues(jql, config, 20);
      return result.issues;
    } catch (error) {
      console.error('Failed to get assigned issues:', error);
      return [];
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
        const response = await this.makeApiRequest(`/search?jql=${encodeURIComponent(jql)}&maxResults=50`);
        
        const formattedIssues = response.issues.map(issue => this.formatIssueData(issue));
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
   */
  async makeApiRequest(endpoint, config = null) {
    const baseUrl = config?.baseUrl || this.baseUrl;
    const username = config?.username || this.username;
    const apiToken = config?.apiToken || this.apiToken;

    if (!baseUrl || !username || !apiToken) {
      throw new Error('Jira configuration is incomplete');
    }

    const url = `${baseUrl.replace(/\/$/, '')}/rest/api/3${endpoint}`;
    const auth = Buffer.from(`${username}:${apiToken}`).toString('base64');

    console.log('🌐 Making Jira API request to:', url);

    const response = await axios.get(url, {
      headers: {
        'Authorization': `Basic ${auth}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });

    return response.data;
  }

  /**
   * Format issue data for frontend
   */
  formatIssueData(issue) {
    const fields = issue.fields;
    
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
      project: fields.project?.name || 'Unknown',
      projectKey: fields.project?.key || 'UNKNOWN',
      url: `${this.baseUrl.replace(/\/$/, '')}/browse/${issue.key}`,
      resolution: fields.resolution?.name,
      timeTracking: fields.timetracking,
      environment: fields.environment
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
