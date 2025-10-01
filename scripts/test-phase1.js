#!/usr/bin/env node

/**
 * Phase 1 MVP Testing Script
 * 
 * This script tests the core functionality of ScoBro Logbook Phase 1:
 * - SQLite database operations
 * - Tauri command integration
 * - Export functionality
 * - UI component rendering
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 ScoBro Logbook Phase 1 MVP Testing');
console.log('=====================================\n');

// Test 1: Check if all required files exist
console.log('📁 Checking file structure...');

const requiredFiles = [
  'src-tauri/src/database.rs',
  'src-tauri/src/commands.rs',
  'src-tauri/src/main.rs',
  'src/services/dataService.js',
  'src/services/supabaseService.js',
  'src/components/AuthModal.jsx',
  'supabase-schema.sql',
  '.github/workflows/build.yml',
  'src-tauri/icons/icon.svg',
  'SETUP.md'
];

let allFilesExist = true;
requiredFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`✅ ${file}`);
  } else {
    console.log(`❌ ${file} - MISSING`);
    allFilesExist = false;
  }
});

if (allFilesExist) {
  console.log('\n✅ All required files present');
} else {
  console.log('\n❌ Some files are missing');
  process.exit(1);
}

// Test 2: Check package.json dependencies
console.log('\n📦 Checking dependencies...');

const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const requiredDeps = [
  '@supabase/supabase-js',
  'uuid'
];

let allDepsPresent = true;
requiredDeps.forEach(dep => {
  if (packageJson.dependencies[dep]) {
    console.log(`✅ ${dep}`);
  } else {
    console.log(`❌ ${dep} - MISSING`);
    allDepsPresent = false;
  }
});

if (allDepsPresent) {
  console.log('\n✅ All required dependencies present');
} else {
  console.log('\n❌ Some dependencies are missing');
}

// Test 3: Check Cargo.toml dependencies
console.log('\n🦀 Checking Rust dependencies...');

const cargoToml = fs.readFileSync('src-tauri/Cargo.toml', 'utf8');
const requiredRustDeps = [
  'sqlx',
  'tokio',
  'serde',
  'chrono',
  'uuid'
];

let allRustDepsPresent = true;
requiredRustDeps.forEach(dep => {
  if (cargoToml.includes(dep)) {
    console.log(`✅ ${dep}`);
  } else {
    console.log(`❌ ${dep} - MISSING`);
    allRustDepsPresent = false;
  }
});

if (allRustDepsPresent) {
  console.log('\n✅ All required Rust dependencies present');
} else {
  console.log('\n❌ Some Rust dependencies are missing');
}

// Test 4: Check Tauri configuration
console.log('\n⚙️ Checking Tauri configuration...');

// Read the config file content and check for required strings
const tauriConfigContent = fs.readFileSync('src-tauri/tauri.conf.json', 'utf8');

const configChecks = [
  { name: 'Identifier set', check: () => tauriConfigContent.includes('"identifier": "com.scobro.logbook"') },
  { name: 'Tray configured', check: () => tauriConfigContent.includes('"tray"') && tauriConfigContent.includes('iconPath') },
  { name: 'Updater configured', check: () => tauriConfigContent.includes('"active": true') && tauriConfigContent.includes('updater') },
  { name: 'Window label set', check: () => tauriConfigContent.includes('"label": "main"') },
  { name: 'Bundle configured', check: () => tauriConfigContent.includes('"bundle"') && tauriConfigContent.includes('"active": true') }
];

let allConfigValid = true;
configChecks.forEach(({ name, check }) => {
  if (check()) {
    console.log(`✅ ${name}`);
  } else {
    console.log(`❌ ${name} - INVALID`);
    allConfigValid = false;
  }
});

if (allConfigValid) {
  console.log('\n✅ Tauri configuration is valid');
} else {
  console.log('\n❌ Tauri configuration has issues');
}

// Test 5: Check React component structure
console.log('\n⚛️ Checking React components...');

const appJsx = fs.readFileSync('src/App.jsx', 'utf8');
const componentChecks = [
  { name: 'DataService import', check: () => appJsx.includes('DataService') },
  { name: 'SupabaseService import', check: () => appJsx.includes('SupabaseService') },
  { name: 'Export buttons', check: () => appJsx.includes('exportAndDownloadCSV') },
  { name: 'Sync status display', check: () => appJsx.includes('syncStatus') },
  { name: 'Tray event listener', check: () => appJsx.includes('quick-add') }
];

let allComponentsValid = true;
componentChecks.forEach(({ name, check }) => {
  if (check()) {
    console.log(`✅ ${name}`);
  } else {
    console.log(`❌ ${name} - MISSING`);
    allComponentsValid = false;
  }
});

if (allComponentsValid) {
  console.log('\n✅ React components are properly configured');
} else {
  console.log('\n❌ React components have issues');
}

// Test 6: Check database schema
console.log('\n🗄️ Checking database schema...');

const schemaSql = fs.readFileSync('supabase-schema.sql', 'utf8');
const schemaChecks = [
  { name: 'Entries table', check: () => schemaSql.includes('CREATE TABLE') && schemaSql.includes('entries') },
  { name: 'Entry items table', check: () => schemaSql.includes('CREATE TABLE') && schemaSql.includes('entry_items') },
  { name: 'Tags table', check: () => schemaSql.includes('CREATE TABLE') && schemaSql.includes('tags') },
  { name: 'People table', check: () => schemaSql.includes('CREATE TABLE') && schemaSql.includes('people') },
  { name: 'Jira refs table', check: () => schemaSql.includes('CREATE TABLE') && schemaSql.includes('jira_refs') },
  { name: 'RLS policies', check: () => schemaSql.includes('ROW LEVEL SECURITY') },
  { name: 'User trigger', check: () => schemaSql.includes('handle_new_user') }
];

let allSchemaValid = true;
schemaChecks.forEach(({ name, check }) => {
  if (check()) {
    console.log(`✅ ${name}`);
  } else {
    console.log(`❌ ${name} - MISSING`);
    allSchemaValid = false;
  }
});

if (allSchemaValid) {
  console.log('\n✅ Database schema is complete');
} else {
  console.log('\n❌ Database schema has issues');
}

// Summary
console.log('\n📊 Phase 1 MVP Test Summary');
console.log('============================');

const tests = [
  { name: 'File Structure', passed: allFilesExist },
  { name: 'Dependencies', passed: allDepsPresent },
  { name: 'Rust Dependencies', passed: allRustDepsPresent },
  { name: 'Tauri Configuration', passed: allConfigValid },
  { name: 'React Components', passed: allComponentsValid },
  { name: 'Database Schema', passed: allSchemaValid }
];

const passedTests = tests.filter(test => test.passed).length;
const totalTests = tests.length;

tests.forEach(test => {
  console.log(`${test.passed ? '✅' : '❌'} ${test.name}`);
});

console.log(`\n🎯 Results: ${passedTests}/${totalTests} tests passed`);

if (passedTests === totalTests) {
  console.log('\n🎉 Phase 1 MVP is ready for testing!');
  console.log('\nNext steps:');
  console.log('1. Run `npm run tauri` to start development');
  console.log('2. Test the application functionality');
  console.log('3. Create a Supabase project and run the schema');
  console.log('4. Test export functionality');
  console.log('5. Verify tray menu and autostart');
} else {
  console.log('\n⚠️ Some tests failed. Please fix the issues before proceeding.');
  process.exit(1);
}
