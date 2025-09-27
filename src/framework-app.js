/**
 * Framework-based version of the original URL Protocol Handler Application
 * This replaces the original implementation using the new framework
 */

const { createGitHubApp } = require('../framework');
const path = require('path');
require('dotenv').config();

// Create app with GitHub authentication
const app = createGitHubApp('myapp', {
  clientID: process.env.GITHUB_CLIENT_ID,
  clientSecret: process.env.GITHUB_CLIENT_SECRET,
  scope: ['user:email']
}, {
  port: process.env.PORT || 3000,
  staticPath: path.join(__dirname, 'web'),
  window: {
    width: 1200,
    height: 800,
    title: 'URL Protocol Handler Demo - Framework Edition'
  }
});

// Add custom middleware for logging
app.server.use((req, res, next) => {
  console.log(`${req.method} ${req.url} - ${req.ip}`);
  next();
});

// Handle GitHub authentication callback
app.protocolHandler.on('auth-callback', (context) => {
  console.log('GitHub authentication callback received:', context);
  
  const token = context.searchParams.get('token');
  const userStr = context.searchParams.get('user');
  const sessionId = context.searchParams.get('session_id');
  
  try {
    const user = JSON.parse(userStr);
    
    // Update the main window with authentication success
    if (app.electron.getMainWindow()) {
      app.electron.getMainWindow().webContents.executeJavaScript(`
        const event = new CustomEvent('protocolAuth', {
          detail: {
            success: true,
            user: ${JSON.stringify(user)},
            token: '${token}',
            sessionId: '${sessionId}'
          }
        });
        window.dispatchEvent(event);
      `);
    }
    
    console.log('User authenticated:', user.username);
  } catch (error) {
    console.error('Error processing auth callback:', error);
  }
});

// Handle basic protocol test
app.protocolHandler.on('test-basic', (context) => {
  console.log('Basic protocol test received');
  
  if (app.electron.getMainWindow()) {
    app.electron.getMainWindow().webContents.executeJavaScript(`
      const event = new CustomEvent('protocolTest', {
        detail: {
          type: 'basic',
          message: 'Basic protocol test successful!'
        }
      });
      window.dispatchEvent(event);
    `);
  }
});

// Add custom routes for compatibility with original app
app.server.get('/auth/login', (req, res) => {
  const sessionId = req.query.session_id || require('uuid').v4();
  
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Mock Login - Framework Demo</title>
      <style>
        body { 
          font-family: Arial, sans-serif; 
          max-width: 500px; 
          margin: 50px auto; 
          padding: 20px; 
          text-align: center;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          min-height: 100vh;
          color: white;
        }
        .container {
          background: white;
          color: #333;
          padding: 30px;
          border-radius: 10px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.2);
        }
        button {
          background: #4299e1;
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 6px;
          cursor: pointer;
          margin: 10px;
        }
        button:hover { background: #3182ce; }
      </style>
    </head>
    <body>
      <div class="container">
        <h2>Framework Demo - Mock Login</h2>
        <p>This is a mock login page for demonstration purposes.</p>
        <p>Session ID: ${sessionId}</p>
        <button onclick="login()">Login as Demo User</button>
        <button onclick="cancel()">Cancel</button>
      </div>
      
      <script>
        function login() {
          const protocolUrl = 'myapp://auth/callback?token=demo_token_123&user=' + 
            encodeURIComponent(JSON.stringify({
              id: '12345',
              username: 'framework_demo_user',
              displayName: 'Framework Demo User',
              email: 'demo@example.com'
            })) + '&session_id=${sessionId}';
          
          window.location.href = protocolUrl;
        }
        
        function cancel() {
          window.close();
        }
      </script>
    </body>
    </html>
  `);
});

// Add session status endpoint
app.server.get('/auth/status/:sessionId', (req, res) => {
  const sessionId = req.params.sessionId;
  const session = app.protocolHandler.getSession(sessionId);
  
  if (session) {
    res.json({
      sessionId: sessionId,
      status: session.status,
      timestamp: session.createdAt,
      user: session.user || null
    });
  } else {
    res.json({
      sessionId: sessionId,
      status: 'not_found'
    });
  }
});

// Start the application
if (require.main === module) {
  app.start().then((result) => {
    console.log('✅ Framework-based app started successfully');
    console.log(`📡 Server: http://localhost:${result.server.port}`);
    console.log(`🔗 Protocol: ${result.protocol}://`);
    console.log('');
    console.log('🧪 Test URLs:');
    console.log(`   ${result.protocol}://test/basic`);
    console.log(`   ${result.protocol}://auth/callback?token=test&user={"name":"test"}`);
    console.log('');
    console.log('🔐 Authentication:');
    console.log('   Click "Login with GitHub" in the app to test GitHub OAuth');
    console.log('   Or visit the mock login page for demo purposes');
  }).catch(error => {
    console.error('❌ Failed to start framework app:', error);
    process.exit(1);
  });
}

module.exports = app;