// Refactored ClarizenService.js based on your working Postman workflow
// This version mirrors the behavior of your successful Postman setup
// It authenticates, retrieves parent work items, child work items, and combines them into structured output

const axios = require('axios');
const fs = require('fs');
const path = require('path');

class ClarizenService {
  constructor() {
    this.apiBaseUrl = 'https://api2.clarizen.com/v2.0/services';
    this.username = process.env.CLARIZEN_USERNAME;
    this.password = process.env.CLARIZEN_PASSWORD;
    this.responsesFile = path.join(__dirname, 'clarizen_responses.txt');
  }

  /**
   * Log response data to clarizen_responses.txt
   */
  logResponse(endpoint, data) {
    try {
      const timestamp = new Date().toISOString();
      const logEntry = `\n========================================\n${timestamp} - ${endpoint}\n========================================\n${JSON.stringify(data, null, 2)}\n`;
      fs.appendFileSync(this.responsesFile, logEntry);
      console.log(`📝 Response logged to ${this.responsesFile}`);
    } catch (error) {
      console.error('❌ Failed to log response:', error.message);
    }
  }

  /**
   * Authenticate with Clarizen and get sessionId
   */
  async authenticate() {
    try {
      console.log('🔐 Authenticating with Clarizen...');
      const response = await axios.post(`${this.apiBaseUrl}/authentication/login`, {
        userName: this.username,  // Use userName to match your working Postman
        password: this.password
      });

      if (!response.data?.sessionId) throw new Error('No session ID received');
      this.sessionId = response.data.sessionId;
      console.log('✅ Authentication successful');
      
      // Log the authentication response
      this.logResponse('authentication/login', response.data);
      
      return this.sessionId;
    } catch (err) {
      console.error('❌ Authentication failed:', err.message);
      throw err;
    }
  }

