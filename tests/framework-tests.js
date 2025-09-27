#!/usr/bin/env node

/**
 * Comprehensive test suite for URL Protocol Handler Framework
 */

const assert = require('assert');
const http = require('http');
const { URL } = require('url');

// Import framework components
const { 
  ProtocolHandler, 
  ServerFramework, 
  ElectronFramework,
  GitHubAuthProvider,
  createApp,
  createBasicApp 
} = require('../framework');

const { parseProtocolUrl, buildProtocolUrl, validateProtocolScheme } = require('../framework/utils');

// Test results tracking
const testResults = {
  passed: 0,
  failed: 0,
  errors: []
};

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(message, color = colors.reset) {
  console.log(color + message + colors.reset);
}

function test(name, testFn) {
  try {
    log(`\n🧪 Testing: ${name}`, colors.blue);
    testFn();
    log(`✅ PASS: ${name}`, colors.green);
    testResults.passed++;
  } catch (error) {
    log(`❌ FAIL: ${name}`, colors.red);
    log(`   Error: ${error.message}`, colors.red);
    testResults.failed++;
    testResults.errors.push({ test: name, error: error.message });
  }
}

async function asyncTest(name, testFn) {
  try {
    log(`\n🧪 Testing: ${name}`, colors.blue);
    await testFn();
    log(`✅ PASS: ${name}`, colors.green);
    testResults.passed++;
  } catch (error) {
    log(`❌ FAIL: ${name}`, colors.red);
    log(`   Error: ${error.message}`, colors.red);
    testResults.failed++;
    testResults.errors.push({ test: name, error: error.message });
  }
}

// Utility function to make HTTP requests
function makeRequest(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: data
        });
      });
    }).on('error', reject);
  });
}

// Test Protocol Handler Core
function testProtocolHandler() {
  log('\n📋 Testing Protocol Handler Core', colors.blue);
  log('=' .repeat(50), colors.blue);
  
  test('ProtocolHandler - Basic instantiation', () => {
    const handler = new ProtocolHandler({ protocol: 'testapp' });
    assert(handler instanceof ProtocolHandler);
    assert.equal(handler.config.protocol, 'testapp');
  });
  
  test('ProtocolHandler - Route registration', () => {
    const handler = new ProtocolHandler();
    let routeCalled = false;
    
    handler.route('/test/route', (context) => {
      routeCalled = true;
    });
    
    assert(handler.routeHandlers.has('/test/route'));
  });
  
  asyncTest('ProtocolHandler - URL handling', async () => {
    const handler = new ProtocolHandler();
    let contextReceived = null;
    
    handler.route('/test/basic', (context) => {
      contextReceived = context;
    });
    
    await handler.handleProtocolUrl('myapp://test/basic?param=value');
    
    assert(contextReceived !== null);
    assert.equal(contextReceived.hostname, 'test');
    assert.equal(contextReceived.pathname, '/basic');
    assert.equal(contextReceived.searchParams.get('param'), 'value');
  });
  
  test('ProtocolHandler - Session management', () => {
    const handler = new ProtocolHandler();
    
    const session = handler.createSession({ test: 'data' });
    assert(session.id);
    assert.equal(session.test, 'data');
    assert.equal(session.status, 'pending');
    
    const retrieved = handler.getSession(session.id);
    assert.deepEqual(session, retrieved);
    
    handler.updateSession(session.id, { status: 'completed' });
    const updated = handler.getSession(session.id);
    assert.equal(updated.status, 'completed');
  });
  
  test('ProtocolHandler - Pattern matching', () => {
    const handler = new ProtocolHandler();
    
    assert(handler.matchRoute('/test/basic', '/test/basic'));
    assert(handler.matchRoute('/test/*', '/test/anything'));
    assert(!handler.matchRoute('/test/basic', '/other/basic'));
  });
}

// Test Server Framework
function testServerFramework() {
  log('\n🌐 Testing Server Framework', colors.blue);
  log('=' .repeat(50), colors.blue);
  
  test('ServerFramework - Basic instantiation', () => {
    const server = new ServerFramework({ port: 3001 });
    assert(server instanceof ServerFramework);
    assert.equal(server.config.port, 3001);
    assert(server.app);
  });
  
  test('ServerFramework - Route registration', () => {
    const server = new ServerFramework();
    
    server.get('/test', (req, res) => {
      res.json({ test: 'success' });
    });
    
    server.post('/test', (req, res) => {
      res.json({ method: 'POST' });
    });
    
    // Routes are added to Express app, no direct way to verify without starting server
    assert(server.app);
  });
  
  asyncTest('ServerFramework - Server startup and basic routes', async () => {
    const server = new ServerFramework({ port: 3002 });
    
    server.get('/test-endpoint', (req, res) => {
      res.json({ message: 'test successful', timestamp: Date.now() });
    });
    
    const result = await server.start(3002);
    assert(result.server);
    assert.equal(result.port, 3002);
    
    // Test health endpoint
    const healthResponse = await makeRequest('http://localhost:3002/health');
    assert.equal(healthResponse.statusCode, 200);
    
    const healthData = JSON.parse(healthResponse.data);
    assert.equal(healthData.status, 'OK');
    
    // Test custom endpoint
    const testResponse = await makeRequest('http://localhost:3002/test-endpoint');
    assert.equal(testResponse.statusCode, 200);
    
    const testData = JSON.parse(testResponse.data);
    assert.equal(testData.message, 'test successful');
    
    await server.stop();
  });
}

