const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { google } = require('googleapis');
const { ConfidentialClientApplication } = require('@azure/msal-node');
const jiraService = require('./jiraService');
const clarizenService = require('./clarizenService');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());

// Google OAuth Configuration
const googleOAuth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

// Microsoft OAuth Configuration
const msalConfig = {
  auth: {
    clientId: process.env.MICROSOFT_CLIENT_ID,
    clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
    authority: `https://login.microsoftonline.com/${process.env.MICROSOFT_TENANT_ID}`
  }
};

const msalInstance = new ConfidentialClientApplication(msalConfig);

// Store Jira config in memory after successful test
let jiraConfig = null;
// Store Clarizen config in memory after successful test
let clarizenConfig = null;

// Routes

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'ScoBro Logbook Backend Server is running' });
});

// Google OAuth token exchange
app.post('/api/oauth/google/token', async (req, res) => {
  try {
    const { code } = req.body;
    
    if (!code) {
      return res.status(400).json({ error: 'Authorization code is required' });
    }

    console.log('🔄 Google OAuth: Exchanging code for token...', code);
    console.log('🔍 Backend GOOGLE_CLIENT_ID:', process.env.GOOGLE_CLIENT_ID);
    console.log('🔍 Backend GOOGLE_CLIENT_SECRET:', process.env.GOOGLE_CLIENT_SECRET ? 'SET' : 'NOT SET');
    console.log('🔍 Backend redirect URI being used:', 'http://localhost:5173/google-callback.html');

    // Create a new OAuth2 client with the correct redirect URI
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      'http://localhost:5173/google-callback.html' // Use the same redirect URI as frontend
    );

    // Exchange authorization code for tokens
    const { tokens } = await oauth2Client.getToken(code);
    console.log('🔍 Tokens received:', {
      access_token: tokens.access_token ? 'SET' : 'NOT SET',
      refresh_token: tokens.refresh_token ? 'SET' : 'NOT SET',
      expiry_date: tokens.expiry_date
    });
    
    oauth2Client.setCredentials(tokens);

    console.log('✅ Google OAuth: Tokens received successfully');

    // For now, let's just return the tokens without user info
    // The calendar API will work with just the access token
    console.log('🔍 Returning tokens without user info for now...');
    
    res.json({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      email: 'scottpbruton@gmail.com', // Use your actual email for now
      name: 'Scott Bruton', // Use your actual name for now
      expires_in: tokens.expiry_date
    });

  } catch (error) {
    console.error('❌ Google OAuth token exchange failed:', error);
    res.status(500).json({ 
      error: 'Failed to exchange Google OAuth code for tokens',
      details: error.message 
    });
  }
});

