#!/usr/bin/env node

/**
 * Phase 3 Testing Script
 * 
 * This script tests the Phase 3 features of ScoBro Logbook:
 * - Smart prompts and time-based nudges
 * - Time tracking with start/stop timers
 * - Advanced analytics and insights
 * - Enhanced user experience features
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 ScoBro Logbook Phase 3 Testing');
console.log('==================================\n');

// Test 1: Check if all Phase 3 components exist
console.log('📁 Checking Phase 3 components...');

const phase3Components = [
  'src/components/SmartPromptsModal.jsx',
  'src/components/TimeTrackingModal.jsx',
  'src/components/CalendarSyncModal.jsx',
  'src/components/JiraApiModal.jsx',
  'src/components/AnalyticsDashboard.jsx',
  'src/services/smartPromptsService.js',
  'src/services/timeTrackingService.js',
  'src/services/calendarService.js',
  'src/services/jiraApiService.js',
  'src/services/analyticsService.js',
  'src/services/connectionStatusService.js',
  'src/components/StatusPills.jsx'
];

let allComponentsExist = true;
phase3Components.forEach(component => {
  if (fs.existsSync(component)) {
    console.log(`✅ ${component}`);
  } else {
    console.log(`❌ ${component} - MISSING`);
    allComponentsExist = false;
  }
});

if (allComponentsExist) {
  console.log('\n✅ All Phase 3 components present');
} else {
  console.log('\n❌ Some Phase 3 components are missing');
}

// Test 2: Check Phase 3 service functionality
console.log('\n🔧 Checking Phase 3 service functionality...');

const smartPromptsService = fs.readFileSync('src/services/smartPromptsService.js', 'utf8');
const smartPromptsFeatures = [
  'getSmartPrompt',
  'analyzeUserPatterns',
  'generateContextualSuggestions',
  'shouldShowNudge',
  'getNudgeConfig',
  'saveNudgeConfig',
  'isQuietHours'
];

let allSmartPromptsFeaturesPresent = true;
smartPromptsFeatures.forEach(feature => {
  if (smartPromptsService.includes(`static async ${feature}`) || 
      smartPromptsService.includes(`static ${feature}`)) {
    console.log(`✅ ${feature}`);
  } else {
    console.log(`❌ ${feature} - MISSING`);
    allSmartPromptsFeaturesPresent = false;
  }
});

if (allSmartPromptsFeaturesPresent) {
  console.log('\n✅ All Smart Prompts features present');
} else {
  console.log('\n❌ Some Smart Prompts features are missing');
}

// Test 3: Check Calendar service functionality
console.log('\n🗓️ Checking Calendar service functionality...');

const calendarService = fs.readFileSync('src/services/calendarService.js', 'utf8');
const calendarFeatures = [
  'getCalendarConfig',
  'saveCalendarConfig',
  'initializeGoogleCalendar',
  'initializeMicrosoftOutlook',
  'syncCalendarEvents',
  'fetchGoogleCalendarEvents',
  'fetchMicrosoftCalendarEvents',
  'convertEventToEntry',
  'getUpcomingEvents',
  'testConnection',
  'disconnectCalendar',
  'getSyncStatus'
];

let allCalendarFeaturesPresent = true;
calendarFeatures.forEach(feature => {
  if (calendarService.includes(`static ${feature}`) || calendarService.includes(`static async ${feature}`)) {
    console.log(`✅ ${feature}`);
  } else {
    console.log(`❌ ${feature} - MISSING`);
    allCalendarFeaturesPresent = false;
  }
});

if (allCalendarFeaturesPresent) {
  console.log('\n✅ All Calendar service features present');
} else {
  console.log('\n❌ Some Calendar service features are missing');
}

// Test 4: Check Jira API service functionality
console.log('\n🔗 Checking Jira API service functionality...');

const jiraApiService = fs.readFileSync('src/services/jiraApiService.js', 'utf8');
const jiraApiFeatures = [
  'getJiraConfig',
  'saveJiraConfig',
  'testConnection',
  'makeApiRequest',
  'fetchIssue',
  'fetchIssues',
  'searchIssues',
  'getRecentIssues',
  'getAssignedIssues',
  'formatIssueData',
  'extractCustomFields',
  'parseJiraReferences',
  'validateJiraReference',
  'getIssueTypeIcon',
  'getPriorityColor',
  'getStatusColor',
  'syncJiraIssues',
  'getJiraStats',
  'disableJiraApi',
  'getSyncStatus'
];

let allJiraApiFeaturesPresent = true;
jiraApiFeatures.forEach(feature => {
  if (jiraApiService.includes(`static ${feature}`) || jiraApiService.includes(`static async ${feature}`)) {
    console.log(`✅ ${feature}`);
  } else {
    console.log(`❌ ${feature} - MISSING`);
    allJiraApiFeaturesPresent = false;
  }
});

if (allJiraApiFeaturesPresent) {
  console.log('\n✅ All Jira API service features present');
} else {
  console.log('\n❌ Some Jira API service features are missing');
}

// Test 5: Check Analytics service functionality
console.log('\n📊 Checking Analytics service functionality...');

const analyticsService = fs.readFileSync('src/services/analyticsService.js', 'utf8');
const analyticsFeatures = [
  'getAnalyticsConfig',
  'saveAnalyticsConfig',
  'generateAnalytics',
  'generateOverview',
  'generateProductivityAnalytics',
  'generateProjectAnalytics',
  'generateTimeTrackingAnalytics',
  'generateCollaborationAnalytics',
  'generateInsights',
  'generateTrends',
  'generateChartData',
  'calculateProductivityScore',
  'calculateEntryStreak',
  'calculateTimeTrackingStreak',
  'formatDuration',
  'getTimeRanges',
  'calculateDailyProductivity',
  'calculateDayProductivity',
  'generateProductivityInsights',
  'generateTimeInsights',
  'generateProjectInsights',
  'generateCollaborationInsights',
  'generateJiraInsights'
];

let allAnalyticsFeaturesPresent = true;
analyticsFeatures.forEach(feature => {
  if (analyticsService.includes(`static ${feature}`) || analyticsService.includes(`static async ${feature}`)) {
    console.log(`✅ ${feature}`);
  } else {
    console.log(`❌ ${feature} - MISSING`);
    allAnalyticsFeaturesPresent = false;
  }
});

if (allAnalyticsFeaturesPresent) {
  console.log('\n✅ All Analytics service features present');
} else {
  console.log('\n❌ Some Analytics service features are missing');
}

// Test 6: Check Connection Status service functionality
console.log('\n🔗 Checking Connection Status service functionality...');

const connectionStatusService = fs.readFileSync('src/services/connectionStatusService.js', 'utf8');
const connectionStatusFeatures = [
  'getConnectionStatuses',
  'saveConnectionStatuses',
  'updateConnectionStatus',
  'checkSupabaseStatus',
  'checkEmailStatus',
  'checkJiraStatus',
  'checkCalendarStatus',
  'checkAnalyticsStatus',
  'checkAllStatuses',
  'getStatusPillConfig',
  'getServiceDisplayName'
];

let allConnectionStatusFeaturesPresent = true;
connectionStatusFeatures.forEach(feature => {
  if (connectionStatusService.includes(`static ${feature}`) || connectionStatusService.includes(`static async ${feature}`)) {
    console.log(`✅ ${feature}`);
  } else {
    console.log(`❌ ${feature} - MISSING`);
    allConnectionStatusFeaturesPresent = false;
  }
});

if (allConnectionStatusFeaturesPresent) {
  console.log('\n✅ All Connection Status service features present');
} else {
  console.log('\n❌ Some Connection Status service features are missing');
}

// Test 7: Check Time Tracking service functionality
console.log('\n⏱️ Checking Time Tracking service functionality...');

const timeTrackingService = fs.readFileSync('src/services/timeTrackingService.js', 'utf8');
const timeTrackingFeatures = [
  'startTimer',
  'stopTimer',
  'getActiveTimer',
  'isTimerActive',
  'getCurrentTimerDuration',
  'formatDuration',
  'getTimeTrackingStats',
  'getTimeTrackingByProject',
  'getTimeTrackingByTask',
  'createEntryFromTimer',
  'exportTimeTrackingData',
  'getProductivityInsights'
];

let allTimeTrackingFeaturesPresent = true;
timeTrackingFeatures.forEach(feature => {
  if (timeTrackingService.includes(`static ${feature}`)) {
    console.log(`✅ ${feature}`);
  } else {
    console.log(`❌ ${feature} - MISSING`);
    allTimeTrackingFeaturesPresent = false;
  }
});

if (allTimeTrackingFeaturesPresent) {
  console.log('\n✅ All Time Tracking features present');
} else {
  console.log('\n❌ Some Time Tracking features are missing');
}

// Test 8: Check Smart Prompts Modal functionality
console.log('\n🧠 Checking Smart Prompts Modal functionality...');

const smartPromptsModal = fs.readFileSync('src/components/SmartPromptsModal.jsx', 'utf8');
const smartPromptsModalFeatures = [
  'loadSmartPrompt',
  'getActiveProject',
  'getUpcomingMeeting',
  'getRecentActivity',
  'handlePromptSelect',
  'handleConfigChange',
  'getPriorityColor',
  'getPriorityIcon'
];

let allSmartPromptsModalFeaturesPresent = true;
smartPromptsModalFeatures.forEach(feature => {
  if (smartPromptsModal.includes(feature)) {
    console.log(`✅ ${feature}`);
  } else {
    console.log(`❌ ${feature} - MISSING`);
    allSmartPromptsModalFeaturesPresent = false;
  }
});

if (allSmartPromptsModalFeaturesPresent) {
  console.log('\n✅ All Smart Prompts Modal features present');
} else {
  console.log('\n❌ Some Smart Prompts Modal features are missing');
}

// Test 9: Check Calendar Sync Modal functionality
console.log('\n🗓️ Checking Calendar Sync Modal functionality...');

const calendarSyncModal = fs.readFileSync('src/components/CalendarSyncModal.jsx', 'utf8');
const calendarSyncModalFeatures = [
  'loadCalendarConfig',
  'loadUpcomingEvents',
  'handleGoogleConnect',
  'handleMicrosoftConnect',
  'handleDisconnect',
  'handleTestConnection',
  'handleSyncEvents',
  'handleConfigChange',
  'formatEventTime',
  'getStatusColor',
  'getStatusIcon'
];

let allCalendarSyncModalFeaturesPresent = true;
calendarSyncModalFeatures.forEach(feature => {
  if (calendarSyncModal.includes(feature)) {
    console.log(`✅ ${feature}`);
  } else {
    console.log(`❌ ${feature} - MISSING`);
    allCalendarSyncModalFeaturesPresent = false;
  }
});

if (allCalendarSyncModalFeaturesPresent) {
  console.log('\n✅ All Calendar Sync Modal features present');
} else {
  console.log('\n❌ Some Calendar Sync Modal features are missing');
}

// Test 10: Check Jira API Modal functionality
console.log('\n🔗 Checking Jira API Modal functionality...');

const jiraApiModal = fs.readFileSync('src/components/JiraApiModal.jsx', 'utf8');
const jiraApiModalFeatures = [
  'loadJiraConfig',
  'loadJiraData',
  'handleTestConnection',
  'handleSaveConfig',
  'handleSyncIssues',
  'handleDisable',
  'handleConfigChange',
  'handleProjectKeyChange',
  'formatDate',
  'getStatusColor',
  'getStatusIcon'
];

let allJiraApiModalFeaturesPresent = true;
jiraApiModalFeatures.forEach(feature => {
  if (jiraApiModal.includes(feature)) {
    console.log(`✅ ${feature}`);
  } else {
    console.log(`❌ ${feature} - MISSING`);
    allJiraApiModalFeaturesPresent = false;
  }
});

if (allJiraApiModalFeaturesPresent) {
  console.log('\n✅ All Jira API Modal features present');
} else {
  console.log('\n❌ Some Jira API Modal features are missing');
}

// Test 11: Check Analytics Dashboard functionality
console.log('\n📊 Checking Analytics Dashboard functionality...');

const analyticsDashboard = fs.readFileSync('src/components/AnalyticsDashboard.jsx', 'utf8');
const analyticsDashboardFeatures = [
  'loadAnalyticsData',
  'handleConfigChange',
  'exportAnalytics',
  'getInsightIcon',
  'getInsightColor',
  'AnalyticsService',
  'TimeTrackingService',
  'CalendarService',
  'JiraApiService',
  'selectedTimeRange',
  'selectedChart',
  'analytics',
  'config',
  'loading'
];

let allAnalyticsDashboardFeaturesPresent = true;
analyticsDashboardFeatures.forEach(feature => {
  if (analyticsDashboard.includes(feature)) {
    console.log(`✅ ${feature}`);
  } else {
    console.log(`❌ ${feature} - MISSING`);
    allAnalyticsDashboardFeaturesPresent = false;
  }
});

if (allAnalyticsDashboardFeaturesPresent) {
  console.log('\n✅ All Analytics Dashboard features present');
} else {
  console.log('\n❌ Some Analytics Dashboard features are missing');
}

// Test 12: Check Time Tracking Modal functionality
console.log('\n⏱️ Checking Time Tracking Modal functionality...');

const timeTrackingModal = fs.readFileSync('src/components/TimeTrackingModal.jsx', 'utf8');
const timeTrackingModalFeatures = [
  'loadTimeTrackingData',
  'handleStartTimer',
  'handleStopTimer',
  'handleDeleteTimer',
  'handleExportData'
];

let allTimeTrackingModalFeaturesPresent = true;
timeTrackingModalFeatures.forEach(feature => {
  if (timeTrackingModal.includes(feature)) {
    console.log(`✅ ${feature}`);
  } else {
    console.log(`❌ ${feature} - MISSING`);
    allTimeTrackingModalFeaturesPresent = false;
  }
});

if (allTimeTrackingModalFeaturesPresent) {
  console.log('\n✅ All Time Tracking Modal features present');
} else {
  console.log('\n❌ Some Time Tracking Modal features are missing');
}

// Test 13: Check App.jsx Phase 3 integration
console.log('\n⚛️ Checking App.jsx Phase 3 integration...');

const appJsx = fs.readFileSync('src/App.jsx', 'utf8');
const appPhase3Features = [
  'SmartPromptsModal',
  'TimeTrackingModal',
  'CalendarSyncModal',
  'JiraApiModal',
  'AnalyticsDashboard',
  'SmartPromptsService',
  'TimeTrackingService',
  'CalendarService',
  'JiraApiService',
  'AnalyticsService',
  'showSmartPrompts',
  'showTimeTracking',
  'showCalendarSync',
  'showJiraApi',
  'showAnalytics',
  'smartPromptNudge',
  'setupSmartPrompts',
  'checkForSmartPromptNudge',
  'handleSmartPromptSelect',
  'handleTimerComplete',
  'handleCalendarEventsSynced',
  'handleJiraIssuesSynced'
];

let allAppPhase3FeaturesPresent = true;
appPhase3Features.forEach(feature => {
  if (appJsx.includes(feature)) {
    console.log(`✅ ${feature}`);
  } else {
    console.log(`❌ ${feature} - MISSING`);
    allAppPhase3FeaturesPresent = false;
  }
});

if (allAppPhase3FeaturesPresent) {
  console.log('\n✅ All App.jsx Phase 3 features present');
} else {
  console.log('\n❌ Some App.jsx Phase 3 features are missing');
}

// Test 14: Check Smart Prompts configuration
console.log('\n⚙️ Checking Smart Prompts configuration...');

const smartPromptsConfig = [
  'morning',
  'afternoon',
  'evening',
  'weekly',
  'project',
  'meeting',
  'nudgeIntervals',
  'prompts'
];

let allSmartPromptsConfigPresent = true;
smartPromptsConfig.forEach(config => {
  if (smartPromptsService.includes(config)) {
    console.log(`✅ ${config}`);
  } else {
    console.log(`❌ ${config} - MISSING`);
    allSmartPromptsConfigPresent = false;
  }
});

if (allSmartPromptsConfigPresent) {
  console.log('\n✅ All Smart Prompts configuration present');
} else {
  console.log('\n❌ Some Smart Prompts configuration is missing');
}

// Test 15: Check Time Tracking data management
console.log('\n💾 Checking Time Tracking data management...');

const timeTrackingDataFeatures = [
  'STORAGE_KEY',
  'ACTIVE_TIMER_KEY',
  'getTimeTrackingData',
  'saveTimeTrackingData',
  'calculateTotalTime',
  'generateId'
];

let allTimeTrackingDataFeaturesPresent = true;
timeTrackingDataFeatures.forEach(feature => {
  if (timeTrackingService.includes(feature)) {
    console.log(`✅ ${feature}`);
  } else {
    console.log(`❌ ${feature} - MISSING`);
    allTimeTrackingDataFeaturesPresent = false;
  }
});

if (allTimeTrackingDataFeaturesPresent) {
  console.log('\n✅ All Time Tracking data management features present');
} else {
  console.log('\n❌ Some Time Tracking data management features are missing');
}

// Test 16: Check UI/UX enhancements
console.log('\n🎨 Checking UI/UX enhancements...');

const uiEnhancements = [
  'Smart Prompts',
  'Time Tracking',
  'Calendar',
  'Jira API',
  'Analytics',
  'smartPromptNudge',
  'priority',
  'insights',
  'Statistics',
  'export',
  'Google Calendar',
  'Microsoft Outlook',
  'Jira',
  'Productivity Score',
  'Analytics Dashboard'
];

let allUIEnhancementsPresent = true;
uiEnhancements.forEach(enhancement => {
  if (appJsx.includes(enhancement) || smartPromptsModal.includes(enhancement) || timeTrackingModal.includes(enhancement) || calendarSyncModal.includes(enhancement) || jiraApiModal.includes(enhancement) || analyticsDashboard.includes(enhancement)) {
    console.log(`✅ ${enhancement}`);
  } else {
    console.log(`❌ ${enhancement} - MISSING`);
    allUIEnhancementsPresent = false;
  }
});

if (allUIEnhancementsPresent) {
  console.log('\n✅ All UI/UX enhancements present');
} else {
  console.log('\n❌ Some UI/UX enhancements are missing');
}

// Test 17: Check integration with existing features
console.log('\n🔗 Checking integration with existing features...');

const integrationFeatures = [
  'handleSaveItems',
  'entries',
  'DataService',
  'SupabaseService',
  'localStorage',
  'useEffect',
  'useState'
];

let allIntegrationFeaturesPresent = true;
integrationFeatures.forEach(feature => {
  if (appJsx.includes(feature)) {
    console.log(`✅ ${feature}`);
  } else {
    console.log(`❌ ${feature} - MISSING`);
    allIntegrationFeaturesPresent = false;
  }
});

if (allIntegrationFeaturesPresent) {
  console.log('\n✅ All integration features present');
} else {
  console.log('\n❌ Some integration features are missing');
}

// Summary
console.log('\n📊 Phase 3 Test Summary');
console.log('========================');

const tests = [
  { name: 'Phase 3 Components', passed: allComponentsExist },
  { name: 'Smart Prompts Service', passed: allSmartPromptsFeaturesPresent },
  { name: 'Calendar Service', passed: allCalendarFeaturesPresent },
  { name: 'Jira API Service', passed: allJiraApiFeaturesPresent },
  { name: 'Analytics Service', passed: allAnalyticsFeaturesPresent },
  { name: 'Connection Status Service', passed: allConnectionStatusFeaturesPresent },
  { name: 'Time Tracking Service', passed: allTimeTrackingFeaturesPresent },
  { name: 'Smart Prompts Modal', passed: allSmartPromptsModalFeaturesPresent },
  { name: 'Calendar Sync Modal', passed: allCalendarSyncModalFeaturesPresent },
  { name: 'Jira API Modal', passed: allJiraApiModalFeaturesPresent },
  { name: 'Analytics Dashboard', passed: allAnalyticsDashboardFeaturesPresent },
  { name: 'Time Tracking Modal', passed: allTimeTrackingModalFeaturesPresent },
  { name: 'App Integration', passed: allAppPhase3FeaturesPresent },
  { name: 'Smart Prompts Config', passed: allSmartPromptsConfigPresent },
  { name: 'Time Tracking Data', passed: allTimeTrackingDataFeaturesPresent },
  { name: 'UI/UX Enhancements', passed: allUIEnhancementsPresent },
  { name: 'Feature Integration', passed: allIntegrationFeaturesPresent }
];

const passedTests = tests.filter(test => test.passed).length;
const totalTests = tests.length;

tests.forEach(test => {
  console.log(`${test.passed ? '✅' : '❌'} ${test.name}`);
});

console.log(`\n🎯 Results: ${passedTests}/${totalTests} tests passed`);

if (passedTests === totalTests) {
  console.log('\n🎉 Phase 3 implementation is complete and ready for testing!');
  console.log('\n🚀 Phase 3 Features Available:');
  console.log('• ✅ Smart prompts and time-based nudges');
  console.log('• ✅ Time tracking with start/stop timers');
  console.log('• ✅ Calendar sync (Google Calendar & Microsoft Outlook)');
  console.log('• ✅ Jira API integration for real-time issue data');
  console.log('• ✅ Advanced analytics dashboard with comprehensive insights');
  console.log('• ✅ Connection status monitoring for all services');
  console.log('• ✅ Enhanced user experience');
  console.log('• ✅ Intelligent suggestions based on user patterns');
  console.log('• ✅ Productivity insights and statistics');
  console.log('• ✅ Configurable nudge settings');
  console.log('• ✅ Time tracking data export');
  console.log('• ✅ Analytics data export');
  console.log('• ✅ Integration with existing entry system');
  console.log('\nNext steps:');
  console.log('1. Run `npm run tauri` to start development');
  console.log('2. Set up Supabase connection (see SUPABASE_SETUP.md)');
  console.log('3. Test connection status pills and service monitoring');
  console.log('4. Test smart prompts and nudges');
  console.log('5. Test time tracking functionality');
  console.log('6. Test calendar sync with Google Calendar and Microsoft Outlook');
  console.log('7. Test Jira API integration and issue synchronization');
  console.log('8. Test analytics dashboard and insights');
  console.log('9. Configure nudge settings');
  console.log('10. Test timer integration with entries');
  console.log('11. Explore productivity insights and analytics');
  console.log('12. Test data export functionality');
} else {
  console.log('\n⚠️ Some Phase 3 tests failed. Please fix the issues before proceeding.');
  process.exit(1);
}
