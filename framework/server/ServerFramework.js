/**
 * Server Framework for URL Protocol Handler
 * Provides Express.js server with configurable routes and middleware
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const session = require('express-session');

class ServerFramework {
  constructor(config = {}) {
    this.config = {
      port: 3000,
      host: 'localhost',
      staticPath: null,
      sessionConfig: {
        secret: 'change-me-in-production',
        resave: false,
        saveUninitialized: false,
        cookie: { maxAge: 30 * 60 * 1000 }
      },
      corsEnabled: true,
      ...config
    };
    
    this.app = express();
    this.server = null;
    this.middleware = [];
    this.routes = new Map();
    this.authProviders = new Map();
    
    this.setupBasicMiddleware();
  }
  
  /**
   * Setup basic middleware
   */
  setupBasicMiddleware() {
    // CORS if enabled
    if (this.config.corsEnabled) {
      this.app.use(cors());
    }
    
    // JSON parsing
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
    
    // Session handling
    this.app.use(session(this.config.sessionConfig));
    
    // Static files if configured
    if (this.config.staticPath) {
      this.app.use(express.static(this.config.staticPath));
    }
  }
  
  /**
   * Add custom middleware
   * @param {function} middleware - Express middleware function
   */
  use(middleware) {
    this.app.use(middleware);
    return this;
  }
  
  /**
   * Register a route handler
   * @param {string} method - HTTP method
   * @param {string} path - Route path
   * @param {function} handler - Route handler
   */
  route(method, path, handler) {
    this.app[method.toLowerCase()](path, handler);
    return this;
  }
  
  /**
   * Register GET route
   * @param {string} path - Route path
   * @param {function} handler - Route handler
   */
  get(path, handler) {
    return this.route('GET', path, handler);
  }
  
  /**
   * Register POST route
   * @param {string} path - Route path
   * @param {function} handler - Route handler
   */
  post(path, handler) {
    return this.route('POST', path, handler);
  }
  
  /**
   * Register authentication provider
   * @param {string} name - Provider name (e.g., 'github', 'google')
   * @param {object} authProvider - Authentication provider instance
   */
  registerAuthProvider(name, authProvider) {
    this.authProviders.set(name, authProvider);
    
    // Setup routes for this provider
    this.setupAuthRoutes(name, authProvider);
    return this;
  }
  
  /**
   * Setup authentication routes for a provider
   * @param {string} name - Provider name
   * @param {object} authProvider - Authentication provider
   */
  setupAuthRoutes(name, authProvider) {
    // Start auth flow
    this.get(`/auth/${name}`, authProvider.authenticate());
    
    // Auth callback
    this.get(`/auth/${name}/callback`, authProvider.callback());
    
    // Auth status check
    this.get(`/auth/${name}/status/:sessionId`, (req, res) => {
      const sessionId = req.params.sessionId;
      const status = authProvider.getSessionStatus(sessionId);
      res.json(status);
    });
  }
  
  /**
   * Setup default routes
   */
  setupDefaultRoutes() {
    // Health check
    this.get('/health', (req, res) => {
      res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
      });
    });
    
    // Home route
    this.get('/', (req, res) => {
      if (this.config.staticPath) {
        res.sendFile(path.join(this.config.staticPath, 'index.html'));
      } else {
        res.json({ 
          message: 'URL Protocol Handler Server',
          version: '1.0.0'
        });
      }
    });
    
    // Session management
    this.get('/session/create', (req, res) => {
      const sessionId = require('uuid').v4();
      req.session.protocolSessionId = sessionId;
      res.json({ sessionId });
    });
    
    this.get('/session/status/:sessionId', (req, res) => {
      // This should be implemented by the application
      res.json({ 
        sessionId: req.params.sessionId,
        status: 'unknown'
      });
    });
  }
  
  /**
   * Start the server
   * @param {number} port - Port to start on (optional)
   * @returns {Promise} Server instance and actual port
   */
  async start(port = null) {
    const targetPort = port || this.config.port;
    
    this.setupDefaultRoutes();
    
    return new Promise((resolve, reject) => {
      this.startWithPortFallback(targetPort)
        .then(({ server, port: actualPort }) => {
          this.server = server;
          this.config.port = actualPort;
          resolve({ server, port: actualPort });
        })
        .catch(reject);
    });
  }
  
  /**
   * Start server with port fallback
   * @param {number} startPort - Initial port to try
   * @param {number} maxAttempts - Maximum attempts
   */
  startWithPortFallback(startPort = 3000, maxAttempts = 5) {
    return new Promise((resolve, reject) => {
      let currentPort = startPort;
      let attempts = 0;
      
      const tryPort = () => {
        const server = this.app.listen(currentPort, this.config.host, () => {
          console.log(`✅ Server started on http://${this.config.host}:${currentPort}`);
          resolve({ server, port: currentPort });
        });
        
        server.on('error', (err) => {
          if (err.code === 'EADDRINUSE' && attempts < maxAttempts) {
            attempts++;
            currentPort++;
            console.log(`Port ${currentPort - 1} busy, trying ${currentPort}...`);
            tryPort();
          } else {
            reject(err);
          }
        });
      };
      
      tryPort();
    });
  }
  
  /**
   * Stop the server
   */
  async stop() {
    if (this.server) {
      return new Promise((resolve) => {
        this.server.close(() => {
          console.log('Server stopped');
          resolve();
        });
      });
    }
  }
  
  /**
   * Get Express app instance
   */
  getApp() {
    return this.app;
  }
  
  /**
   * Get server configuration
   */
  getConfig() {
    return this.config;
  }
}

module.exports = ServerFramework;