// Microsoft OAuth token exchange
app.post('/api/oauth/microsoft/token', async (req, res) => {
  try {
    const { code } = req.body;
    
    if (!code) {
      return res.status(400).json({ error: 'Authorization code is required' });
    }

    console.log('🔄 Microsoft OAuth: Exchanging code for token...', code);
    console.log('🔍 Backend MICROSOFT_CLIENT_ID:', process.env.MICROSOFT_CLIENT_ID);
    console.log('🔍 Backend MICROSOFT_CLIENT_SECRET:', process.env.MICROSOFT_CLIENT_SECRET ? 'SET' : 'NOT SET');
    console.log('🔍 Backend MICROSOFT_TENANT_ID:', process.env.MICROSOFT_TENANT_ID);
    console.log('🔍 Backend redirect URI being used:', 'http://localhost:5173/microsoft-callback.html');

    // Exchange authorization code for tokens using direct HTTP request
    const tokenResponse = await axios.post(
      `https://login.microsoftonline.com/${process.env.MICROSOFT_TENANT_ID}/oauth2/v2.0/token`,
      new URLSearchParams({
        client_id: process.env.MICROSOFT_CLIENT_ID,
        scope: 'https://graph.microsoft.com/calendars.read',
        code: code,
        redirect_uri: 'http://localhost:5173/microsoft-callback.html',
        grant_type: 'authorization_code',
        client_secret: process.env.MICROSOFT_CLIENT_SECRET,
      }).toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    const { access_token, refresh_token } = tokenResponse.data;
    console.log('🔍 Microsoft tokens received:', {
      access_token: access_token ? 'SET' : 'NOT SET',
      refresh_token: refresh_token ? 'SET' : 'NOT SET'
    });
    
    console.log('✅ Microsoft OAuth: Tokens received successfully');

    // For now, let's just return the tokens without user info
    // We can get user info later when we actually use the calendar API
    console.log('🔍 Returning Microsoft tokens without user info for now...');
    
    res.json({
      access_token,
      refresh_token,
      email: 'scott@idegroup.com.au', // Use your Microsoft email
      name: 'Scott Bruton', // Use your actual name for now
      expires_in: Date.now() + (3600 * 1000) // 1 hour from now
    });

  } catch (error) {
    console.error('❌ Microsoft OAuth token exchange failed:', error);
    res.status(500).json({ 
      error: 'Failed to exchange Microsoft OAuth code for tokens',
      details: error.message 
    });
  }
});

// Google Calendar events
app.post('/api/calendar/google/events', async (req, res) => {
  try {
    const { access_token, start_date, end_date } = req.body;
    
    if (!access_token) {
      return res.status(400).json({ error: 'Access token is required' });
    }

    console.log('📅 Fetching Google Calendar events...');

    // Set up Google Calendar API client
    googleOAuth2Client.setCredentials({ access_token });
    const calendar = google.calendar({ version: 'v3', auth: googleOAuth2Client });

    // Fetch events
    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: start_date || new Date().toISOString(),
      timeMax: end_date || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      maxResults: 100,
      singleEvents: true,
      orderBy: 'startTime'
    });

    const events = response.data.items.map(event => ({
      id: event.id,
      title: event.summary || 'No Title',
      start: event.start.dateTime || event.start.date,
      end: event.end.dateTime || event.end.date,
      description: event.description || '',
      location: event.location || '',
      provider: 'google',
      calendarId: 'primary'
    }));

    console.log(`✅ Retrieved ${events.length} Google Calendar events`);
    res.json({ events });

  } catch (error) {
    console.error('❌ Failed to fetch Google Calendar events:', error);
    res.status(500).json({ 
      error: 'Failed to fetch Google Calendar events',
      details: error.message 
    });
  }
});

// Microsoft Calendar events
app.post('/api/calendar/microsoft/events', async (req, res) => {
  try {
    const { access_token, start_date, end_date } = req.body;
    
    if (!access_token) {
      return res.status(400).json({ error: 'Access token is required' });
    }

    console.log('📅 Fetching Microsoft Calendar events...');

    // Fetch events from Microsoft Graph API
    const response = await axios.get('https://graph.microsoft.com/v1.0/me/events', {
      headers: {
        'Authorization': `Bearer ${access_token}`
      },
      params: {
        $filter: `start/dateTime ge '${start_date || new Date().toISOString()}' and start/dateTime le '${end_date || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()}'`,
        $orderby: 'start/dateTime',
        $top: 100
      }
    });

    const events = response.data.value.map(event => ({
      id: event.id,
      title: event.subject || 'No Title',
      start: event.start.dateTime,
      end: event.end.dateTime,
      description: event.bodyPreview || '',
      location: event.location?.displayName || '',
      provider: 'microsoft',
      calendarId: 'primary'
    }));

    console.log(`✅ Retrieved ${events.length} Microsoft Calendar events`);
    res.json({ events });

  } catch (error) {
    console.error('❌ Failed to fetch Microsoft Calendar events:', error);
    res.status(500).json({ 
      error: 'Failed to fetch Microsoft Calendar events',
      details: error.message 
    });
  }
});

// Jira API Routes

