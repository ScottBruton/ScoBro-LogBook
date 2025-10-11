// Refactored ClarizenService.js based on your working Postman workflow
// This version mirrors the behavior of your successful Postman setup
// It authenticates, retrieves parent work items, child work items, and combines them into structured output

const axios = require('axios');

class ClarizenService {
  constructor() {
    this.apiBaseUrl = 'https://api2.clarizen.com/v2.0/services';
    this.username = process.env.CLARIZEN_USERNAME;
    this.password = process.env.CLARIZEN_PASSWORD;
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
    // Try different approaches to match your working Postman collection
      const queries = [
      // Try with user ID as string
      `SELECT WorkItem.Id, WorkItem.Name, WorkItem.EntityType, WorkItem.StartDate, WorkItem.DueDate, Work, ActualRegularEffort, RemainingEffort, Units FROM RegularResourceLink WHERE Resource = '${userId}'`,
      // Try with user ID as entity reference
      `SELECT WorkItem.Id, WorkItem.Name, WorkItem.EntityType, WorkItem.StartDate, WorkItem.DueDate, Work, ActualRegularEffort, RemainingEffort, Units FROM RegularResourceLink WHERE Resource.Id = '${userId}'`,
      // Try without WHERE clause to see all data
      `SELECT WorkItem.Id, WorkItem.Name, WorkItem.EntityType, WorkItem.StartDate, WorkItem.DueDate, Work, ActualRegularEffort, RemainingEffort, Units FROM RegularResourceLink`
    ];
    
      for (let i = 0; i < queries.length; i++) {
        try {
        console.log(`🔍 Trying query ${i + 1}:`, queries[i]);
        const data = await this.query(queries[i]);
        
        if (data.entities && data.entities.length > 0) {
          console.log(`✅ Query ${i + 1} successful, got ${data.entities.length} entities`);
          return this.processAssignedWorkItems(data);
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
  processAssignedWorkItems(data) {
    const entities = data.entities ?? [];
    const nonZero = entities
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
      // Check if the CSV is too long (URL length limit)
      const query = `SELECT Name, StartDate, DueDate, Work, Parent, Parent.Name FROM WorkItem WHERE Parent IN (${parentIdsCsv})`;
      
      if (query.length > 2000) {
        console.log('⚠️ Query too long, splitting into chunks...');
        return await this.getChildWorkItemsInChunks(parentIdsCsv);
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
    const parentIds = parentIdsCsv.split(',').map(id => id.trim().replace(/'/g, ''));
    const chunkSize = 20; // Process 20 parent IDs at a time
    const chunks = [];
    
    for (let i = 0; i < parentIds.length; i += chunkSize) {
      chunks.push(parentIds.slice(i, i + chunkSize));
    }
    
    console.log(`📦 Processing ${parentIds.length} parent IDs in ${chunks.length} chunks`);
    
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

    return {
      timestamp: new Date().toISOString(),
      parentCount: parents.length,
      childCount: children.length,
      hierarchy
    };
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