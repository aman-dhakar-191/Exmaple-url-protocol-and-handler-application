/**
 * Basic Application Example using URL Protocol Handler Framework
 */

const { createBasicApp } = require('../../framework');
const path = require('path');

// Create basic app
const app = createBasicApp('myapp', {
  port: 3000,
  staticPath: path.join(__dirname, 'web'),
  window: {
    width: 1000,
    height: 700,
    title: 'Basic Protocol Handler App'
  }
});

// Add custom protocol routes
app.protocolHandler.route('/test/custom', (context) => {
  console.log('Custom test route called:', context);
  
  // Send message to Electron window
  if (app.electron.getMainWindow()) {
    app.electron.getMainWindow().webContents.executeJavaScript(`
      document.body.innerHTML += '<div style="background: #e6ffed; padding: 10px; margin: 10px; border-radius: 5px;">Custom protocol route called: ${context.pathname}</div>';
    `);
  }
});

// Add server routes
app.server.get('/api/test', (req, res) => {
  res.json({
    message: 'Hello from basic app API!',
    timestamp: new Date().toISOString()
  });
});

// Handle protocol events
app.protocolHandler.on('test-basic', (context) => {
  console.log('Basic test protocol received:', context);
  
  // Send message to Electron window
  if (app.electron.getMainWindow()) {
    app.electron.getMainWindow().webContents.executeJavaScript(`
      document.body.innerHTML += '<div style="background: #fff2e6; padding: 10px; margin: 10px; border-radius: 5px;">Basic test protocol received: myapp://test/basic</div>';
    `);
  }
});

// Handle unhandled routes
app.protocolHandler.on('unhandled-route', (context) => {
  console.log('Unhandled protocol route:', context);
  
  if (app.electron.getMainWindow()) {
    app.electron.getMainWindow().webContents.executeJavaScript(`
      document.body.innerHTML += '<div style="background: #ffe6e6; padding: 10px; margin: 10px; border-radius: 5px;">Unhandled route: ${context.pathname}</div>';
    `);
  }
});

// Start the application
if (require.main === module) {
  app.start().then(() => {
    console.log('✅ Basic app started successfully');
    console.log('🔗 Try these URLs:');
    console.log('   myapp://test/basic');
    console.log('   myapp://test/custom');
    console.log('   myapp://unknown/route');
  }).catch(error => {
    console.error('❌ Failed to start app:', error);
    process.exit(1);
  });
}

module.exports = app;