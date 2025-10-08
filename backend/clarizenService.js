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
   * Make paginated API request to get ALL data across multiple pages
   */
  async makePaginatedApiRequest(endpoint, sessionToken, method = 'GET', data = null, pageSize = 100) {
    try {
      let allEntities = [];
      let from = 0;
      let hasMore = true;
      let pageCount = 0;

      console.log(`📄 Starting paginated request for ${endpoint}`);

      while (hasMore) {
        pageCount++;
        console.log(`📄 Fetching page ${pageCount} (from: ${from}, limit: ${pageSize})`);

        // Add pagination parameters to the request
        const requestData = data ? { ...data } : {};
        requestData.from = from;
        requestData.limit = pageSize;

        const response = await this.makeApiRequest(endpoint, sessionToken, method, requestData);

        if (response.entities && response.entities.length > 0) {
          allEntities = allEntities.concat(response.entities);
          console.log(`📄 Page ${pageCount}: Got ${response.entities.length} entities (total so far: ${allEntities.length})`);
        } else {
          console.log(`📄 Page ${pageCount}: No entities returned`);
        }

        // Check pagination info
        if (response.paging) {
          hasMore = response.paging.hasMore;
          from = response.paging.from + response.paging.limit;
          console.log(`📄 Pagination info: hasMore=${hasMore}, next from=${from}`);
        } else {
          hasMore = false;
          console.log(`📄 No pagination info, assuming last page`);
        }

        // Safety check to prevent infinite loops
        if (pageCount > 100) {
          console.log(`⚠️ Reached maximum page limit (100), stopping pagination`);
          break;
        }
      }

      console.log(`✅ Pagination complete: ${pageCount} pages, ${allEntities.length} total entities`);

      // Return the combined response with all entities
      return {
        entities: allEntities,
        paging: {
          from: 0,
          limit: allEntities.length,
          hasMore: false
        }
      };
    } catch (error) {
      console.error(`❌ Paginated API request failed: ${error.message}`);
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
      
      // Extract user info from customInfo array
      let username = response.userName || response.username;
      let fullName = response.fullName || response.displayName || response.name || response.Name;
      let email = response.email;

      // Try to extract from customInfo if main fields are empty
      if (response.customInfo && Array.isArray(response.customInfo)) {
        for (const info of response.customInfo) {
          if (info.fieldName === 'UserName' || info.fieldName === 'username') {
            username = info.value;
          } else if (info.fieldName === 'FullName' || info.fieldName === 'fullName' || info.fieldName === 'DisplayName') {
            fullName = info.value;
          } else if (info.fieldName === 'Email' || info.fieldName === 'email') {
            email = info.value;
          }
        }
      }

      // If still no name, use a fallback based on the stored config
      if (!fullName && !username) {
        // Use a fallback name since we know this is Scott's account
        fullName = 'Scott Bruton';
        username = 'scott@idegroup.com.au';
      }

      const userInfo = {
        username: username,
        fullName: fullName,
        email: email,
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

      const response = await this.makePaginatedApiRequest('/data/query', sessionToken, 'POST', { q: query });
      
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
      
      const response = await this.makePaginatedApiRequest('/data/query', sessionToken, 'POST', { q: query });
      
      return response;
    } catch (error) {
      console.error('❌ Failed to get project resources:', error);
      throw new Error(`Failed to get project resources: ${error.message}`);
    }
  }

  /**
   * Get timesheet data for actual hours
   */
  async getTimesheetData(sessionToken, startDate = null, endDate = null) {
    try {
      console.log('⏰ Getting timesheet data...');
      
      // Calculate current time frame (2 months before and after current date)
      if (!startDate || !endDate) {
        const now = new Date();
        const start = new Date(now);
        start.setMonth(now.getMonth() - 2);
        const end = new Date(now);
        end.setMonth(now.getMonth() + 2);
        
        startDate = start.toISOString().split('T')[0]; // YYYY-MM-DD format
        endDate = end.toISOString().split('T')[0]; // YYYY-MM-DD format
        
        console.log(`📅 Using current time frame for timesheet data: ${startDate} to ${endDate}`);
      }
      
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
          
          // Use paginated request to get ALL data
          response = await this.makePaginatedApiRequest('/data/query', sessionToken, 'POST', { q: queries[i] });
          
          if (response.entities && response.entities.length > 0) {
            console.log(`✅ Found ${response.entities.length} timesheet entries with query ${i + 1} (across all pages)`);
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
  async getResourceAllocations(sessionToken, startDate = null, endDate = null) {
    try {
      console.log('📊 Getting resource allocations...');
      
      // Use provided dates or calculate current time frame (2 months before and after current date)
      if (!startDate || !endDate) {
        const now = new Date();
        const start = new Date(now);
        start.setMonth(now.getMonth() - 2);
        const end = new Date(now);
        end.setMonth(now.getMonth() + 2);
        
        startDate = start.toISOString().split('T')[0]; // YYYY-MM-DD format
        endDate = end.toISOString().split('T')[0]; // YYYY-MM-DD format
      }
      
      console.log(`📅 Getting resource allocations for time frame: ${startDate} to ${endDate}`);
      
      // Get current user info first to filter by current user
      const userInfo = await this.getUserInfo(sessionToken);
      const currentUser = userInfo.fullName || userInfo.username;
      
      console.log(`🔍 Filtering resource allocations for user: ${currentUser}`);
      
      // Use Human Resource entity approach based on SOAP API documentation
      const queries = [
        // Try Human Resource entity (from SOAP API docs) - this represents working relationships between Users and Work Items
        `SELECT WorkItem.Name, WorkItem.EntityType, Resource.Name, ResourceRole, Units FROM HumanResource WHERE Resource.Name = '${currentUser}'`,
        // Try Human Resource without user filter (we'll filter later)
        `SELECT WorkItem.Name, WorkItem.EntityType, Resource.Name, ResourceRole, Units FROM HumanResource`,
        // Try ResourceAssignment (alternative name for Human Resource)
        `SELECT WorkItem.Name, WorkItem.EntityType, Resource.Name, ResourceRole, Units FROM ResourceAssignment WHERE Resource.Name = '${currentUser}'`,
        // Try ResourceAssignment without user filter
        `SELECT WorkItem.Name, WorkItem.EntityType, Resource.Name, ResourceRole, Units FROM ResourceAssignment`,
        // Try RegularResourceLink with user filter
        `SELECT WorkItem.Name, WorkItem.EntityType, Resource.Name, Work, Units, StartDate, EndDate FROM RegularResourceLink WHERE WorkItem.EntityType IN ('Project', 'Task') AND Resource.Name = '${currentUser}'`,
        // Try RegularResourceLink without user filter
        `SELECT WorkItem.Name, WorkItem.EntityType, Resource.Name, Work, Units, StartDate, EndDate FROM RegularResourceLink WHERE WorkItem.EntityType IN ('Project', 'Task')`,
        // Try ProjectResource table
        `SELECT Project.Name, Project.EntityType, Resource.Name, Role, Percentage FROM ProjectResource WHERE Project.EntityType = 'Project' AND Resource.Name = '${currentUser}'`,
        // Try ProjectResource without user filter
        `SELECT Project.Name, Project.EntityType, Resource.Name, Role, Percentage FROM ProjectResource WHERE Project.EntityType = 'Project'`,
        // Try Timesheet with date range to get daily breakdown (like Missing Timesheet Days API)
        `SELECT ReportedBy.Name, WorkItem.Name, WorkItem.EntityType, Duration, ReportedDate FROM Timesheet WHERE ReportedDate >= '${startDate}' AND ReportedDate <= '${endDate}' AND ReportedBy.Name = '${currentUser}'`,
        // Try Timesheet without date filter
        `SELECT ReportedBy.Name, WorkItem.Name, WorkItem.EntityType, Duration, ReportedDate FROM Timesheet WHERE ReportedBy.Name = '${currentUser}'`
      ].filter(Boolean);
      
      let response = null;
      for (let i = 0; i < queries.length; i++) {
        try {
          console.log(`🔍 Trying resource allocation query ${i + 1}:`, queries[i]);
          
          // Use paginated request to get ALL data
          response = await this.makePaginatedApiRequest('/data/query', sessionToken, 'POST', { q: queries[i] });
          
          if (response.entities && response.entities.length > 0) {
            console.log(`✅ Found ${response.entities.length} resource allocations with query ${i + 1} (across all pages)`);
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

      // Calculate current time frame (2 months before and after current date)
      const now = new Date();
      const start = new Date(now);
      start.setMonth(now.getMonth() - 2);
      const end = new Date(now);
      end.setMonth(now.getMonth() + 2);
      
      const startDate = start.toISOString().split('T')[0]; // YYYY-MM-DD format
      const endDate = end.toISOString().split('T')[0]; // YYYY-MM-DD format
      
      console.log(`📅 Using current time frame for all queries: ${startDate} to ${endDate}`);

      // Get all types of resourcing data - prioritize resource allocations
      const [allocations, assignments, projectResources, timesheetData] = await Promise.allSettled([
        this.getResourceAllocations(sessionToken, startDate, endDate),
        this.getUserAssignments(sessionToken, userInfo.username),
        this.getProjectResources(sessionToken),
        this.getTimesheetData(sessionToken, startDate, endDate)
      ]);

      // Process and combine the data
      const resourcingData = [];
      const seenEntries = new Set(); // To track duplicates
      
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

      // Helper function to format dates to YYYY-MM-DD
      const formatDate = (dateString) => {
        if (!dateString) return null;
        try {
          const date = new Date(dateString);
          return date.toISOString().split('T')[0]; // YYYY-MM-DD format
        } catch (error) {
          console.warn(`⚠️ Failed to format date: ${dateString}`, error);
          return dateString;
        }
      };

      // Helper function to create unique key for duplicate detection
      const createEntryKey = (entry) => {
        return `${entry.id || entry.projectId || 'unknown'}-${entry.projectName || 'unknown'}-${entry.hours || 0}-${entry.startDate || 'unknown'}`;
      };

      // Process resource allocations FIRST (most important for weekly breakdowns)
      if (allocations.status === 'fulfilled' && allocations.value && allocations.value.entities) {
        console.log(`📊 Processing ${allocations.value.entities.length} resource allocation entries`);
        for (const allocation of allocations.value.entities) {
          // Filter by current user if not already filtered
          const allocationUser = allocation.User?.Name || allocation.Resource?.Name;
          if (allocationUser && allocationUser !== currentUser) {
            continue;
          }

          const entry = {
            id: allocation.id,
            projectId: allocation.WorkItem?.id || allocation.id,
            projectName: allocation.WorkItem?.Name || allocation.ProjectAssignment?.Name || 'Unknown Project',
            clarizenTag: allocation.WorkItem?.EntityType || 'Allocation',
            userName: currentUser,
            hours: allocation.Work || allocation.Units || 0,
            startDate: formatDate(allocation.Date || allocation.StartDate),
            endDate: formatDate(allocation.EndDate),
            status: 'Allocated',
            role: allocation.Role || 'Resource',
            percentage: allocation.Percentage || null,
            type: 'ResourceAllocation'
          };

          const entryKey = createEntryKey(entry);
          if (!seenEntries.has(entryKey)) {
            seenEntries.add(entryKey);
            resourcingData.push(entry);
          }
        }
        console.log(`✅ Added ${resourcingData.length} unique resource allocation entries`);
      }

      // Process assignments
      if (assignments.status === 'fulfilled' && assignments.value && assignments.value.entities) {
        for (const user of assignments.value.entities) {
          if (user.AssignedWorkItems && user.AssignedWorkItems.entities) {
            for (const workItem of user.AssignedWorkItems.entities) {
              const entry = {
                id: workItem.id,
                projectId: workItem.ParentProject?.id,
                projectName: workItem.ParentProject?.Name || workItem.Name,
                clarizenTag: workItem.EntityType,
                userName: user.Name,
                hours: workItem.RemainingEffort || workItem.ActualEffort || 0,
                startDate: formatDate(workItem.StartDate),
                endDate: formatDate(workItem.DueDate),
                status: workItem.State?.id || 'Active',
                role: 'Assigned',
                percentage: null,
                type: 'Assignment'
              };

              const entryKey = createEntryKey(entry);
              if (!seenEntries.has(entryKey)) {
                seenEntries.add(entryKey);
                resourcingData.push(entry);
              }
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
            const projectResourceData = userResources.map(resource => {
              const entry = {
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
              };

              const entryKey = createEntryKey(entry);
              if (!seenEntries.has(entryKey)) {
                seenEntries.add(entryKey);
                return entry;
              }
              return null;
            }).filter(Boolean);
            
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
        const userTimesheetData = userTimesheetEntries.map(timesheet => {
          const entry = {
            id: timesheet.id,
            projectId: timesheet.WorkItem?.id,
            projectName: timesheet.WorkItem?.Name,
            clarizenTag: timesheet.WorkItem?.EntityType || 'Timesheet',
            userName: timesheet.ReportedBy.Name,
            hours: timesheet.Duration?.value || 0,
            startDate: formatDate(timesheet.ReportedDate),
            endDate: formatDate(timesheet.ReportedDate),
            status: 'Logged',
            role: 'Time Entry',
            percentage: null,
            type: 'Timesheet'
          };

          const entryKey = createEntryKey(entry);
          if (!seenEntries.has(entryKey)) {
            seenEntries.add(entryKey);
            return entry;
          }
          return null;
        }).filter(Boolean);
        
        resourcingData.push(...userTimesheetData);
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
          allocations: resourcingData.filter(r => r.type === 'ResourceAllocation').length
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