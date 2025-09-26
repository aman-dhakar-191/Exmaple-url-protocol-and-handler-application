/**
 * GitHub Authentication Provider for URL Protocol Framework
 * Handles GitHub OAuth flow with protocol callback
 */

const fetch = require('node-fetch');
const { v4: uuidv4 } = require('uuid');

class GitHubAuthProvider {
  constructor(config = {}) {
    this.config = {
      clientID: config.clientID || process.env.GITHUB_CLIENT_ID || 'demo_client_id',
      clientSecret: config.clientSecret || process.env.GITHUB_CLIENT_SECRET || 'demo_client_secret',
      callbackURL: null, // Will be set dynamically
      protocol: config.protocol || 'myapp',
      scope: config.scope || ['user:email'],
      ...config
    };
    
    this.activeSessions = new Map();
    this.protocolHandler = null;
    
    this.setupSessionCleanup();
  }
  
  /**
   * Get authentication middleware
   */
  authenticate() {
    return (req, res, next) => {
      // Generate session ID
      const sessionId = uuidv4();
      const state = uuidv4();
      
      // Store session info
      this.activeSessions.set(sessionId, {
        id: sessionId,
        state: state,
        status: 'pending',
        timestamp: Date.now(),
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
      
      // Redirect to GitHub OAuth
      const githubURL = `https://github.com/login/oauth/authorize?client_id=${this.config.clientID}&redirect_uri=${encodeURIComponent(`${req.protocol}://${req.get('host')}/auth/github/callback?session_id=${sessionId}`)}&state=${state}&scope=${this.config.scope.join(',')}`;
      
      res.redirect(githubURL);
    };
  }
  
  /**
   * Get callback middleware
   */
  callback() {
    return async (req, res, next) => {
      const sessionId = req.query.session_id;
      const code = req.query.code;
      const state = req.query.state;
      
      const session = this.activeSessions.get(sessionId);
      
      if (!session) {
        return res.status(400).json({ error: 'Invalid session' });
      }
      
      if (session.state !== state) {
        return res.status(400).json({ error: 'Invalid state' });
      }
      
      try {
        // Exchange code for access token
        const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            client_id: this.config.clientID,
            client_secret: this.config.clientSecret,
            code: code,
            state: state
          })
        });
        
        const tokenData = await tokenResponse.json();
        
        if (tokenData.error) {
          throw new Error(tokenData.error_description || tokenData.error);
        }
        
        // Get user data
        const userResponse = await fetch('https://api.github.com/user', {
          headers: {
            'Authorization': `token ${tokenData.access_token}`,
            'User-Agent': 'URL-Protocol-Framework'
          }
        });
        
        const userData = await userResponse.json();
        
        // Get user email
        const emailResponse = await fetch('https://api.github.com/user/emails', {
          headers: {
            'Authorization': `token ${tokenData.access_token}`,
            'User-Agent': 'URL-Protocol-Framework'
          }
        });
        
        const emailData = await emailResponse.json();
        const primaryEmail = emailData.find(email => email.primary);
        
        const user = {
          id: userData.id.toString(),
          username: userData.login,
          email: primaryEmail ? primaryEmail.email : null,
          avatar: userData.avatar_url,
          displayName: userData.name,
          accessToken: tokenData.access_token
        };
        
        // Update session with user data
        session.status = 'completed';
        session.user = user;
        session.token = user.accessToken;
        
        // Generate protocol URL for desktop app
        const protocolUrl = this.buildProtocolUrl(sessionId, user);
        
        // Send success page with auto-redirect
        res.send(this.buildSuccessPage(user, sessionId, protocolUrl));
        
        // Notify protocol handler if available
        if (this.protocolHandler) {
          this.protocolHandler.handleProtocolUrl(protocolUrl);
        }
        
      } catch (error) {
        console.error('GitHub auth error:', error);
        session.status = 'error';
        session.error = error.message;
        res.status(500).json({ error: 'Authentication failed: ' + error.message });
      }
    };
  }
  
  /**
   * Build protocol URL for callback
   * @param {string} sessionId - Session ID
   * @param {object} user - User data
   */
  buildProtocolUrl(sessionId, user) {
    const params = new URLSearchParams({
      token: user.accessToken,
      user: JSON.stringify({
        id: user.id,
        username: user.username,
        email: user.email,
        displayName: user.displayName,
        avatar: user.avatar
      }),
      session_id: sessionId
    });
    
    return `${this.config.protocol}://auth/callback?${params.toString()}`;
  }
  
  /**
   * Build success page HTML
   * @param {object} user - User data
   * @param {string} sessionId - Session ID
   * @param {string} protocolUrl - Protocol URL
   */
  buildSuccessPage(user, sessionId, protocolUrl) {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Authentication Successful</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 600px;
            margin: 50px auto;
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            color: #333;
          }
          .container {
            background: white;
            border-radius: 10px;
            padding: 30px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            text-align: center;
          }
          .success { color: #22c55e; margin-bottom: 20px; }
          .user-info {
            background: #f8fafc;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
            text-align: left;
          }
          .avatar {
            width: 60px;
            height: 60px;
            border-radius: 50%;
            margin-bottom: 10px;
          }
          button {
            background: #4299e1;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 6px;
            cursor: pointer;
            margin: 10px;
            font-size: 14px;
          }
          button:hover { background: #3182ce; }
          .protocol-link {
            background: #f7fafc;
            padding: 10px;
            border-radius: 4px;
            font-family: monospace;
            font-size: 12px;
            word-break: break-all;
            margin: 10px 0;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="success">
            <h2>🎉 GitHub Authentication Successful!</h2>
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
          
          <div class="protocol-link">
            <strong>Protocol URL:</strong><br>
            ${protocolUrl}
          </div>
          
          <button onclick="redirectToApp()">Return to Desktop App</button>
          <button onclick="testGitHubAPI()">Test GitHub API</button>
          
          <script>
            function redirectToApp() {
              window.location.href = '${protocolUrl}';
              setTimeout(() => {
                window.close();
              }, 1000);
            }
            
            async function testGitHubAPI() {
              try {
                const response = await fetch('https://api.github.com/user', {
                  headers: {
                    'Authorization': 'token ${user.accessToken}'
                  }
                });
                const data = await response.json();
                alert('GitHub API Test Successful!\\n\\nUser: ' + data.login + '\\nPublic Repos: ' + data.public_repos);
              } catch (error) {
                alert('GitHub API Test Failed: ' + error.message);
              }
            }
            
            // Auto-redirect after 3 seconds
            setTimeout(() => {
              redirectToApp();
            }, 3000);
          </script>
        </div>
      </body>
      </html>
    `;
  }
  
  /**
   * Get session status
   * @param {string} sessionId - Session ID
   */
  getSessionStatus(sessionId) {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      return { status: 'not_found' };
    }
    
    return {
      sessionId: session.id,
      status: session.status,
      timestamp: session.timestamp,
      user: session.user ? {
        id: session.user.id,
        username: session.user.username,
        displayName: session.user.displayName
      } : null
    };
  }
  
  /**
   * Set protocol handler
   * @param {object} protocolHandler - Protocol handler instance
   */
  setProtocolHandler(protocolHandler) {
    this.protocolHandler = protocolHandler;
    return this;
  }
  
  /**
   * Setup session cleanup
   */
  setupSessionCleanup() {
    // Clean up old sessions every 5 minutes
    setInterval(() => {
      const now = Date.now();
      const maxAge = 30 * 60 * 1000; // 30 minutes
      
      for (const [sessionId, session] of this.activeSessions.entries()) {
        if (now - session.timestamp > maxAge) {
          this.activeSessions.delete(sessionId);
        }
      }
    }, 5 * 60 * 1000);
  }
  
  /**
   * Get active sessions (for debugging)
   */
  getActiveSessions() {
    return Array.from(this.activeSessions.values());
  }
  
  /**
   * Clear all sessions
   */
  clearSessions() {
    this.activeSessions.clear();
  }
}

module.exports = GitHubAuthProvider;