// Test Jira connection
app.post('/api/jira/test', async (req, res) => {
  try {
    console.log('📥 Received Jira test request:', {
      baseUrl: req.body.baseUrl,
      username: req.body.username,
      apiToken: req.body.apiToken ? `${req.body.apiToken.substring(0, 10)}...` : 'NOT PROVIDED'
    });

    const result = await jiraService.testConnection(req.body);
    
    // Store config if test was successful
    if (result.success) {
      jiraConfig = req.body;
      console.log('✅ Jira config stored successfully');
    }
    
    res.json(result);
  } catch (error) {
    console.error('❌ Jira test connection failed:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to test Jira connection',
      details: error.message 
    });
  }
});

// Get all projects
app.get('/api/jira/projects', async (req, res) => {
  try {
    if (!jiraConfig) {
      return res.status(400).json({ 
        error: 'Jira not configured. Please test connection first.',
        details: 'No Jira configuration found. Test the connection first.' 
      });
    }

    console.log('📁 Fetching projects with stored config');
    const projects = await jiraService.getProjects(jiraConfig);
    res.json({ projects });
  } catch (error) {
    console.error('❌ Failed to fetch Jira projects:', error);
    res.status(500).json({ 
      error: 'Failed to fetch Jira projects',
      details: error.message 
    });
  }
});

// Get project details
app.get('/api/jira/projects/:projectKey', async (req, res) => {
  try {
    const { projectKey } = req.params;
    const project = await jiraService.getProject(projectKey);
    res.json({ project });
  } catch (error) {
    console.error(`❌ Failed to fetch Jira project ${req.params.projectKey}:`, error);
    res.status(500).json({ 
      error: 'Failed to fetch Jira project',
      details: error.message 
    });
  }
});

// Get assigned issues
app.get('/api/jira/issues/assigned', async (req, res) => {
  try {
    if (!jiraConfig) {
      return res.status(400).json({ 
        error: 'Jira not configured. Please test connection first.',
        details: 'No Jira configuration found. Test the connection first.' 
      });
    }

    const issues = await jiraService.getAssignedIssues(jiraConfig);
    res.json({ issues });
  } catch (error) {
    console.error('❌ Failed to fetch assigned Jira issues:', error);
    res.status(500).json({ 
      error: 'Failed to fetch assigned Jira issues',
      details: error.message 
    });
  }
});

// Get recent issues
app.get('/api/jira/issues/recent', async (req, res) => {
  try {
    if (!jiraConfig) {
      return res.status(400).json({ 
        error: 'Jira not configured. Please test connection first.',
        details: 'No Jira configuration found. Test the connection first.' 
      });
    }

    const { days = 7 } = req.query;
    const issues = await jiraService.getRecentIssues(jiraConfig, parseInt(days));
    res.json({ issues });
  } catch (error) {
    console.error('❌ Failed to fetch recent Jira issues:', error);
    res.status(500).json({ 
      error: 'Failed to fetch recent Jira issues',
      details: error.message 
    });
  }
});

// Search issues
app.post('/api/jira/issues/search', async (req, res) => {
  try {
    const { jql, maxResults = 50 } = req.body;
    
    if (!jql) {
      return res.status(400).json({ error: 'JQL query is required' });
    }

    const result = await jiraService.searchIssues(jql, maxResults);
    res.json(result);
  } catch (error) {
    console.error('❌ Failed to search Jira issues:', error);
    res.status(500).json({ 
      error: 'Failed to search Jira issues',
      details: error.message 
    });
  }
});

// Fetch specific issues
app.post('/api/jira/issues/fetch', async (req, res) => {
  try {
    const { issueKeys } = req.body;
    
    if (!issueKeys || !Array.isArray(issueKeys)) {
      return res.status(400).json({ error: 'Issue keys array is required' });
    }

    const issues = await jiraService.fetchIssues(issueKeys);
    res.json({ issues });
  } catch (error) {
    console.error('❌ Failed to fetch Jira issues:', error);
    res.status(500).json({ 
      error: 'Failed to fetch Jira issues',
      details: error.message 
    });
  }
});

