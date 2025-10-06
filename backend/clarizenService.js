const axios = require('axios');
const fs = require('fs');
const path = require('path');

/**
 * ClarizenService - Backend service for Clarizen REST API integration
 * Based on official Clarizen REST API v2.0 documentation
 */
class ClarizenService {
  constructor() {
    this.baseUrl = process.env.CLARIZEN_BASE_URL || '';
    this.username = process.env.CLARIZEN_USERNAME || '';
    this.password = process.env.CLARIZEN_PASSWORD || '';
    this.apiBaseUrl = 'https://api.clarizen.com/v2.0/services';
  }

  /**
   * Save response data to a text file for debugging
   */
  saveResponseToFile(endpoint, response, filename = 'clarizen_responses.txt') {
    try {
      const timestamp = new Date().toISOString();
      const logEntry = `
========================================
Timestamp: ${timestamp}
Endpoint: ${endpoint}
Response: ${JSON.stringify(response, null, 2)}
========================================

`;
      
      const filePath = path.join(__dirname, filename);
      fs.appendFileSync(filePath, logEntry);
      console.log(`📁 Response saved to: ${filePath}`);
    } catch (error) {
      console.error('❌ Failed to save response to file:', error);
    }
  }

  /**
   * Test connection to Clarizen REST API
   */
  async testConnection(config = null) {
    try {
      const baseUrl = config?.baseUrl || this.baseUrl;
      const username = config?.username || this.username;
      const password = config?.password || this.password;

      console.log('🔍 Testing Clarizen REST API connection with:');
      console.log('  Username:', username);
      console.log('  Password:', password ? '***PROVIDED***' : 'NOT PROVIDED');

      if (!username || !password) {
        const missing = [];
        if (!username) missing.push('username');
        if (!password) missing.push('password');
        throw new Error(`Clarizen configuration is incomplete. Missing: ${missing.join(', ')}`);
      }

      // Authenticate and get session token
      const sessionToken = await this.authenticate(username, password);
      
      console.log('✅ Clarizen REST API authentication successful');
      
      return {
        success: true,
        message: 'Successfully connected to Clarizen REST API',
        accessToken: sessionToken,
        user: {
          username: username,
          apiBaseUrl: this.apiBaseUrl
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
   * Authenticate with Clarizen REST API and get session token
   */
  async authenticate(username, password) {
    try {
      console.log('🔐 Authenticating with Clarizen REST API...');
      
      const response = await axios.post(`${this.apiBaseUrl}/authentication/login`, {
        username: username,
        password: password
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      if (response.data && response.data.sessionId) {
        console.log('✅ Clarizen REST API authentication successful');
        return response.data.sessionId;
      } else {
        throw new Error('No session ID received from authentication');
      }
    } catch (error) {
      console.error('❌ Clarizen REST API authentication failed:', error);
      throw new Error(`Authentication failed: ${error.message}`);
    }
  }

  /**
   * Make authenticated API request to Clarizen REST API
   */
  async makeApiRequest(endpoint, sessionToken, method = 'GET', data = null) {
    try {
      const url = `${this.apiBaseUrl}${endpoint}`;
      console.log(`🌐 Making Clarizen REST API request: ${method} ${url}`);

      const headers = {
        'Authorization': `Session ${sessionToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      };

      const config = {
        method: method,
        url: url,
        headers: headers
      };

      if (data) {
        config.data = data;
      }

      const response = await axios(config);
      return response.data;
    } catch (error) {
      console.error(`❌ API request failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get user info from Clarizen
   */
  async getUserInfo(sessionToken) {
    try {
      console.log('👤 Getting user info...');
      const response = await this.makeApiRequest('/authentication/GetSessionInfo', sessionToken);
      
      console.log('👤 Raw user info response:', JSON.stringify(response, null, 2));
      
      const userInfo = {
        username: response.userName || response.username,
        fullName: response.fullName || response.displayName,
        email: response.email,
        sessionId: response.sessionId
      };
      
      console.log('👤 Processed user info:', userInfo);
      
      return userInfo;
    } catch (error) {
      console.error('❌ Failed to get user info:', error);
      throw new Error(`Failed to get user info: ${error.message}`);
    }
  }

  /**
   * Get user assignments using CZQL query
   */
  async getUserAssignments(sessionToken, username = null) {
    try {
      console.log('📋 Getting user assignments...');
      
      // Get current user info first to get the correct username
      const userInfo = await this.getUserInfo(sessionToken);
      const currentUser = username || userInfo.fullName || userInfo.username;
      
      console.log(`🔍 Filtering assignments for user: ${currentUser}`);
      
      // CZQL query to get current user and their assigned work items
      const query = `SELECT Name, (SELECT Name, EntityType, State, RemainingEffort, ActualEffort FROM AssignedWorkItems) FROM User WHERE Name = '${currentUser}'`;

      const response = await this.makeApiRequest('/data/query', sessionToken, 'POST', { q: query });
      
      this.saveResponseToFile('getUserAssignments', response);
      
      return response;
    } catch (error) {
      console.error('❌ Failed to get user assignments:', error);
      throw new Error(`Failed to get user assignments: ${error.message}`);
    }
  }

  /**
   * Get project resources using CZQL query
   */
  async getProjectResources(sessionToken) {
    try {
      console.log('🏗️ Getting project resources...');
      
      // Get current user info first to filter by current user
      const userInfo = await this.getUserInfo(sessionToken);
      const currentUser = userInfo.fullName || userInfo.username;
      
      console.log(`🔍 Filtering project resources for user: ${currentUser}`);
      
      // CZQL query to get projects and their resources, filtered by current user
      const query = `SELECT Name, (SELECT Name, Role FROM Resources WHERE Name = '${currentUser}') FROM Project WHERE State='Active'`;
      
      const response = await this.makeApiRequest('/data/query', sessionToken, 'POST', { q: query });
      
      this.saveResponseToFile('getProjectResources', response);
      
      return response;
    } catch (error) {
      console.error('❌ Failed to get project resources:', error);
      throw new Error(`Failed to get project resources: ${error.message}`);
    }
  }

  /**
   * Get timesheet data for actual hours
   */
  async getTimesheetData(sessionToken, startDate = '2025-01-01', endDate = '2025-12-31') {
    try {
      console.log('⏰ Getting timesheet data...');
      
      // Get current user info first to filter by current user
      const userInfo = await this.getUserInfo(sessionToken);
      const currentUser = userInfo.fullName || userInfo.username;
      
      console.log(`🔍 Filtering timesheet data for user: ${currentUser}`);
      
      // Try multiple filtering approaches
      const queries = [
        // Try exact name match
        `SELECT ReportedBy.Name, WorkItem.Name, WorkItem.EntityType, Duration, ReportedDate FROM Timesheet WHERE ReportedDate >= '${startDate}' AND ReportedDate <= '${endDate}' AND ReportedBy.Name = '${currentUser}'`,
        // Try without user filter to see all data
        `SELECT ReportedBy.Name, WorkItem.Name, WorkItem.EntityType, Duration, ReportedDate FROM Timesheet WHERE ReportedDate >= '${startDate}' AND ReportedDate <= '${endDate}'`,
        // Try with email if available
        userInfo.email ? `SELECT ReportedBy.Name, WorkItem.Name, WorkItem.EntityType, Duration, ReportedDate FROM Timesheet WHERE ReportedDate >= '${startDate}' AND ReportedDate <= '${endDate}' AND ReportedBy.Email = '${userInfo.email}'` : null
      ].filter(Boolean);
      
      let response = null;
      for (let i = 0; i < queries.length; i++) {
        try {
          console.log(`🔍 Trying timesheet query ${i + 1}:`, queries[i]);
          response = await this.makeApiRequest('/data/query', sessionToken, 'POST', { q: queries[i] });
          
          if (response.entities && response.entities.length > 0) {
            console.log(`✅ Found ${response.entities.length} timesheet entries with query ${i + 1}`);
            break;
          } else {
            console.log(`⚠️ Query ${i + 1} returned no results`);
          }
        } catch (error) {
          console.log(`❌ Query ${i + 1} failed:`, error.message);
        }
      }
      
      this.saveResponseToFile('getTimesheetData', response);
      
      return response;
    } catch (error) {
      console.error('❌ Failed to get timesheet data:', error);
      throw new Error(`Failed to get timesheet data: ${error.message}`);
    }
  }

  /**
   * Get resource allocations using RegularResourceLink
   */
  async getResourceAllocations(sessionToken) {
    try {
      console.log('📊 Getting resource allocations...');
      
      // Get current user info first to filter by current user
      const userInfo = await this.getUserInfo(sessionToken);
      const currentUser = userInfo.fullName || userInfo.username;
      
      console.log(`🔍 Filtering resource allocations for user: ${currentUser}`);
      
      // Try multiple filtering approaches
      const queries = [
        // Try exact name match
        `SELECT WorkItem.Name, WorkItem.EntityType, Resource.Name, Work, Units FROM RegularResourceLink WHERE WorkItem.EntityType IN ('Project', 'Task') AND Resource.Name = '${currentUser}'`,
        // Try without user filter to see all data
        `SELECT WorkItem.Name, WorkItem.EntityType, Resource.Name, Work, Units FROM RegularResourceLink WHERE WorkItem.EntityType IN ('Project', 'Task')`,
        // Try with email if available
        userInfo.email ? `SELECT WorkItem.Name, WorkItem.EntityType, Resource.Name, Work, Units FROM RegularResourceLink WHERE WorkItem.EntityType IN ('Project', 'Task') AND Resource.Email = '${userInfo.email}'` : null
      ].filter(Boolean);
      
      let response = null;
      for (let i = 0; i < queries.length; i++) {
        try {
          console.log(`🔍 Trying resource allocation query ${i + 1}:`, queries[i]);
          response = await this.makeApiRequest('/data/query', sessionToken, 'POST', { q: queries[i] });
          
          if (response.entities && response.entities.length > 0) {
            console.log(`✅ Found ${response.entities.length} resource allocations with query ${i + 1}`);
            break;
          } else {
            console.log(`⚠️ Query ${i + 1} returned no results`);
          }
        } catch (error) {
          console.log(`❌ Query ${i + 1} failed:`, error.message);
        }
      }
      
      this.saveResponseToFile('getResourceAllocations', response);
      
      return response;
    } catch (error) {
      console.error('❌ Failed to get resource allocations:', error);
      throw new Error(`Failed to get resource allocations: ${error.message}`);
    }
  }

  /**
   * Get comprehensive resourcing data
   */
  async getResourcingData(config = null, sessionToken = null) {
    try {
      console.log('🌐 Getting comprehensive resourcing data from Clarizen REST API...');
      
      if (!sessionToken) {
        throw new Error('Session token required for resourcing data');
      }

      // Get user info first
      const userInfo = await this.getUserInfo(sessionToken);
      console.log('👤 User info:', userInfo);

      // Get all types of resourcing data
      const [assignments, projectResources, timesheetData, allocations] = await Promise.allSettled([
        this.getUserAssignments(sessionToken, userInfo.username),
        this.getProjectResources(sessionToken),
        this.getTimesheetData(sessionToken),
        this.getResourceAllocations(sessionToken)
      ]);

      // Process and combine the data
      const resourcingData = [];
      const currentUser = userInfo.fullName || userInfo.username;

      // Process assignments
      if (assignments.status === 'fulfilled' && assignments.value && assignments.value.entities) {
        for (const user of assignments.value.entities) {
          if (user.AssignedWorkItems && user.AssignedWorkItems.entities) {
            for (const workItem of user.AssignedWorkItems.entities) {
              resourcingData.push({
                id: workItem.id,
                projectId: workItem.ParentProject?.id,
                projectName: workItem.ParentProject?.Name || workItem.Name,
                clarizenTag: workItem.EntityType,
                userName: user.Name,
                hours: workItem.RemainingEffort || workItem.ActualEffort || 0,
                startDate: workItem.StartDate,
                endDate: workItem.DueDate,
                status: workItem.State?.id || 'Active',
                role: 'Assigned',
                percentage: null,
                type: 'Assignment'
              });
            }
          }
        }
      }

      // Process project resources
      if (projectResources.status === 'fulfilled' && projectResources.value && projectResources.value.entities) {
        for (const project of projectResources.value.entities) {
          if (project.Resources && project.Resources.entities) {
            for (const resource of project.Resources.entities) {
              // Only include project resources for the current user
              if (resource.Name === currentUser) {
                resourcingData.push({
                  id: `${project.id}-${resource.id}`,
                  projectId: project.id,
                  projectName: project.Name,
                  clarizenTag: 'Project Resource',
                  userName: resource.Name,
                  hours: null, // Project resources don't have specific hours
                  startDate: null,
                  endDate: null,
                  status: 'Active',
                  role: resource.Role || 'Resource',
                  percentage: null,
                  type: 'Project Resource'
                });
              }
            }
          }
        }
      }

      // Process timesheet data (filter by current user)
      if (timesheetData.status === 'fulfilled' && timesheetData.value && timesheetData.value.entities) {
        for (const timesheet of timesheetData.value.entities) {
          // Only include timesheet entries for the current user
          if (timesheet.ReportedBy && timesheet.ReportedBy.Name === currentUser) {
            resourcingData.push({
              id: timesheet.id,
              projectId: timesheet.WorkItem?.id,
              projectName: timesheet.WorkItem?.Name,
              clarizenTag: timesheet.WorkItem?.EntityType || 'Timesheet',
              userName: timesheet.ReportedBy.Name,
              hours: timesheet.Duration?.value || 0,
              startDate: timesheet.ReportedDate,
              endDate: timesheet.ReportedDate,
              status: 'Logged',
              role: 'Time Entry',
              percentage: null,
              type: 'Timesheet'
            });
          }
        }
      }

      // Process allocations
      if (allocations.status === 'fulfilled' && allocations.value && allocations.value.entities) {
        for (const allocation of allocations.value.entities) {
          // Only include allocations for the current user
          if (allocation.Resource && allocation.Resource.Name === currentUser) {
            resourcingData.push({
              id: allocation.id,
              projectId: allocation.WorkItem?.id,
              projectName: allocation.WorkItem?.Name,
              clarizenTag: allocation.WorkItem?.EntityType || 'Allocation',
              userName: allocation.Resource.Name,
              hours: allocation.Work || allocation.Units || 0,
              startDate: null,
              endDate: null,
              status: 'Active',
              role: 'Allocated',
              percentage: null,
              type: 'Allocation'
            });
          }
        }
      }

      // Save final result summary
      this.saveResponseToFile('FINAL_RESULT', {
        totalDataSources: 4,
        currentUser: currentUser,
        assignmentsFound: assignments.status === 'fulfilled' && assignments.value ? assignments.value.entities?.length || 0 : 0,
        projectResourcesFound: projectResources.status === 'fulfilled' && projectResources.value ? projectResources.value.entities?.length || 0 : 0,
        timesheetEntriesFound: timesheetData.status === 'fulfilled' && timesheetData.value ? timesheetData.value.entities?.length || 0 : 0,
        allocationsFound: allocations.status === 'fulfilled' && allocations.value ? allocations.value.entities?.length || 0 : 0,
        totalResourcingEntries: resourcingData.length,
        resourcingData: resourcingData
      });

      console.log(`✅ Retrieved ${resourcingData.length} resourcing entries from Clarizen REST API`);
      return resourcingData;

    } catch (error) {
      console.error('❌ Failed to fetch resourcing data:', error);
      // Save error summary
      this.saveResponseToFile('ERROR_SUMMARY', {
        error: error.message,
        stack: error.stack
      });
      throw new Error(`Failed to fetch resourcing data: ${error.message}`);
    }
  }
}

module.exports = new ClarizenService();