// Test Utilities
function testUtilities() {
  log('\n🔧 Testing Utilities', colors.blue);
  log('=' .repeat(50), colors.blue);
  
  test('parseProtocolUrl - Valid URL', () => {
    const result = parseProtocolUrl('myapp://auth/callback?token=123&user=test');
    
    assert(result.isValid);
    assert.equal(result.protocol, 'myapp');
    assert.equal(result.hostname, 'auth');
    assert.equal(result.pathname, '/callback');
    assert.equal(result.searchParams.token, '123');
    assert.equal(result.searchParams.user, 'test');
  });
  
  test('parseProtocolUrl - Invalid URL', () => {
    const result = parseProtocolUrl('invalid-url');
    
    assert(!result.isValid);
    assert(result.error);
  });
  
  test('buildProtocolUrl - Basic construction', () => {
    const url = buildProtocolUrl('myapp', 'test', '/basic', { param: 'value' });
    assert.equal(url, 'myapp://test/basic?param=value');
  });
  
  test('validateProtocolScheme - Valid schemes', () => {
    assert(validateProtocolScheme('myapp'));
    assert(validateProtocolScheme('test-app'));
    assert(validateProtocolScheme('app123'));
    assert(validateProtocolScheme('my.app'));
  });
  
  test('validateProtocolScheme - Invalid schemes', () => {
    assert(!validateProtocolScheme('123app')); // Can't start with number
    assert(!validateProtocolScheme('my app')); // No spaces
    assert(!validateProtocolScheme('my@app')); // Invalid character
  });
}

// Test Framework Integration
function testFrameworkIntegration() {
  log('\n🔄 Testing Framework Integration', colors.blue);
  log('=' .repeat(50), colors.blue);
  
  test('createBasicApp - App creation', () => {
    const app = createBasicApp('testapp', { port: 3003 });
    
    assert(app.protocolHandler);
    assert(app.server);
    assert(app.electron);
    assert.equal(app.protocolHandler.config.protocol, 'testapp');
  });
  
  test('createApp - Custom configuration', () => {
    const app = createApp({
      protocol: 'customapp',
      server: { port: 3004 },
      electron: { window: { width: 800 } }
    });
    
    assert.equal(app.protocolHandler.config.protocol, 'customapp');
    assert.equal(app.server.config.port, 3004);
    assert.equal(app.electron.config.window.width, 800);
  });
  
  asyncTest('Framework app - Protocol and server integration', async () => {
    const app = createBasicApp('integrationtest', { port: 3005 });
    
    let protocolReceived = false;
    app.protocolHandler.on('test-basic', () => {
      protocolReceived = true;
    });
    
    // Start server (electron won't start in test environment)
    const result = await app.server.start(3005);
    assert(result.server);
    
    // Test protocol handling
    await app.protocolHandler.handleProtocolUrl('integrationtest://test/basic');
    assert(protocolReceived);
    
    // Test server endpoints
    const response = await makeRequest('http://localhost:3005/health');
    assert.equal(response.statusCode, 200);
    
    await app.server.stop();
  });
}

