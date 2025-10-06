/**
 * Jira API Service - Handles real-time Jira integration
 * Provides functionality to fetch issue data, update issues, and sync with ScoBro Logbook
 */

export class JiraApiService {
  static STORAGE_KEY = 'jiraApiConfig';
  static BACKEND_URL = 'http://localhost:3001';
  static DEFAULT_CONFIG = {
    enabled: false,
    baseUrl: 'https://idegroup.atlassian.net/',
    username: 'scott@idegroup.com.au',
    apiToken: '',
    projectKeys: [],
    syncInterval: 30, // minutes
    lastSync: null,
    autoFetchIssues: true,
    includeIssueDetails: true,
    includeComments: false,
    includeWorklogs: false
  };

  /**
   * Get Jira API configuration
   */
  static getJiraConfig() {
    try {
      const config = localStorage.getItem(this.STORAGE_KEY);
      return config ? JSON.parse(config) : { ...this.DEFAULT_CONFIG };
    } catch (error) {
      console.error('Failed to get Jira config:', error);
      return { ...this.DEFAULT_CONFIG };
    }
  }

  /**
   * Save Jira API configuration
   */
  static saveJiraConfig(config) {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(config));
      return true;
    } catch (error) {
      console.error('Failed to save Jira config:', error);
      return false;
    }
  }

  /**
   * Test Jira API connection
   */
  static async testConnection(config = null) {
    try {
      const jiraConfig = config || this.getJiraConfig();
      
      console.log('🔍 Frontend Jira config:', {
        baseUrl: jiraConfig.baseUrl,
        username: jiraConfig.username,
        apiToken: jiraConfig.apiToken ? `${jiraConfig.apiToken.substring(0, 10)}...` : 'NOT PROVIDED'
      });
      
      if (!jiraConfig.baseUrl || !jiraConfig.username || !jiraConfig.apiToken) {
        const missing = [];
        if (!jiraConfig.baseUrl) missing.push('baseUrl');
        if (!jiraConfig.username) missing.push('username');
        if (!jiraConfig.apiToken) missing.push('apiToken');
        throw new Error(`Jira configuration is incomplete. Missing: ${missing.join(', ')}`);
      }

      // Test connection via backend API
      const requestBody = {
        baseUrl: jiraConfig.baseUrl,
        username: jiraConfig.username,
        apiToken: jiraConfig.apiToken
      };

      console.log('📤 Sending request to backend:', {
        url: `${this.BACKEND_URL}/api/jira/test`,
        body: {
          baseUrl: requestBody.baseUrl,
          username: requestBody.username,
          apiToken: requestBody.apiToken ? `${requestBody.apiToken.substring(0, 10)}...` : 'NOT PROVIDED'
        }
      });

      const response = await fetch(`${this.BACKEND_URL}/api/jira/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      const result = await response.json();
      console.log('📥 Backend response:', result);
      return result;
    } catch (error) {
      console.error('❌ Frontend Jira test failed:', error);
      return {
        success: false,
        message: `Failed to connect to Jira: ${error.message}`,
        user: null
      };
    }
  }

  /**
   * Get all projects from Jira
   */
  static async getProjects() {
    try {
      const response = await fetch(`${this.BACKEND_URL}/api/jira/projects`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch projects');
      }
      
      return data.projects;
    } catch (error) {
      console.error('Failed to fetch projects:', error);
      throw error;
    }
  }

  /**
   * Get project details by key
   */
  static async getProject(projectKey) {
    try {
      const response = await fetch(`${this.BACKEND_URL}/api/jira/projects/${projectKey}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch project');
      }
      
      return data.project;
    } catch (error) {
      console.error(`Failed to fetch project ${projectKey}:`, error);
      throw error;
    }
  }

  /**
   * Make authenticated API request to Jira (legacy method - now uses backend)
   */
  static async makeApiRequest(endpoint, config = null) {
    // This method is now deprecated in favor of backend API calls
    throw new Error('Direct API calls are deprecated. Use backend API methods instead.');
  }

  /**
   * Fetch issue details by key
   */
  static async fetchIssue(issueKey, config = null) {
    try {
      const response = await fetch(`${this.BACKEND_URL}/api/jira/issues/fetch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          issueKeys: [issueKey]
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch issue');
      }
      
      return data.issues[0] || null;
    } catch (error) {
      console.error(`Failed to fetch issue ${issueKey}:`, error);
      throw error;
    }
  }

  /**
   * Fetch multiple issues by keys
   */
  static async fetchIssues(issueKeys, config = null) {
    try {
      if (!issueKeys.length) {
        return [];
      }

      const response = await fetch(`${this.BACKEND_URL}/api/jira/issues/fetch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          issueKeys: issueKeys
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch issues');
      }
      
      return data.issues;
    } catch (error) {
      console.error('Failed to fetch issues:', error);
      throw error;
    }
  }

  /**
   * Search issues by JQL
   */
  static async searchIssues(jql, config = null, maxResults = 50) {
    try {
      const response = await fetch(`${this.BACKEND_URL}/api/jira/issues/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          jql: jql,
          maxResults: maxResults
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to search issues');
      }
      
      return data;
    } catch (error) {
      console.error('Failed to search issues:', error);
      throw error;
    }
  }

  /**
   * Get recent issues for user
   */
  static async getRecentIssues(config = null, days = 7) {
    try {
      const response = await fetch(`${this.BACKEND_URL}/api/jira/issues/recent?days=${days}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch recent issues');
      }
      
      return data.issues;
    } catch (error) {
      console.error('Failed to get recent issues:', error);
      return [];
    }
  }

  /**
   * Get issues assigned to user
   */
  static async getAssignedIssues(config = null) {
    try {
      const response = await fetch(`${this.BACKEND_URL}/api/jira/issues/assigned`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch assigned issues');
      }
      
      return data.issues;
    } catch (error) {
      console.error('Failed to get assigned issues:', error);
      return [];
    }
  }

  /**
   * Format issue data for ScoBro Logbook
   */
  static formatIssueData(issue, config) {
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
      url: `${config.baseUrl.replace(/\/$/, '')}/browse/${issue.key}`,
      // Additional details if requested
      ...(config.includeIssueDetails && {
        resolution: fields.resolution?.name,
        timeTracking: fields.timetracking,
        environment: fields.environment,
        customFields: this.extractCustomFields(fields)
      })
    };
  }

  /**
   * Extract custom fields from issue
   */
  static extractCustomFields(fields) {
    const customFields = {};
    
    // Look for custom fields (they usually have numeric keys)
    Object.keys(fields).forEach(key => {
      if (key.startsWith('customfield_')) {
        const value = fields[key];
        if (value !== null && value !== undefined) {
          customFields[key] = value;
        }
      }
    });
    
    return customFields;
  }

  /**
   * Parse Jira references from text
   */
  static parseJiraReferences(text) {
    const jiraPattern = /\b([A-Z][A-Z0-9]*-\d+)\b/g;
    const matches = text.match(jiraPattern);
    return matches ? [...new Set(matches)] : [];
  }

  /**
   * Validate Jira reference format
   */
  static validateJiraReference(issueKey) {
    const jiraPattern = /^[A-Z][A-Z0-9]*-\d+$/;
    return jiraPattern.test(issueKey);
  }

  /**
   * Get issue type icon
   */
  static getIssueTypeIcon(issueType) {
    const icons = {
      'Bug': '🐛',
      'Task': '📋',
      'Story': '📖',
      'Epic': '🎯',
      'Sub-task': '📝',
      'Improvement': '✨',
      'New Feature': '🆕',
      'Technical Task': '⚙️'
    };
    
    return icons[issueType] || '📄';
  }

  /**
   * Get priority color
   */
  static getPriorityColor(priority) {
    const colors = {
      'Highest': '#dc3545',
      'High': '#fd7e14',
      'Medium': '#ffc107',
      'Low': '#28a745',
      'Lowest': '#6c757d'
    };
    
    return colors[priority] || '#6c757d';
  }

  /**
   * Get status color
   */
  static getStatusColor(status) {
    const colors = {
      'To Do': '#6c757d',
      'In Progress': '#007bff',
      'Done': '#28a745',
      'Closed': '#6c757d',
      'Resolved': '#17a2b8',
      'Reopened': '#ffc107'
    };
    
    return colors[status] || '#6c757d';
  }

  /**
   * Sync Jira issues with entries
   */
  static async syncJiraIssues(entries, config = null) {
    try {
      const jiraConfig = config || this.getJiraConfig();
      
      if (!jiraConfig.enabled) {
        return { synced: 0, errors: [] };
      }

      // Extract all Jira references from entries
      const allJiraRefs = new Set();
      entries.forEach(entry => {
        entry.items?.forEach(item => {
          if (item.jira && Array.isArray(item.jira)) {
            item.jira.forEach(ref => {
              if (this.validateJiraReference(ref)) {
                allJiraRefs.add(ref);
              }
            });
          }
        });
      });

      if (allJiraRefs.size === 0) {
        return { synced: 0, errors: [] };
      }

      // Fetch issue details
      const issues = await this.fetchIssues([...allJiraRefs], jiraConfig);
      
      // Update last sync time
      jiraConfig.lastSync = new Date().toISOString();
      this.saveJiraConfig(jiraConfig);

      return {
        synced: issues.length,
        errors: [],
        issues: issues
      };
    } catch (error) {
      console.error('Failed to sync Jira issues:', error);
      return {
        synced: 0,
        errors: [error.message],
        issues: []
      };
    }
  }

  /**
   * Get Jira statistics
   */
  static async getJiraStats(config = null) {
    try {
      const response = await fetch(`${this.BACKEND_URL}/api/jira/stats`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch Jira statistics');
      }
      
      const jiraConfig = config || this.getJiraConfig();
      
      return {
        ...data.stats,
        config: {
          baseUrl: jiraConfig.baseUrl,
          projectKeys: jiraConfig.projectKeys,
          syncInterval: jiraConfig.syncInterval
        }
      };
    } catch (error) {
      console.error('Failed to get Jira stats:', error);
      return null;
    }
  }

  /**
   * Disable Jira API
   */
  static disableJiraApi() {
    try {
      const config = this.getJiraConfig();
      config.enabled = false;
      this.saveJiraConfig(config);
      return true;
    } catch (error) {
      console.error('Failed to disable Jira API:', error);
      return false;
    }
  }

  /**
   * Utility function to chunk array
   */
  static chunkArray(array, size) {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * Get sync status
   */
  static getSyncStatus() {
    try {
      const config = this.getJiraConfig();
      
      if (!config.enabled) {
        return {
          status: 'disabled',
          message: 'Jira API is disabled',
          lastSync: null
        };
      }

      if (!config.lastSync) {
        return {
          status: 'never_synced',
          message: 'Jira API never synced',
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
