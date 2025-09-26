#!/usr/bin/env node

/**
 * Functionality test script for URL Protocol Handler Application
 * Tests server endpoints and validates configuration
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function makeRequest(options) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data, headers: res.headers }));
    });
    req.on('error', reject);
    req.end();
  });
}

async function testServer() {
  log('\n🧪 Testing Server Functionality', colors.blue);
  log('=' .repeat(50), colors.blue);

  const tests = [
    {
      name: 'Health Check',
      path: '/health',
      expectedStatus: 200,
      expectedContent: '"status":"OK"'
    },
    {
      name: 'Home Page',
      path: '/',
      expectedStatus: 200,
      expectedContent: 'URL Protocol Handler Demo'
    },
    {
      name: 'Auth Start',
      path: '/auth/start',
      expectedStatus: 200,
      expectedContent: '"authUrl"'
    }
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      const response = await makeRequest({
        hostname: 'localhost',
        port: 3000,
        path: test.path,
        method: 'GET'
      });

      if (response.status === test.expectedStatus && response.data.includes(test.expectedContent)) {
        log(`✅ ${test.name}: PASSED`, colors.green);
        passed++;
      } else {
        log(`❌ ${test.name}: FAILED - Status: ${response.status}, Expected: ${test.expectedStatus}`, colors.red);
        failed++;
      }
    } catch (error) {
      log(`❌ ${test.name}: FAILED - ${error.message}`, colors.red);
      failed++;
    }
  }

  return { passed, failed };
}

function validateProjectStructure() {
  log('\n📁 Validating Project Structure', colors.blue);
  log('=' .repeat(50), colors.blue);

  const requiredFiles = [
    'package.json',
    'src/server/server.js',
    'src/electron/main.js',
    'src/web/index.html',
    'README.md'
  ];

  let passed = 0;
  let failed = 0;

  for (const file of requiredFiles) {
    if (fs.existsSync(path.join(__dirname, file))) {
      log(`✅ ${file}: EXISTS`, colors.green);
      passed++;
    } else {
      log(`❌ ${file}: MISSING`, colors.red);
      failed++;
    }
  }

  return { passed, failed };
}

function validatePackageJson() {
  log('\n📦 Validating package.json Configuration', colors.blue);
  log('=' .repeat(50), colors.blue);

  try {
    const pkg = require('./package.json');
    const tests = [
      { name: 'Name', check: () => pkg.name === 'url-protocol-handler-app' },
      { name: 'Main Entry', check: () => pkg.main === 'src/electron/main.js' },
      { name: 'Protocol Scheme', check: () => pkg.build?.protocols?.schemes?.includes('myapp') },
      { name: 'Start Script', check: () => pkg.scripts?.start === 'electron .' },
      { name: 'Dev Script', check: () => pkg.scripts?.dev?.includes('concurrently') },
      { name: 'Server Script', check: () => pkg.scripts?.server === 'node src/server/server.js' },
      { name: 'Build Script', check: () => pkg.scripts?.build === 'electron-builder' },
      { name: 'Electron Dependency', check: () => pkg.devDependencies?.electron },
      { name: 'Express Dependency', check: () => pkg.dependencies?.express }
    ];

    let passed = 0;
    let failed = 0;

    for (const test of tests) {
      if (test.check()) {
        log(`✅ ${test.name}: VALID`, colors.green);
        passed++;
      } else {
        log(`❌ ${test.name}: INVALID`, colors.red);
        failed++;
      }
    }

    return { passed, failed };
  } catch (error) {
    log(`❌ Error reading package.json: ${error.message}`, colors.red);
    return { passed: 0, failed: 1 };
  }
}

function checkBuildArtifacts() {
  log('\n🏗️ Checking Build Artifacts', colors.blue);
  log('=' .repeat(50), colors.blue);

  const buildFiles = [
    'dist/linux-unpacked',
    'dist/linux-unpacked/resources/app.asar'
  ];

  let passed = 0;
  let failed = 0;

  for (const file of buildFiles) {
    if (fs.existsSync(path.join(__dirname, file))) {
      log(`✅ ${file}: EXISTS`, colors.green);
      passed++;
    } else {
      log(`⚠️  ${file}: NOT FOUND (run 'npm run build' first)`, colors.yellow);
    }
  }

  return { passed, failed };
}

async function main() {
  log('🔗 URL Protocol Handler Application - Test Suite', colors.blue);
  log('=' .repeat(60), colors.blue);

  const results = {
    structure: validateProjectStructure(),
    package: validatePackageJson(),
    build: checkBuildArtifacts()
  };

  // Test server only if it might be running
  try {
    const serverResults = await testServer();
    results.server = serverResults;
  } catch (error) {
    log('\n⚠️  Server tests skipped (server not running)', colors.yellow);
    log('   Start server with: npm run server', colors.yellow);
    results.server = { passed: 0, failed: 0 };
  }

  // Summary
  log('\n📊 Test Summary', colors.blue);
  log('=' .repeat(50), colors.blue);

  const totalPassed = Object.values(results).reduce((sum, result) => sum + result.passed, 0);
  const totalFailed = Object.values(results).reduce((sum, result) => sum + result.failed, 0);
  const totalTests = totalPassed + totalFailed;

  log(`Total Tests: ${totalTests}`, colors.blue);
  log(`Passed: ${totalPassed}`, colors.green);
  log(`Failed: ${totalFailed}`, totalFailed > 0 ? colors.red : colors.green);

  if (totalFailed === 0) {
    log('\n🎉 All tests passed! Application is ready.', colors.green);
  } else {
    log('\n⚠️  Some tests failed. Please review the issues above.', colors.yellow);
  }

  log('\n📋 Next Steps:', colors.blue);
  log('1. Start server: npm run server', colors.reset);
  log('2. Start app: npm run dev', colors.reset);
  log('3. Build app: npm run build', colors.reset);
  log('4. Test protocol: myapp://test/basic', colors.reset);
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { testServer, validateProjectStructure, validatePackageJson };