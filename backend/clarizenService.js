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
   * Step 1 — Get assigned parent work items
   */
  async getAssignedWorkItems(userId) {
    // Match your exact Postman workflow - use the full entity reference format
    const userEntityRef = `/User/${userId}`;
    
      const queries = [
      // Exact match to your working Postman query
      `SELECT WorkItem.Id, WorkItem.Name, WorkItem.EntityType, WorkItem.StartDate, WorkItem.DueDate, Work, ActualRegularEffort, RemainingEffort, Units FROM RegularResourceLink WHERE Resource = '${userEntityRef}'`,
      // Fallback with Resource field included for debugging
      `SELECT WorkItem.Id, WorkItem.Name, WorkItem.EntityType, WorkItem.StartDate, WorkItem.DueDate, Work, ActualRegularEffort, RemainingEffort, Units, Resource FROM RegularResourceLink WHERE Resource = '${userEntityRef}'`,
      // Last resort - get all and filter
      `SELECT WorkItem.Id, WorkItem.Name, WorkItem.EntityType, WorkItem.StartDate, WorkItem.DueDate, Work, ActualRegularEffort, RemainingEffort, Units, Resource FROM RegularResourceLink`
    ];
    
      for (let i = 0; i < queries.length; i++) {
        try {
        console.log(`🔍 Trying query ${i + 1}:`, queries[i]);
        const data = await this.query(queries[i]);
        
        if (data.entities && data.entities.length > 0) {
          console.log(`✅ Query ${i + 1} successful, got ${data.entities.length} entities`);
          return this.processAssignedWorkItems(data, userId);
          } else {
            console.log(`⚠️ Query ${i + 1} returned no results`);
          }
        } catch (error) {
        console.log(`❌ Query ${i + 1} failed:`, error.response?.data?.message || error.message);
      }
    }
    
    throw new Error('All query attempts failed');
  }

  /**
   * Process the assigned work items data
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
   * Step 4 — Complete workflow
   */
  async fetchWorkItemData(userId) {
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