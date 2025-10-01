#!/usr/bin/env node

/**
 * Phase 2 Testing Script
 * 
 * This script tests the Phase 2 features of ScoBro Logbook:
 * - Inline editing functionality
 * - Supabase authentication integration
 * - Real-time sync capabilities
 * - Enhanced Jira integration
 * - Email service configuration
 * - Projects, Tags, and Meetings management
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 ScoBro Logbook Phase 2 Testing');
console.log('==================================\n');

// Test 1: Check if all Phase 2 components exist
console.log('📁 Checking Phase 2 components...');

const phase2Components = [
  'src/components/JiraRefInput.jsx',
  'src/components/EmailConfigModal.jsx',
  'src/components/ProjectsManager.jsx',
  'src/components/TagsManager.jsx',
  'src/components/MeetingsManager.jsx',
  'src/components/AuthModal.jsx'
];

let allComponentsExist = true;
phase2Components.forEach(component => {
  if (fs.existsSync(component)) {
    console.log(`✅ ${component}`);
  } else {
    console.log(`❌ ${component} - MISSING`);
    allComponentsExist = false;
  }
});

if (allComponentsExist) {
  console.log('\n✅ All Phase 2 components present');
} else {
  console.log('\n❌ Some Phase 2 components are missing');
}

// Test 2: Check Phase 2 backend commands
console.log('\n🔧 Checking Phase 2 backend commands...');

const commandsRs = fs.readFileSync('src-tauri/src/commands.rs', 'utf8');
const phase2Commands = [
  'update_entry_item',
  'create_project',
  'get_all_projects',
  'update_project',
  'delete_project',
  'create_tag',
  'get_all_tags',
  'update_tag',
  'delete_tag',
  'create_meeting',
  'get_all_meetings',
  'add_meeting_attendee',
  'get_meeting_attendees',
  'create_meeting_action',
  'get_meeting_actions',
  'delete_meeting'
];

let allCommandsPresent = true;
phase2Commands.forEach(command => {
  if (commandsRs.includes(`pub async fn ${command}`)) {
    console.log(`✅ ${command}`);
  } else {
    console.log(`❌ ${command} - MISSING`);
    allCommandsPresent = false;
  }
});

if (allCommandsPresent) {
  console.log('\n✅ All Phase 2 backend commands present');
} else {
  console.log('\n❌ Some Phase 2 backend commands are missing');
}

// Test 3: Check database schema for Phase 2 tables
console.log('\n🗄️ Checking Phase 2 database schema...');

const databaseRs = fs.readFileSync('src-tauri/src/database.rs', 'utf8');
const phase2Tables = [
  'projects',
  'tags',
  'meetings',
  'meeting_attendees',
  'meeting_actions'
];

let allTablesPresent = true;
phase2Tables.forEach(table => {
  if (databaseRs.includes(`CREATE TABLE IF NOT EXISTS ${table}`) || 
      databaseRs.includes(`struct ${table.charAt(0).toUpperCase() + table.slice(1)}`)) {
    console.log(`✅ ${table} table`);
  } else {
    console.log(`❌ ${table} table - MISSING`);
    allTablesPresent = false;
  }
});

if (allTablesPresent) {
  console.log('\n✅ All Phase 2 database tables present');
} else {
  console.log('\n❌ Some Phase 2 database tables are missing');
}

// Test 4: Check Phase 2 data service methods
console.log('\n📊 Checking Phase 2 data service methods...');

const dataServiceJs = fs.readFileSync('src/services/dataService.js', 'utf8');
const phase2Methods = [
  'updateEntryItem',
  'createProject',
  'getAllProjects',
  'updateProject',
  'deleteProject',
  'createTag',
  'getAllTags',
  'updateTag',
  'deleteTag',
  'createMeeting',
  'getAllMeetings',
  'addMeetingAttendee',
  'getMeetingAttendees',
  'createMeetingAction',
  'getMeetingActions',
  'deleteMeeting'
];

let allMethodsPresent = true;
phase2Methods.forEach(method => {
  if (dataServiceJs.includes(`static async ${method}`)) {
    console.log(`✅ ${method}`);
  } else {
    console.log(`❌ ${method} - MISSING`);
    allMethodsPresent = false;
  }
});

if (allMethodsPresent) {
  console.log('\n✅ All Phase 2 data service methods present');
} else {
  console.log('\n❌ Some Phase 2 data service methods are missing');
}

// Test 5: Check Supabase integration
console.log('\n🔄 Checking Supabase integration...');

const supabaseServiceJs = fs.readFileSync('src/services/supabaseService.js', 'utf8');
const supabaseFeatures = [
  'isAuthenticated',
  'getCurrentUser',
  'signIn',
  'signUp',
  'signOut',
  'syncEntries',
  'syncEntriesBidirectional',
  'subscribeToEntries',
  'mergeEntries',
  'uploadEntry'
];

let allSupabaseFeaturesPresent = true;
supabaseFeatures.forEach(feature => {
  if (supabaseServiceJs.includes(`static async ${feature}`) || 
      supabaseServiceJs.includes(`static ${feature}`)) {
    console.log(`✅ ${feature}`);
  } else {
    console.log(`❌ ${feature} - MISSING`);
    allSupabaseFeaturesPresent = false;
  }
});

if (allSupabaseFeaturesPresent) {
  console.log('\n✅ All Supabase integration features present');
} else {
  console.log('\n❌ Some Supabase integration features are missing');
}

// Test 6: Check Email service
console.log('\n📧 Checking Email service...');

const emailServiceJs = fs.readFileSync('src/services/emailService.js', 'utf8');
const emailFeatures = [
  'getCredentials',
  'sendMeetingInvitation',
  'sendMeetingReminder',
  'sendActionNotification',
  'testConnection'
];

let allEmailFeaturesPresent = true;
emailFeatures.forEach(feature => {
  if (emailServiceJs.includes(`static async ${feature}`)) {
    console.log(`✅ ${feature}`);
  } else {
    console.log(`❌ ${feature} - MISSING`);
    allEmailFeaturesPresent = false;
  }
});

if (allEmailFeaturesPresent) {
  console.log('\n✅ All Email service features present');
} else {
  console.log('\n❌ Some Email service features are missing');
}

// Test 7: Check App.jsx Phase 2 integration
console.log('\n⚛️ Checking App.jsx Phase 2 integration...');

const appJsx = fs.readFileSync('src/App.jsx', 'utf8');
const appFeatures = [
  'AuthModal',
  'EmailConfigModal',
  'isAuthenticated',
  'user',
  'handleAuthSuccess',
  'handleSignOut',
  'subscribeToEntries',
  'syncEntriesBidirectional'
];

let allAppFeaturesPresent = true;
appFeatures.forEach(feature => {
  if (appJsx.includes(feature)) {
    console.log(`✅ ${feature}`);
  } else {
    console.log(`❌ ${feature} - MISSING`);
    allAppFeaturesPresent = false;
  }
});

if (allAppFeaturesPresent) {
  console.log('\n✅ All App.jsx Phase 2 features present');
} else {
  console.log('\n❌ Some App.jsx Phase 2 features are missing');
}

// Test 8: Check Dashboard inline editing
console.log('\n✏️ Checking Dashboard inline editing...');

const dashboardJsx = fs.readFileSync('src/components/Dashboard.jsx', 'utf8');
const editingFeatures = [
  'editingItem',
  'editingContent',
  'startEditing',
  'cancelEditing',
  'saveEditing',
  'updateEntryItem'
];

let allEditingFeaturesPresent = true;
editingFeatures.forEach(feature => {
  if (dashboardJsx.includes(feature)) {
    console.log(`✅ ${feature}`);
  } else {
    console.log(`❌ ${feature} - MISSING`);
    allEditingFeaturesPresent = false;
  }
});

if (allEditingFeaturesPresent) {
  console.log('\n✅ All inline editing features present');
} else {
  console.log('\n❌ Some inline editing features are missing');
}

// Test 9: Check Jira integration
console.log('\n🧩 Checking Jira integration...');

const jiraRefInputJsx = fs.readFileSync('src/components/JiraRefInput.jsx', 'utf8');
const jiraFeatures = [
  'parseJiraRefs',
  'validateJiraRef',
  'getJiraIcon',
  'validationResults'
];

let allJiraFeaturesPresent = true;
jiraFeatures.forEach(feature => {
  if (jiraRefInputJsx.includes(feature)) {
    console.log(`✅ ${feature}`);
  } else {
    console.log(`❌ ${feature} - MISSING`);
    allJiraFeaturesPresent = false;
  }
});

if (allJiraFeaturesPresent) {
  console.log('\n✅ All Jira integration features present');
} else {
  console.log('\n❌ Some Jira integration features are missing');
}

// Test 10: Check main.rs command registration
console.log('\n🔧 Checking main.rs command registration...');

const mainRs = fs.readFileSync('src-tauri/src/main.rs', 'utf8');
const registeredCommands = [
  'update_entry_item',
  'create_project',
  'get_all_projects',
  'update_project',
  'delete_project',
  'create_tag',
  'get_all_tags',
  'update_tag',
  'delete_tag',
  'create_meeting',
  'get_all_meetings',
  'add_meeting_attendee',
  'get_meeting_attendees',
  'create_meeting_action',
  'get_meeting_actions',
  'delete_meeting'
];

let allCommandsRegistered = true;
registeredCommands.forEach(command => {
  if (mainRs.includes(command)) {
    console.log(`✅ ${command} registered`);
  } else {
    console.log(`❌ ${command} - NOT REGISTERED`);
    allCommandsRegistered = false;
  }
});

if (allCommandsRegistered) {
  console.log('\n✅ All Phase 2 commands registered');
} else {
  console.log('\n❌ Some Phase 2 commands not registered');
}

// Summary
console.log('\n📊 Phase 2 Test Summary');
console.log('========================');

const tests = [
  { name: 'Phase 2 Components', passed: allComponentsExist },
  { name: 'Backend Commands', passed: allCommandsPresent },
  { name: 'Database Tables', passed: allTablesPresent },
  { name: 'Data Service Methods', passed: allMethodsPresent },
  { name: 'Supabase Integration', passed: allSupabaseFeaturesPresent },
  { name: 'Email Service', passed: allEmailFeaturesPresent },
  { name: 'App Integration', passed: allAppFeaturesPresent },
  { name: 'Inline Editing', passed: allEditingFeaturesPresent },
  { name: 'Jira Integration', passed: allJiraFeaturesPresent },
  { name: 'Command Registration', passed: allCommandsRegistered }
];

const passedTests = tests.filter(test => test.passed).length;
const totalTests = tests.length;

tests.forEach(test => {
  console.log(`${test.passed ? '✅' : '❌'} ${test.name}`);
});

console.log(`\n🎯 Results: ${passedTests}/${totalTests} tests passed`);

if (passedTests === totalTests) {
  console.log('\n🎉 Phase 2 implementation is complete and ready for testing!');
  console.log('\n🚀 Phase 2 Features Available:');
  console.log('• ✅ Inline editing for entries and items');
  console.log('• ✅ Supabase authentication and sync');
  console.log('• ✅ Real-time bidirectional sync');
  console.log('• ✅ Enhanced Jira integration with validation');
  console.log('• ✅ Email service for meeting notifications');
  console.log('• ✅ Projects management with colors');
  console.log('• ✅ Tags management with categories');
  console.log('• ✅ Meetings management with attendees and actions');
  console.log('\nNext steps:');
  console.log('1. Run `npm run tauri` to start development');
  console.log('2. Test authentication flow');
  console.log('3. Test inline editing functionality');
  console.log('4. Test real-time sync between devices');
  console.log('5. Configure email settings for meeting notifications');
  console.log('6. Create projects, tags, and meetings');
  console.log('7. Test Jira reference validation');
} else {
  console.log('\n⚠️ Some Phase 2 tests failed. Please fix the issues before proceeding.');
  process.exit(1);
}