  /**
   * Generic GET request
   */
  async get(url) {
      const headers = {
      'Authorization': `Session ${this.sessionId}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      };
    const fullUrl = `${this.apiBaseUrl}${url}`;
    const response = await axios.get(fullUrl, { headers });
    
    // Log the response
    this.logResponse(`GET ${url}`, response.data);
    
      return response.data;
  }

  /**
   * Run a Clarizen CZQL query
   */
  async query(q) {
    const headers = {
      'Authorization': `Session ${this.sessionId}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
    const response = await axios.get(`${this.apiBaseUrl}/data/query?q=${encodeURIComponent(q)}`, { headers });
    
    // Log the response
    this.logResponse(`QUERY: ${q}`, response.data);
    
    return response.data;
  }

  /**
   * Get user information from Clarizen
   */
  async getUserInfo() {
    try {
      console.log('👤 Getting user info...');
      const response = await this.get('/authentication/GetSessionInfo');

      const userInfo = {
        username: response.userName || response.username,
        fullName: response.fullName || response.displayName || response.name,
        email: response.email,
        sessionId: response.sessionId,
        userId: response.userId
      };
      
      console.log('👤 User info:', userInfo);
      return userInfo;
    } catch (error) {
      console.error('❌ Failed to get user info:', error);
      throw new Error(`Failed to get user info: ${error.message}`);
    }
  }

  /**
   * Step 1 — Get resource planning data for the current user
   * This gets weekly hours assignments for 3 weeks prior, current week, and 3 weeks future
   */
  async getResourcePlanningData(userId) {
    const userEntityRef = `/User/${userId}`;
    
    // Calculate date range: 3 weeks prior to 3 weeks future
    const now = new Date();
    const threeWeeksAgo = new Date(now.getTime() - (3 * 7 * 24 * 60 * 60 * 1000));
    const threeWeeksFuture = new Date(now.getTime() + (3 * 7 * 24 * 60 * 60 * 1000));
    
    const startDate = threeWeeksAgo.toISOString().split('T')[0];
    const endDate = threeWeeksFuture.toISOString().split('T')[0];
    
    console.log(`📅 Getting resource planning data from ${startDate} to ${endDate}`);
    
      const queries = [
      // Query 1: Try to get all available entity types to find resource planning tables
      `SELECT EntityType FROM EntityType WHERE EntityType LIKE '%Resource%' OR EntityType LIKE '%Planning%' OR EntityType LIKE '%Allocation%' OR EntityType LIKE '%Schedule%' OR EntityType LIKE '%Time%' OR EntityType LIKE '%Work%' OR EntityType LIKE '%Effort%' OR EntityType LIKE '%Capacity%' OR EntityType LIKE '%Assignment%' OR EntityType LIKE '%Plan%' OR EntityType LIKE '%Weekly%' OR EntityType LIKE '%Breakdown%' OR EntityType LIKE '%Distribution%' OR EntityType LIKE '%Forecast%' OR EntityType LIKE '%Budget%' OR EntityType LIKE '%Estimate%' OR EntityType LIKE '%Commitment%' OR EntityType LIKE '%Booking%' OR EntityType LIKE '%RLTime%' OR EntityType LIKE '%ProjectAssignment%' OR EntityType LIKE '%Weekly%' OR EntityType LIKE '%Daily%' OR EntityType LIKE '%Schedule%' OR EntityType LIKE '%Load%' OR EntityType LIKE '%View%' OR EntityType LIKE '%Report%'`,
      
      // Query 2: Try ResourceAssignment with different field names
      `SELECT WorkItem.Id, WorkItem.Name, WorkItem.EntityType, Work, StartDate, EndDate, Resource, User FROM ResourceAssignment WHERE User = '${userEntityRef}' AND StartDate >= '${startDate}' AND EndDate <= '${endDate}'`,
      
      // Query 3: Try ProjectAssignment table
      `SELECT WorkItem.Id, WorkItem.Name, WorkItem.EntityType, Work, StartDate, EndDate, Resource, User FROM ProjectAssignment WHERE User = '${userEntityRef}' AND StartDate >= '${startDate}' AND EndDate <= '${endDate}'`,
      
      // Query 4: Try ResourceSchedule table
      `SELECT WorkItem.Id, WorkItem.Name, WorkItem.EntityType, Work, StartDate, EndDate, Resource, User FROM ResourceSchedule WHERE User = '${userEntityRef}' AND StartDate >= '${startDate}' AND EndDate <= '${endDate}'`,
      
      // Query 5: Try WeeklySchedule table
      `SELECT WorkItem.Id, WorkItem.Name, WorkItem.EntityType, Work, StartDate, EndDate, Resource, User FROM WeeklySchedule WHERE User = '${userEntityRef}' AND StartDate >= '${startDate}' AND EndDate <= '${endDate}'`,
      
      // Query 6: Try ResourcePlan table
      `SELECT WorkItem.Id, WorkItem.Name, WorkItem.EntityType, Work, StartDate, EndDate, Resource, User FROM ResourcePlan WHERE User = '${userEntityRef}' AND StartDate >= '${startDate}' AND EndDate <= '${endDate}'`,
      
      // Query 7: Try ResourceCapacity table
      `SELECT WorkItem.Id, WorkItem.Name, WorkItem.EntityType, Work, StartDate, EndDate, Resource, User FROM ResourceCapacity WHERE User = '${userEntityRef}' AND StartDate >= '${startDate}' AND EndDate <= '${endDate}'`,
      
      // Query 8: Try ResourceAllocation table
      `SELECT WorkItem.Id, WorkItem.Name, WorkItem.EntityType, Work, StartDate, EndDate, Resource, User FROM ResourceAllocation WHERE User = '${userEntityRef}' AND StartDate >= '${startDate}' AND EndDate <= '${endDate}'`,
      
      // Query 9: Try ResourcePlanning table
      `SELECT WorkItem.Id, WorkItem.Name, WorkItem.EntityType, Work, StartDate, EndDate, Resource, User FROM ResourcePlanning WHERE User = '${userEntityRef}' AND StartDate >= '${startDate}' AND EndDate <= '${endDate}'`,
      
      // Query 10: Try ResourceWork table
      `SELECT WorkItem.Id, WorkItem.Name, WorkItem.EntityType, Work, StartDate, EndDate, Resource, User FROM ResourceWork WHERE User = '${userEntityRef}' AND StartDate >= '${startDate}' AND EndDate <= '${endDate}'`,
      
      // Query 11: Try ResourceEffort table
      `SELECT WorkItem.Id, WorkItem.Name, WorkItem.EntityType, Work, StartDate, EndDate, Resource, User FROM ResourceEffort WHERE User = '${userEntityRef}' AND StartDate >= '${startDate}' AND EndDate <= '${endDate}'`,
      
      // Query 12: Try ResourceTime table
      `SELECT WorkItem.Id, WorkItem.Name, WorkItem.EntityType, Work, StartDate, EndDate, Resource, User FROM ResourceTime WHERE User = '${userEntityRef}' AND StartDate >= '${startDate}' AND EndDate <= '${endDate}'`,
      
      // Query 13: Try Timesheet data for actual hours worked (fixed field names)
      `SELECT WorkItem.Name, WorkItem.EntityType, Duration, ReportedDate, ReportedBy FROM Timesheet WHERE ReportedBy = '${userEntityRef}' AND ReportedDate >= '${startDate}' AND ReportedDate <= '${endDate}'`,
      
      // Query 14: Try Timesheet with different field names
      `SELECT WorkItem.Name, WorkItem.EntityType, Hours, Date, User FROM Timesheet WHERE User = '${userEntityRef}' AND Date >= '${startDate}' AND Date <= '${endDate}'`,
      
      // Query 15: Try Timesheet with minimal fields
      `SELECT Duration, ReportedDate FROM Timesheet WHERE ReportedBy = '${userEntityRef}' AND ReportedDate >= '${startDate}' AND ReportedDate <= '${endDate}'`,
      
      // Query 16: Try to get planned hours from RegularResourceLink and distribute them
      `SELECT WorkItem.Id, WorkItem.Name, WorkItem.EntityType, Work, ActualRegularEffort, RemainingEffort, Units, Resource, WorkItem.StartDate, WorkItem.DueDate FROM RegularResourceLink WHERE Resource = '${userEntityRef}' AND Work > 0`
    ];
    
      // Collect data from multiple successful queries
      const allData = { entities: [] };
      let foundData = false;
    
      for (let i = 0; i < queries.length; i++) {
        try {
        console.log(`🔍 Trying resource planning query ${i + 1}:`, queries[i]);
        const data = await this.query(queries[i]);
        
        if (data.entities && data.entities.length > 0) {
          console.log(`✅ Resource planning query ${i + 1} successful, got ${data.entities.length} entities`);
          
          // Check if this is entity type discovery
          if (i === 0) { // Query 1 is entity type discovery
            console.log(`🔍 Entity type discovery successful! Found ${data.entities.length} entity types:`);
            data.entities.forEach(entity => {
              console.log(`  - ${entity.EntityType}`);
            });
            // Continue to next query instead of processing this as resource data
            continue;
          }
          
          // Add entities to our collected data
          allData.entities = allData.entities.concat(data.entities);
          foundData = true;
          
          // If this is timesheet data (query 13), we have actual hours - continue to get planned hours too
          if (i === 12) { // Query 13 is timesheet
            console.log(`📊 Found timesheet data (actual hours), continuing to look for planned hours...`);
            continue;
          }
          
          } else {
          console.log(`⚠️ Resource planning query ${i + 1} returned no results`);
          }
        } catch (error) {
        console.log(`❌ Resource planning query ${i + 1} failed:`, error.response?.data?.message || error.message);
      }
    }
    
    // Process all collected data together
    if (foundData) {
      console.log(`📊 Processing combined data: ${allData.entities.length} total entities`);
      return this.processResourcePlanningData(allData, userId, startDate, endDate);
    }
    
    // If all queries failed, try to discover available tables
    console.log('🔍 All resource planning queries failed. Attempting to discover available tables...');
    try {
      await this.discoverResourcePlanningTables(userEntityRef);
    } catch (discoverError) {
      console.log('❌ Table discovery also failed:', discoverError.message);
    }
    
    throw new Error('All resource planning query attempts failed. Check the console logs for table discovery results.');
  }

  /**
   * Process resource planning data into weekly breakdown
   */
  processResourcePlanningData(data, userId, startDate, endDate) {
    const entities = data.entities ?? [];
    
    console.log(`📊 Processing ${entities.length} resource planning entities`);
    
    // Group data by project/task
    const projectData = {};
    
    entities.forEach(entity => {
      const workItem = entity.WorkItem || entity;
      const projectName = workItem.Name || 'Unknown Project';
      const reportedDate = entity.ReportedDate;
      
            // Handle different data types based on what fields are available
            if (entity.WeekStartDate && entity.WeekEndDate && entity.WeeklyHours !== undefined) {
              // This is Resource Load data - actual weekly resource planning data from Clarizen
              const weeklyHours = Number(entity.WeeklyHours);
              const weekStartDate = entity.WeekStartDate;
              const weekEndDate = entity.WeekEndDate;
              
              if (weeklyHours > 0) {
                // Initialize project data if not exists
                if (!projectData[projectName]) {
                  projectData[projectName] = {
                    name: projectName,
                    entityType: workItem.EntityType || 'Unknown',
                    totalHours: 0,
                    weeklyHours: {}
                  };
                }
                
                // Add weekly hours directly from Clarizen Resource Load
                const weekKey = this.getWeekKey(new Date(weekStartDate));
                if (!projectData[projectName].weeklyHours[weekKey]) {
                  projectData[projectName].weeklyHours[weekKey] = 0;
                }
                projectData[projectName].weeklyHours[weekKey] += weeklyHours;
                projectData[projectName].totalHours += weeklyHours;
                
                console.log(`✅ Found Resource Load data: ${projectName} - ${weeklyHours}h for week ${weekStartDate} to ${weekEndDate} (week: ${weekKey})`);
              }
              
            } else if (entity.Date && entity.Work) {
              // Check if this is monthly data (end-of-month dates) - skip it
              const date = new Date(entity.Date);
              const dayOfMonth = date.getDate();
              const isEndOfMonth = dayOfMonth >= 28; // Likely monthly data if it's end of month
              
              if (isEndOfMonth) {
                console.log(`⚠️ Skipping monthly data: ${projectName} - ${entity.Work?.value || entity.Work || 0}h on ${date.toISOString().split('T')[0]} (appears to be monthly allocation, not weekly)`);
                return; // Skip this data
              }
              
              // This might be daily or weekly data - process it
              const workHours = Number(entity.Work?.value || entity.Work || 0);
              
              if (workHours > 0) {
                // Initialize project data if not exists
                if (!projectData[projectName]) {
                  projectData[projectName] = {
                    name: projectName,
                    entityType: workItem.EntityType || 'Unknown',
                    totalHours: 0,
                    weeklyHours: {}
                  };
                }
                
                // Add hours to the correct week
                const weekKey = this.getWeekKey(date);
                if (!projectData[projectName].weeklyHours[weekKey]) {
                  projectData[projectName].weeklyHours[weekKey] = 0;
                }
                projectData[projectName].weeklyHours[weekKey] += workHours;
                projectData[projectName].totalHours += workHours;
                
                console.log(`✅ Found time-phased data: ${projectName} - ${workHours}h on ${date.toISOString().split('T')[0]} (week: ${weekKey})`);
              }
        
      } else if (entity.WeeklyHours !== undefined && entity.WeekStartDate && entity.WeekEndDate) {
        // This is actual weekly resource planning data from Clarizen
        const weeklyHours = Number(entity.WeeklyHours);
        const weekStartDate = entity.WeekStartDate;
        const weekEndDate = entity.WeekEndDate;
        
        if (weeklyHours > 0) {
          // Initialize project data if not exists
          if (!projectData[projectName]) {
            projectData[projectName] = {
              name: projectName,
              entityType: workItem.EntityType || 'Unknown',
              totalHours: 0,
              weeklyHours: {}
            };
          }
          
          // Add weekly hours directly from Clarizen
          const weekKey = this.getWeekKey(new Date(weekStartDate));
          if (!projectData[projectName].weeklyHours[weekKey]) {
            projectData[projectName].weeklyHours[weekKey] = 0;
          }
          projectData[projectName].weeklyHours[weekKey] += weeklyHours;
          projectData[projectName].totalHours += weeklyHours;
        }
        
            } else if (reportedDate) {
              // For timesheet data, use reported date - this is ACTUAL hours worked
              const totalWorkHours = Number(entity.Duration?.value || 0);
              if (totalWorkHours > 0 && projectName !== 'Unknown Project') {
                // Skip "Unknown Project" entries - these are duplicates
                // Initialize project data if not exists
                if (!projectData[projectName]) {
                  projectData[projectName] = {
                    name: projectName,
                    entityType: workItem.EntityType || 'Unknown',
                    totalHours: 0,
                    weeklyHours: {},
                    plannedHours: {}, // New field for planned hours
                    actualHours: {}   // New field for actual hours
                  };
                }
                
                const date = new Date(reportedDate);
                const weekKey = this.getWeekKey(date);
                
                // Store actual hours worked
                if (!projectData[projectName].actualHours[weekKey]) {
                  projectData[projectName].actualHours[weekKey] = 0;
                }
                projectData[projectName].actualHours[weekKey] += totalWorkHours;
                
                // Also store in weeklyHours for backward compatibility
                if (!projectData[projectName].weeklyHours[weekKey]) {
                  projectData[projectName].weeklyHours[weekKey] = 0;
                }
                projectData[projectName].weeklyHours[weekKey] += totalWorkHours;
                projectData[projectName].totalHours += totalWorkHours;
                
                console.log(`✅ Found actual hours: ${projectName} - ${totalWorkHours}h on ${date.toISOString().split('T')[0]} (week: ${weekKey})`);
              } else if (projectName === 'Unknown Project') {
                console.log(`⚠️ Skipping "Unknown Project" entry - this is likely a duplicate timesheet entry`);
              }
        
            } else if (entity.EntityType) {
              // This is entity type discovery data
              console.log(`🔍 Found entity type: ${entity.EntityType}`);
              return;
            } else {
              // This is RegularResourceLink data - contains total project hours
              // Just store the raw data, no calculations
              const totalWorkHours = Number(entity.Work?.value || entity.Work || 0);
              
              if (totalWorkHours > 0) {
                // Initialize project data if not exists
                if (!projectData[projectName]) {
                  projectData[projectName] = {
                    name: projectName,
                    entityType: workItem.EntityType || 'Unknown',
                    totalHours: 0,
                    weeklyHours: {},
                    plannedHours: {}, // New field for planned hours
                    actualHours: {},   // New field for actual hours
                    totalPlannedHours: 0  // Store total planned hours separately
                  };
                }
                
                // Store the raw planned hours - no distribution, no calculations
                console.log(`📊 Found planned hours: ${projectName} - ${totalWorkHours}h (total project hours)`);
                
                // Store planned hours separately from actual hours
                projectData[projectName].totalPlannedHours += totalWorkHours;
                
                // For now, let's add a simple note that planned hours are total project hours
                // We'll display them in the total column, not distributed across weeks
                // since we don't have weekly breakdown data from RegularResourceLink
                
                // Don't add to totalHours - that's for actual hours only
              }
            }
    });
    
    // Generate week headers (3 weeks prior to 3 weeks future)
    const weekHeaders = this.generateWeekHeaders();
    
    // Create the final data structure
    const result = {
      timestamp: new Date().toISOString(),
      dateRange: { startDate, endDate },
      weekHeaders,
      projects: Object.values(projectData).filter(p => p.totalHours > 0),
      totalProjects: Object.keys(projectData).length,
      totalHours: Object.values(projectData).reduce((sum, p) => sum + p.totalHours, 0)
    };
    
    console.log(`✅ Processed resource planning data: ${result.projects.length} projects, ${result.totalHours} total hours`);
    this.logResponse('RESOURCE_PLANNING_DATA', result);
    
    return result;
  }
  
  /**
   * Discover available resource planning tables in Clarizen
   */
  async discoverResourcePlanningTables(userEntityRef) {
    console.log('🔍 Discovering available resource planning tables...');
    
    // Try to get metadata about available tables
    const possibleTables = [
      'ResourcePlanning', 'ResourceAllocation', 'ResourceAssignment', 'ResourceCapacity',
      'ResourcePlan', 'ResourceSchedule', 'ResourceTime', 'ResourceWork', 'ResourceEffort',
      'WeeklyResource', 'ResourceBreakdown', 'ResourceDistribution', 'ResourceForecast',
      'ResourceBudget', 'ResourceEstimate', 'ResourceCommitment', 'ResourceBooking',
      'ResourcePlanning', 'ResourceAllocation', 'ResourceAssignment', 'ResourceCapacity',
      'ResourcePlan', 'ResourceSchedule', 'ResourceTime', 'ResourceWork', 'ResourceEffort',
      'WeeklyResource', 'ResourceBreakdown', 'ResourceDistribution', 'ResourceForecast',
      'ResourceBudget', 'ResourceEstimate', 'ResourceCommitment', 'ResourceBooking',
      // Try more specific Clarizen table names
      'ResourcePlanning', 'ResourceAllocation', 'ResourceAssignment', 'ResourceCapacity',
      'ResourcePlan', 'ResourceSchedule', 'ResourceTime', 'ResourceWork', 'ResourceEffort',
      'WeeklyResource', 'ResourceBreakdown', 'ResourceDistribution', 'ResourceForecast',
      'ResourceBudget', 'ResourceEstimate', 'ResourceCommitment', 'ResourceBooking',
      // Try different naming conventions
      'ResourcePlanning', 'ResourceAllocation', 'ResourceAssignment', 'ResourceCapacity',
      'ResourcePlan', 'ResourceSchedule', 'ResourceTime', 'ResourceWork', 'ResourceEffort',
      'WeeklyResource', 'ResourceBreakdown', 'ResourceDistribution', 'ResourceForecast',
      'ResourceBudget', 'ResourceEstimate', 'ResourceCommitment', 'ResourceBooking'
    ];
    
    const workingTables = [];
    
    for (const tableName of possibleTables) {
      try {
        // Try a simple query to see if the table exists
        const testQuery = `SELECT Id FROM ${tableName} LIMIT 1`;
        console.log(`🔍 Testing table: ${tableName}`);
        const result = await this.query(testQuery);
        
        if (result && result.entities) {
          workingTables.push(tableName);
          console.log(`✅ Table ${tableName} exists and is accessible`);
        }
      } catch (error) {
        console.log(`❌ Table ${tableName} not found or not accessible`);
      }
    }
    
    console.log(`📊 Found ${workingTables.length} accessible tables:`, workingTables);
    
    // Now try to find tables that might contain resource data for this user
    for (const tableName of workingTables) {
      try {
        const resourceQuery = `SELECT Id, WorkItem.Id, WorkItem.Name, Resource FROM ${tableName} WHERE Resource = '${userEntityRef}' LIMIT 5`;
        console.log(`🔍 Checking ${tableName} for user resource data...`);
        const result = await this.query(resourceQuery);
        
        if (result && result.entities && result.entities.length > 0) {
          console.log(`🎯 Table ${tableName} contains resource data for this user! Found ${result.entities.length} records`);
          console.log(`📋 Sample data:`, JSON.stringify(result.entities[0], null, 2));
        }
      } catch (error) {
        console.log(`❌ Error querying ${tableName} for user data:`, error.message);
      }
    }
    
    // Also try to get all available entity types
    try {
      console.log('🔍 Trying to get all available entity types...');
      const entityTypesQuery = `SELECT EntityType FROM EntityType LIMIT 50`;
      const entityTypesResult = await this.query(entityTypesQuery);
      
      if (entityTypesResult && entityTypesResult.entities) {
        console.log(`📋 Found ${entityTypesResult.entities.length} entity types:`, entityTypesResult.entities.map(e => e.EntityType));
      }
    } catch (error) {
      console.log(`❌ Could not get entity types:`, error.message);
    }
    
    return workingTables;
  }

  /**
   * NOTE: Removed calculation methods - we now only use actual data from Clarizen
   * No more artificial distribution or calculation of weekly hours.
   * All data must come directly from Clarizen's resource planning tables.
   */
  
  /**
   * Get week key for a given date (Monday of that week)
   */
  getWeekKey(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
    const monday = new Date(d.setDate(diff));
    return monday.toISOString().split('T')[0];
  }
  
  /**
   * Generate week headers for the 7-week period
   */
  generateWeekHeaders() {
    const headers = [];
    const now = new Date();
    
    // Start from 3 weeks ago
    const startDate = new Date(now.getTime() - (3 * 7 * 24 * 60 * 60 * 1000));
    
    for (let i = 0; i < 7; i++) {
      const weekStart = new Date(startDate.getTime() + (i * 7 * 24 * 60 * 60 * 1000));
      const weekEnd = new Date(weekStart.getTime() + (6 * 24 * 60 * 60 * 1000));
      
      headers.push({
        weekNumber: i + 1,
        startDate: weekStart.toISOString().split('T')[0],
        endDate: weekEnd.toISOString().split('T')[0],
        label: `${this.formatDate(weekStart)} - ${this.formatDate(weekEnd)}`,
        isCurrentWeek: this.isCurrentWeek(weekStart)
      });
    }
    
    return headers;
  }
  
  /**
   * Format date for display
   */
  formatDate(date) {
    return date.toLocaleDateString('en-GB', { 
      day: '2-digit', 
      month: '2-digit', 
      year: '2-digit' 
    });
  }
  
  /**
   * Check if a week contains the current date
   */
  isCurrentWeek(weekStart) {
    const now = new Date();
    const weekEnd = new Date(weekStart.getTime() + (6 * 24 * 60 * 60 * 1000));
    return now >= weekStart && now <= weekEnd;
  }

  /**
   * Process the assigned work items data (legacy method)
   */
  processAssignedWorkItems(data, userId = null) {
    const entities = data.entities ?? [];
    
    // Filter by user if we have all data (no WHERE clause was used)
    let filteredEntities = entities;
    if (userId && entities.length > 0 && entities[0].Resource) {
      const userEntityRef = `/User/${userId}`;
      console.log(`🔍 Filtering ${entities.length} entities by user entity reference: ${userEntityRef}`);
      filteredEntities = entities.filter(e => {
        const resourceId = e?.Resource?.id || e?.Resource;
        const matches = resourceId === userEntityRef;
        if (!matches) {
          console.log(`❌ Resource ID ${resourceId} does not match user entity reference ${userEntityRef}`);
        }
        return matches;
      });
      console.log(`✅ Filtered to ${filteredEntities.length} entities for user ${userEntityRef}`);
    }
    
    const nonZero = filteredEntities
      .map(e => ({
        id: e?.WorkItem?.id,
        name: e?.WorkItem?.Name,
        startDate: e?.WorkItem?.StartDate,
        endDate: e?.WorkItem?.DueDate,
        workHours: Number(e?.Work?.value ?? 0)
      }))
      .filter(x => x.workHours > 0);

    const parentMap = Object.fromEntries(nonZero.map(p => [p.id, p.name]));
    const parentIdsCsv = nonZero.map(p => `'${p.id}'`).join(',');

    return { parentMap, parentIdsCsv, parents: nonZero };
  }

  /**
   * Step 2 — Get child work items for all parents
   */
  async getChildWorkItems(parentIdsCsv) {
    try {
      // Clean parent IDs like in your Postman pre-script
      const parentIds = parentIdsCsv.split(',').map(id => id.trim().replace(/'/g, ''));
      const cleanIds = parentIds.map(id => id.replace(/^\/[A-Za-z]+\/(.+)$/, "$1"));
      const cleanParentIdsCsv = cleanIds.map(id => `'${id}'`).join(",");
      
      console.log(`🔍 Original parent IDs: ${parentIdsCsv}`);
      console.log(`🔍 Cleaned parent IDs: ${cleanParentIdsCsv}`);
      
      // Check if the CSV is too long (URL length limit)
      const query = `SELECT Name, StartDate, DueDate, Work, Parent, Parent.Name FROM WorkItem WHERE Parent IN (${cleanParentIdsCsv})`;
      
      if (query.length > 2000) {
        console.log('⚠️ Query too long, splitting into chunks...');
        return await this.getChildWorkItemsInChunks(cleanParentIdsCsv);
      }
      
      const data = await this.query(query);
      return this.processChildWorkItems(data);
    } catch (error) {
      console.log('❌ Single query failed, trying chunks:', error.response?.data?.message || error.message);
      return await this.getChildWorkItemsInChunks(parentIdsCsv);
    }
  }

  /**
   * Process child work items data
   */
  processChildWorkItems(data) {
    const entities = data.entities ?? [];
    const children = entities
      .map(e => ({
        id: e.id,
        name: e.Name,
        parentId: e.Parent?.id,
        parentName: e.Parent?.Name || '(No Parent Name)',
        startDate: e.StartDate,
        endDate: e.DueDate,
        workHours: Number(e.Work?.value ?? 0)
      }))
      .filter(x => x.workHours > 0);

    return children;
  }

  /**
   * Get child work items in chunks to avoid URL length limits
   */
  async getChildWorkItemsInChunks(parentIdsCsv) {
    // Clean parent IDs like in your Postman pre-script
    const parentIds = parentIdsCsv.split(',').map(id => id.trim().replace(/'/g, ''));
    const cleanIds = parentIds.map(id => id.replace(/^\/[A-Za-z]+\/(.+)$/, "$1"));
    
    const chunkSize = 20; // Process 20 parent IDs at a time
    const chunks = [];
    
    for (let i = 0; i < cleanIds.length; i += chunkSize) {
      chunks.push(cleanIds.slice(i, i + chunkSize));
    }
    
    console.log(`📦 Processing ${cleanIds.length} cleaned parent IDs in ${chunks.length} chunks`);
    
    let allChildren = [];
    
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const chunkCsv = chunk.map(id => `'${id}'`).join(',');
      const query = `SELECT Name, StartDate, DueDate, Work, Parent, Parent.Name FROM WorkItem WHERE Parent IN (${chunkCsv})`;
      
      try {
        console.log(`🔍 Processing chunk ${i + 1}/${chunks.length} (${chunk.length} parents)`);
        const data = await this.query(query);
        const children = this.processChildWorkItems(data);
        allChildren = allChildren.concat(children);
        console.log(`✅ Chunk ${i + 1} returned ${children.length} children`);
        } catch (error) {
        console.log(`❌ Chunk ${i + 1} failed:`, error.response?.data?.message || error.message);
      }
    }
    
    console.log(`✅ Total children found: ${allChildren.length}`);
    return allChildren;
  }

  /**
   * Step 3 — Combine parent and child data into hierarchical structure
   */
  buildWorkItemHierarchy(parents, children) {
    const hierarchy = parents.map(parent => {
      const relatedChildren = children.filter(c => c.parentId === parent.id);
      return {
        parentId: parent.id,
        parentName: parent.name,
        startDate: parent.startDate,
        endDate: parent.endDate,
        workHours: parent.workHours,
        children: relatedChildren
      };
    });

    const result = {
      timestamp: new Date().toISOString(),
      parentCount: parents.length,
      childCount: children.length,
      hierarchy
    };

    // Log the final hierarchy result
    this.logResponse('FINAL_HIERARCHY_RESULT', result);

    return result;
  }

  /**
   * Step 4 — Complete workflow for resource planning data
   */
  async fetchWorkItemData(userId) {
    await this.authenticate();

    // Use the new resource planning approach
    const resourceData = await this.getResourcePlanningData(userId);
    console.log(`✅ Found resource planning data: ${resourceData.projects.length} projects, ${resourceData.totalHours} total hours`);

    return resourceData;
  }
  
  /**
   * Legacy workflow for work item hierarchy (kept for backward compatibility)
   */
  async fetchWorkItemHierarchy(userId) {
    await this.authenticate();

    const { parentMap, parentIdsCsv, parents } = await this.getAssignedWorkItems(userId);
    console.log(`✅ Found ${parents.length} parent work items`);

    const children = await this.getChildWorkItems(parentIdsCsv);
    console.log(`✅ Found ${children.length} child work items`);

    const hierarchy = this.buildWorkItemHierarchy(parents, children);

    console.log('✅ Hierarchical data built successfully');
    return hierarchy;
  }
}

module.exports = new ClarizenService();