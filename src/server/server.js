const express = require('express');
const cors = require('cors');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const session = require('express-session');
const passport = require('passport');
const GitHubStrategy = require('passport-github2').Strategy;
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Store active sessions (in production, use Redis or database)
const activeSessions = new Map();

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'demo-secret-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    maxAge: 30 * 60 * 1000, // 30 minutes
    secure: false // Set to true in production with HTTPS
  }
}));

// Passport configuration
passport.use(new GitHubStrategy({
  clientID: process.env.GITHUB_CLIENT_ID || 'demo_client_id',
  clientSecret: process.env.GITHUB_CLIENT_SECRET || 'demo_client_secret',
  callbackURL: `http://localhost:${port}/auth/github/callback`
}, (accessToken, refreshToken, profile, done) => {
  // Store user data and token
  const user = {
    id: profile.id,
    username: profile.username,
    email: profile.emails?.[0]?.value,
    avatar: profile.photos?.[0]?.value,
    displayName: profile.displayName,
    accessToken: accessToken
  };
  return done(null, user);
}));

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

app.use(passport.initialize());
app.use(passport.session());

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
  
  // Store session ID for GitHub OAuth flow
  req.session.authSessionId = sessionId;
  
  // Redirect to GitHub OAuth
  const authUrl = `/auth/github?state=${state}`;
  res.json({ 
    authUrl: `http://localhost:${port}${authUrl}`,
    sessionId 
  });
});

// GitHub authentication routes
app.get('/auth/github', 
  passport.authenticate('github', { scope: ['user:email', 'repo'] })
);

app.get('/auth/github/callback',
  passport.authenticate('github', { failureRedirect: '/auth/error' }),
  (req, res) => {
    // Success - redirect to custom protocol
    const user = req.user;
    const sessionId = req.session.authSessionId || uuidv4();
    
    // Store session for desktop app polling
    activeSessions.set(sessionId, {
      user: user,
      authenticated: true,
      timestamp: Date.now(),
      status: 'completed',
      token: user.accessToken
    });
    
    // For demo purposes, we'll still show GitHub info but with real data
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>GitHub Authentication Successful</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 500px; margin: 50px auto; padding: 20px; }
          .success { background: #d4edda; color: #155724; padding: 20px; border-radius: 5px; margin: 20px 0; }
          .user-info { background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 10px 0; }
          .avatar { width: 50px; height: 50px; border-radius: 50%; margin-right: 10px; vertical-align: middle; }
          button { background: #007cba; color: white; border: none; padding: 10px 20px; cursor: pointer; margin: 5px; }
          button:hover { background: #005a87; }
        </style>
      </head>
      <body>
        <div class="success">
          <h3>🎉 GitHub Authentication Successful!</h3>
          <p>You have successfully authenticated with GitHub. The desktop app should now receive your authentication data.</p>
        </div>
        
        <div class="user-info">
          <h4>Authenticated User:</h4>
          ${user.avatar ? `<img src="${user.avatar}" alt="Avatar" class="avatar">` : ''}
          <p><strong>Username:</strong> ${user.username}</p>
          <p><strong>Display Name:</strong> ${user.displayName || 'Not provided'}</p>
          <p><strong>Email:</strong> ${user.email || 'Not public'}</p>
          <p><strong>GitHub ID:</strong> ${user.id}</p>
          <p><strong>Session ID:</strong> ${sessionId}</p>
        </div>
        
        <button onclick="redirectToApp()">Return to Desktop App</button>
        <button onclick="testGitHubAPI()">Test GitHub API</button>
        
        <script>
          function redirectToApp() {
            const callbackUrl = 'myapp://auth/callback?token=' + encodeURIComponent('${user.accessToken}') + 
                               '&user=' + encodeURIComponent(JSON.stringify({
                                 id: '${user.id}',
                                 username: '${user.username}',
                                 email: '${user.email || ''}',
                                 displayName: '${user.displayName || ''}',
                                 avatar: '${user.avatar || ''}'
                               })) + 
                               '&session_id=${sessionId}';
            
            alert('Redirecting back to desktop app...');
            window.location.href = callbackUrl;
          }
          
          async function testGitHubAPI() {
            try {
              const response = await fetch('https://api.github.com/user', {
                headers: {
                  'Authorization': 'token ${user.accessToken}',
                  'Accept': 'application/vnd.github.v3+json'
                }
              });
              const userData = await response.json();
              alert('GitHub API Test Successful!\\n\\nUser: ' + userData.login + '\\nPublic Repos: ' + userData.public_repos);
            } catch (error) {
              alert('GitHub API Test Failed: ' + error.message);
            }
          }
          
          // Auto-redirect after 5 seconds
          setTimeout(redirectToApp, 5000);
        </script>
      </body>
      </html>
    `);
  }
);

app.get('/auth/error', (req, res) => {
  res.send(`
    <h1>Authentication Error</h1>
    <p>GitHub authentication failed. Please try again.</p>
    <p><a href="/auth/start">Try Again</a></p>
  `);
});

// New endpoint for GitHub API testing
app.get('/api/github/user', (req, res) => {
  if (!req.user || !req.user.accessToken) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  res.json({
    user: req.user,
    token: req.user.accessToken
  });
});

// Logout endpoint
app.get('/auth/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ error: 'Logout failed' });
    }
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: 'Session cleanup failed' });
      }
      res.json({ success: true, message: 'Logged out successfully' });
    });
  });
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