// Get Jira statistics
app.get('/api/jira/stats', async (req, res) => {
  try {
    const stats = await jiraService.getJiraStats();
    res.json({ stats });
  } catch (error) {
    console.error('❌ Failed to get Jira statistics:', error);
    res.status(500).json({ 
      error: 'Failed to get Jira statistics',
      details: error.message 
    });
  }
});

// Clarizen API Routes

// Test Clarizen connection
app.post('/api/clarizen/test', async (req, res) => {
  try {
    console.log('📥 Received Clarizen test request:', {
      baseUrl: req.body.baseUrl,
      username: req.body.username,
      password: req.body.password ? '***PROVIDED***' : 'NOT PROVIDED'
    });

    const result = await clarizenService.testConnection(req.body);
    
    // Store config if test was successful
    if (result.success) {
      clarizenConfig = {
        ...req.body,
        accessToken: result.accessToken
      };
      console.log('✅ Clarizen config stored successfully');
    }
    
    res.json(result);
  } catch (error) {
    console.error('❌ Clarizen test connection failed:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to test Clarizen connection',
      details: error.message 
    });
  }
});

// Get user information
app.get('/api/clarizen/user', async (req, res) => {
  try {
    if (!clarizenConfig) {
      return res.status(400).json({ 
        error: 'Clarizen not configured. Please test connection first.',
        details: 'No Clarizen configuration found. Test the connection first.' 
      });
    }

    console.log('👤 Fetching user info with stored config');
    const user = await clarizenService.getUserInfo(clarizenConfig.accessToken);
    res.json({ user });
  } catch (error) {
    console.error('❌ Failed to fetch Clarizen user info:', error);
    res.status(500).json({ 
      error: 'Failed to fetch Clarizen user info',
      details: error.message 
    });
  }
});

// Get all projects
// Projects endpoint removed - using CZQL queries instead

// Get resourcing data
app.get('/api/clarizen/resourcing', async (req, res) => {
  try {
    if (!clarizenConfig) {
      return res.status(400).json({ 
        error: 'Clarizen not configured. Please test connection first.',
        details: 'No Clarizen configuration found. Test the connection first.' 
      });
    }

    console.log('📊 Fetching resourcing data with stored config');
    const resourcing = await clarizenService.getResourcingData(clarizenConfig, clarizenConfig.accessToken);
    res.json({ resourcing });
  } catch (error) {
    console.error('❌ Failed to fetch Clarizen resourcing data:', error);
    res.status(500).json({ 
      error: 'Failed to fetch Clarizen resourcing data',
      details: error.message 
    });
  }
});

// Get project details
// Individual project endpoint removed - using CZQL queries instead

// Start server
app.listen(PORT, () => {
  console.log(`🚀 ScoBro Logbook Backend Server running on port ${PORT}`);
  console.log(`📡 Health check: http://localhost:${PORT}/health`);
  console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
  
  // Check required environment variables
  const requiredEnvVars = [
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'MICROSOFT_CLIENT_ID',
    'MICROSOFT_CLIENT_SECRET',
    'MICROSOFT_TENANT_ID'
  ];

  // Check optional Jira environment variables
  const jiraEnvVars = [
    'JIRA_COMPANY_EMAIL',
    'JIRA_USER_EMAIL',
    'JIRA_KEY'
  ];
  
  const missingJiraVars = jiraEnvVars.filter(varName => !process.env[varName]);
  if (missingJiraVars.length > 0) {
    console.warn('⚠️  Missing Jira environment variables:', missingJiraVars.join(', '));
    console.warn('📝 Jira integration will be disabled');
  } else {
    console.log('✅ Jira environment variables are set');
  }
  
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.warn('⚠️  Missing environment variables:', missingVars.join(', '));
    console.warn('📝 Please check your .env file');
  } else {
    console.log('✅ All required environment variables are set');
  }
});
