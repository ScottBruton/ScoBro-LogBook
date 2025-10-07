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
      console.log('👤 All response keys:', Object.keys(response));
      console.log('👤 Response values:', Object.values(response));
      
      const userInfo = {
        username: response.userName || response.username,
        fullName: response.fullName || response.displayName || response.name || response.Name,
        email: response.email,
        sessionId: response.sessionId,
        userId: response.userId
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
      
      return response;
    } catch (error) {
      console.error('❌ Failed to get project resources:', error);
      throw new Error(`Failed to get project resources: ${error.message}`);
    }
  }

  /**
   * Get timesheet data for actual hours
   */
  async getTimesheetData(sessionToken, startDate = '2024-01-01', endDate = '2025-12-31') {
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
      console.log('👤 Current user name:', userInfo.fullName || userInfo.username);
      console.log('👤 Current user email:', userInfo.email);
      console.log('👤 Current user ID:', userInfo.userId);
      console.log('👤 Raw user info keys:', Object.keys(userInfo));

      // Get all types of resourcing data
      const [assignments, projectResources, timesheetData, allocations] = await Promise.allSettled([
        this.getUserAssignments(sessionToken, userInfo.username),
        this.getProjectResources(sessionToken),
        this.getTimesheetData(sessionToken),
        this.getResourceAllocations(sessionToken)
      ]);

      // Process and combine the data
      const resourcingData = [];
      
      // Find the user's name from timesheet data using userId
      let currentUser = userInfo.fullName || userInfo.username;
      if (!currentUser && userInfo.userId && timesheetData.status === 'fulfilled' && timesheetData.value && timesheetData.value.entities) {
        // Look for the user's name in the timesheet data using their userId
        const userEntry = timesheetData.value.entities.find(entry => 
          entry.ReportedBy && entry.ReportedBy.id && entry.ReportedBy.id.includes(userInfo.userId)
        );
        if (userEntry && userEntry.ReportedBy && userEntry.ReportedBy.Name) {
          currentUser = userEntry.ReportedBy.Name;
          console.log(`🔍 Found user name from timesheet data: "${currentUser}" for userId: ${userInfo.userId}`);
        }
      }
      
      console.log(`🔍 Using currentUser: "${currentUser}"`);

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
        const userProjectResources = [];
        
        for (const project of projectResources.value.entities) {
          if (project.Resources && project.Resources.entities) {
            // Filter only resources for the current user
            const userResources = project.Resources.entities.filter(
              resource => resource.Name === currentUser
            );
            
            // Map to resourcing data format
            const projectResourceData = userResources.map(resource => ({
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
            }));
            
            userProjectResources.push(...projectResourceData);
          }
        }
        
        resourcingData.push(...userProjectResources);
      }

      // Process timesheet data (filter by current user)
      if (timesheetData.status === 'fulfilled' && timesheetData.value && timesheetData.value.entities) {
        console.log(`🔍 Processing ${timesheetData.value.entities.length} timesheet entries`);
        console.log(`🔍 Looking for user: "${currentUser}"`);
        
        // Debug: Log ALL names found in the data
        const allNames = timesheetData.value.entities.map(e => e.ReportedBy?.Name).filter(Boolean);
        console.log(`🔍 Total entries: ${timesheetData.value.entities.length}`);
        console.log(`🔍 All unique names found:`, [...new Set(allNames)]);
        
        // Debug: Show first few user names to see the format
        const sampleNames = timesheetData.value.entities.slice(0, 5).map(e => e.ReportedBy?.Name);
        console.log(`🔍 Sample names in data:`, sampleNames);
        
        // Debug: Check if Scott Bruton is in the data
        const scottEntries = timesheetData.value.entities.filter(e => 
          e.ReportedBy?.Name && e.ReportedBy.Name.includes('Scott')
        );
        console.log(`🔍 Found ${scottEntries.length} entries with 'Scott' in the name`);
        if (scottEntries.length > 0) {
          console.log(`🔍 Scott entries:`, scottEntries.map(e => ({
            name: e.ReportedBy?.Name,
            project: e.WorkItem?.Name,
            hours: e.Duration?.value
          })));
        }
        
        // Debug: Check exact match
        const exactMatches = timesheetData.value.entities.filter(e => 
          e.ReportedBy?.Name === currentUser
        );
        console.log(`🔍 Found ${exactMatches.length} exact matches for "${currentUser}"`);
        
        // Filter only entries where ReportedBy.Name === currentUser
        const userTimesheetEntries = timesheetData.value.entities.filter(
          e => e.ReportedBy?.Name === currentUser
        );
        
        console.log(`🔍 Found ${userTimesheetEntries.length} entries for user "${currentUser}"`);
        
        // Map to resourcing data format
        const userTimesheetData = userTimesheetEntries.map(timesheet => ({
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
        }));
        
        resourcingData.push(...userTimesheetData);
      }

      // Process allocations
      if (allocations.status === 'fulfilled' && allocations.value && allocations.value.entities) {
        // Filter only entries where Resource.Name === currentUser
        const userAllocationEntries = allocations.value.entities.filter(
          e => e.Resource?.Name === currentUser
        );
        
        // Map to resourcing data format
        const userAllocationData = userAllocationEntries.map(allocation => ({
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
        }));
        
        resourcingData.push(...userAllocationData);
      }

      // Save raw responses to clarizen_responses.txt
      this.saveResponseToFile('RAW_RESPONSES', {
        currentUser: currentUser,
        userEmail: userInfo.email,
        rawResponses: {
          assignments: assignments.status === 'fulfilled' ? assignments.value : assignments.reason,
          projectResources: projectResources.status === 'fulfilled' ? projectResources.value : projectResources.reason,
          timesheetData: timesheetData.status === 'fulfilled' ? timesheetData.value : timesheetData.reason,
          allocations: allocations.status === 'fulfilled' ? allocations.value : allocations.reason
        }
      }, 'clarizen_responses.txt');

      // Save filtered results to separate file
      this.saveResponseToFile('FILTERED_RESULTS', {
        currentUser: currentUser,
        userEmail: userInfo.email,
        totalFilteredEntries: resourcingData.length,
        breakdown: {
          assignments: resourcingData.filter(r => r.type === 'Assignment').length,
          projectResources: resourcingData.filter(r => r.type === 'Project Resource').length,
          timesheetEntries: resourcingData.filter(r => r.type === 'Timesheet').length,
          allocations: resourcingData.filter(r => r.type === 'Allocation').length
        },
        filteredResourcingData: resourcingData
      }, 'clarizen_filtered_results.txt');

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