// Test GitHub Auth Provider
function testGitHubAuthProvider() {
  log('\n🔐 Testing GitHub Auth Provider', colors.blue);
  log('=' .repeat(50), colors.blue);
  
  test('GitHubAuthProvider - Basic instantiation', () => {
    const auth = new GitHubAuthProvider({
      clientID: 'test_id',
      clientSecret: 'test_secret',
      protocol: 'testapp'
    });
    
    assert(auth instanceof GitHubAuthProvider);
    assert.equal(auth.config.clientID, 'test_id');
    assert.equal(auth.config.protocol, 'testapp');
  });
  
  test('GitHubAuthProvider - Protocol URL building', () => {
    const auth = new GitHubAuthProvider({ protocol: 'testapp' });
    
    const user = {
      id: '123',
      username: 'testuser',
      email: 'test@example.com',
      displayName: 'Test User',
      avatar: 'https://example.com/avatar.png',
      accessToken: 'token123'
    };
    
    const url = auth.buildProtocolUrl('session123', user);
    
    assert(url.startsWith('testapp://auth/callback'));
    assert(url.includes('token=token123'));
    assert(url.includes('session_id=session123'));
  });
  
  test('GitHubAuthProvider - Session status', () => {
    const auth = new GitHubAuthProvider();
    
    // Test non-existent session
    const notFound = auth.getSessionStatus('nonexistent');
    assert.equal(notFound.status, 'not_found');
    
    // Test existing session
    const sessionId = 'test_session';
    auth.activeSessions.set(sessionId, {
      id: sessionId,
      status: 'completed',
      timestamp: Date.now(),
      user: { id: '123', username: 'testuser' }
    });
    
    const status = auth.getSessionStatus(sessionId);
    assert.equal(status.status, 'completed');
    assert.equal(status.sessionId, sessionId);
    assert(status.user);
  });
}

// Test snapshot creation
async function createTestSnapshot() {
  log('\n📸 Creating Test Snapshot', colors.blue);
  log('=' .repeat(50), colors.blue);
  
  try {
    const fs = require('fs');
    const path = require('path');
    
    const snapshotDir = path.join(__dirname, '../test-snapshots');
    if (!fs.existsSync(snapshotDir)) {
      fs.mkdirSync(snapshotDir, { recursive: true });
    }
    
    // Create framework structure snapshot
    const frameworkStructure = {
      timestamp: new Date().toISOString(),
      framework: {
        core: ['ProtocolHandler.js'],
        server: ['ServerFramework.js'],
        electron: ['ElectronFramework.js'],
        auth: ['GitHubAuthProvider.js'],
        utils: ['index.js'],
        main: ['index.js']
      },
      examples: {
        'basic-app': {
          files: ['main.js'],
          web: ['index.html']
        }
      },
      tests: ['framework-tests.js'],
      testResults: testResults
    };
    
    fs.writeFileSync(
      path.join(snapshotDir, 'framework-structure.json'),
      JSON.stringify(frameworkStructure, null, 2)
    );
    
    // Create test results snapshot
    const testSnapshot = {
      timestamp: new Date().toISOString(),
      summary: {
        total: testResults.passed + testResults.failed,
        passed: testResults.passed,
        failed: testResults.failed,
        successRate: `${Math.round((testResults.passed / (testResults.passed + testResults.failed)) * 100)}%`
      },
      errors: testResults.errors,
      components: [
        'ProtocolHandler Core',
        'ServerFramework',
        'Utilities',
        'Framework Integration',
        'GitHub Auth Provider'
      ]
    };
    
    fs.writeFileSync(
      path.join(snapshotDir, 'test-results.json'),
      JSON.stringify(testSnapshot, null, 2)
    );
    
    log(`✅ Test snapshots created in: ${snapshotDir}`, colors.green);
    
  } catch (error) {
    log(`❌ Failed to create snapshots: ${error.message}`, colors.red);
  }
}

// Main test runner
async function runTests() {
  log('🧪 URL Protocol Handler Framework - Test Suite', colors.blue);
  log('=' .repeat(60), colors.blue);
  
  // Run all tests
  testProtocolHandler();
  testServerFramework();
  testUtilities();
  testFrameworkIntegration();
  testGitHubAuthProvider();
  
  // Create test snapshots
  await createTestSnapshot();
  
  // Summary
  log('\n📊 Test Summary', colors.blue);
  log('=' .repeat(50), colors.blue);
  
  const total = testResults.passed + testResults.failed;
  const successRate = total > 0 ? Math.round((testResults.passed / total) * 100) : 0;
  
  log(`Total Tests: ${total}`);
  log(`Passed: ${testResults.passed}`, colors.green);
  log(`Failed: ${testResults.failed}`, testResults.failed > 0 ? colors.red : colors.green);
  log(`Success Rate: ${successRate}%`, successRate >= 90 ? colors.green : colors.yellow);
  
  if (testResults.errors.length > 0) {
    log('\n❌ Failed Tests:', colors.red);
    testResults.errors.forEach(error => {
      log(`  • ${error.test}: ${error.error}`, colors.red);
    });
  }
  
  log(`\n${testResults.failed === 0 ? '✅ All tests passed!' : '⚠️  Some tests failed'}`, 
      testResults.failed === 0 ? colors.green : colors.yellow);
  
  process.exit(testResults.failed === 0 ? 0 : 1);
}

// Run tests if called directly
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { runTests, testResults };