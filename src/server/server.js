const express = require('express');
const cors = require('cors');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
const port = 3000;

// Store active sessions (in production, use Redis or database)
const activeSessions = new Map();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../web')));

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../web/index.html'));
});

// Start authentication flow
app.get('/auth/start', (req, res) => {
  const sessionId = uuidv4();
  const state = uuidv4();
  
  // Store session info
  activeSessions.set(sessionId, {
    state,
    timestamp: Date.now(),
    status: 'pending'
  });
  
  // In a real app, this would redirect to OAuth provider
  // For demo purposes, we'll redirect to a mock login page
  const authUrl = `/auth/login?session_id=${sessionId}&state=${state}`;
  res.json({ 
    authUrl: `http://localhost:${port}${authUrl}`,
    sessionId 
  });
});

// Mock login page
app.get('/auth/login', (req, res) => {
  const { session_id, state } = req.query;
  const session = activeSessions.get(session_id);
  
  if (!session || session.state !== state) {
    return res.status(400).send('Invalid session or state');
  }
  
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Mock Login</title>
      <style>
        body { font-family: Arial, sans-serif; max-width: 500px; margin: 50px auto; padding: 20px; }
        .form-group { margin: 15px 0; }
        input, button { padding: 10px; width: 100%; box-sizing: border-box; }
        button { background: #007cba; color: white; border: none; cursor: pointer; }
        button:hover { background: #005a87; }
        .info { background: #e7f3ff; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
      </style>
    </head>
    <body>
      <div class="info">
        <h3>🔐 Mock Authentication</h3>
        <p>This is a demonstration of the authentication flow. In a real application, this would be your OAuth provider (Google, GitHub, etc.)</p>
        <p><strong>Session ID:</strong> ${session_id}</p>
      </div>
      
      <h2>Login to Your Account</h2>
      <form id="loginForm">
        <div class="form-group">
          <input type="text" id="username" placeholder="Username" value="demo_user" required>
        </div>
        <div class="form-group">
          <input type="password" id="password" placeholder="Password" value="demo_pass" required>
        </div>
        <div class="form-group">
          <button type="submit">Login & Return to App</button>
        </div>
      </form>
      
      <script>
        document.getElementById('loginForm').addEventListener('submit', async (e) => {
          e.preventDefault();
          const username = document.getElementById('username').value;
          const password = document.getElementById('password').value;
          
          // Simulate authentication
          if (username && password) {
            // In real app, validate credentials
            const token = 'demo_token_' + Math.random().toString(36).substr(2);
            const user = { id: '123', username, email: username + '@example.com' };
            
            // Redirect back to the app using custom protocol
            const callbackUrl = 'myapp://auth/callback?token=' + encodeURIComponent(token) + 
                               '&user=' + encodeURIComponent(JSON.stringify(user)) + 
                               '&session_id=${session_id}';
            
            alert('Authentication successful! Redirecting back to app...');
            window.location.href = callbackUrl;
          } else {
            alert('Please enter username and password');
          }
        });
      </script>
    </body>
    </html>
  `);
});

// Callback endpoint for web-based flow (fallback)
app.get('/auth/callback', (req, res) => {
  const { token, user, session_id } = req.query;
  const session = activeSessions.get(session_id);
  
  if (!session) {
    return res.status(400).send('Invalid session');
  }
  
  // Mark session as completed
  session.status = 'completed';
  session.token = token;
  session.user = JSON.parse(user);
  
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Authentication Complete</title>
      <style>
        body { font-family: Arial, sans-serif; max-width: 500px; margin: 50px auto; padding: 20px; text-align: center; }
        .success { background: #d4edda; color: #155724; padding: 20px; border-radius: 5px; margin: 20px 0; }
      </style>
    </head>
    <body>
      <h2>✅ Authentication Successful</h2>
      <div class="success">
        <p>You have been successfully authenticated!</p>
        <p>You can now close this browser window and return to the desktop application.</p>
      </div>
      <p><strong>Token:</strong> ${token}</p>
      <p><strong>User:</strong> ${user}</p>
    </body>
    </html>
  `);
});

// API endpoint to check session status (for polling)
app.get('/auth/status/:sessionId', (req, res) => {
  const session = activeSessions.get(req.params.sessionId);
  
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }
  
  res.json({
    status: session.status,
    token: session.token,
    user: session.user,
    timestamp: session.timestamp
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Clean up old sessions (run every 5 minutes)
setInterval(() => {
  const now = Date.now();
  const maxAge = 30 * 60 * 1000; // 30 minutes
  
  for (const [sessionId, session] of activeSessions.entries()) {
    if (now - session.timestamp > maxAge) {
      activeSessions.delete(sessionId);
    }
  }
}, 5 * 60 * 1000);

app.listen(port, () => {
  console.log(`🚀 Server running at http://localhost:${port}`);
  console.log(`🔗 Authentication flow available at http://localhost:${port}/auth/start`);
});

module.exports = app;