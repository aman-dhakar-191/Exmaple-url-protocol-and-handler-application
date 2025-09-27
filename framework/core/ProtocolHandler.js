/**
 * Core Protocol Handler Framework
 * Provides the foundation for URL protocol handling applications
 */

const { EventEmitter } = require('events');
const { URL } = require('url');

class ProtocolHandler extends EventEmitter {
  constructor(config = {}) {
    super();
    
    this.config = {
      protocol: 'myapp',
      routes: new Map(),
      middleware: [],
      sessionManager: null,
      ...config
    };
    
    this.activeSessions = new Map();
    this.routeHandlers = new Map();
    
    this.setupDefaultRoutes();
  }
  
  /**
   * Register a route handler for protocol URLs
   * @param {string} pattern - Route pattern (e.g., 'auth/callback', 'test/*')
   * @param {function} handler - Handler function
   */
  route(pattern, handler) {
    this.routeHandlers.set(pattern, handler);
    return this;
  }
  
  /**
   * Add middleware to be executed before route handlers
   * @param {function} middleware - Middleware function
   */
  use(middleware) {
    this.config.middleware.push(middleware);
    return this;
  }
  
  /**
   * Handle incoming protocol URL
   * @param {string} url - The protocol URL to handle
   */
  async handleProtocolUrl(url) {
    try {
      const urlObj = new URL(url);
      const context = this.createContext(urlObj);
      
      // Run middleware chain
      await this.runMiddleware(context);
      
      // Find and execute route handler
      const handler = this.findRouteHandler(context.pathname);
      if (handler) {
        await handler(context);
      } else {
        this.emit('unhandled-route', context);
      }
      
      this.emit('url-handled', context);
    } catch (error) {
      this.emit('error', error, url);
    }
  }
  
  /**
   * Create context object for route handlers
   * @param {URL} urlObj - Parsed URL object
   */
  createContext(urlObj) {
    return {
      protocol: urlObj.protocol,
      hostname: urlObj.hostname,
      pathname: urlObj.pathname,
      searchParams: urlObj.searchParams,
      params: {},
      url: urlObj.href,
      timestamp: Date.now(),
      sessionId: urlObj.searchParams.get('session_id') || null
    };
  }
  
  /**
   * Run middleware chain
   * @param {object} context - Request context
   */
  async runMiddleware(context) {
    for (const middleware of this.config.middleware) {
      await middleware(context);
    }
  }
  
  /**
   * Find route handler for given pathname
   * @param {string} pathname - URL pathname
   */
  findRouteHandler(pathname) {
    // Exact match first
    if (this.routeHandlers.has(pathname)) {
      return this.routeHandlers.get(pathname);
    }
    
    // Pattern matching
    for (const [pattern, handler] of this.routeHandlers) {
      if (this.matchRoute(pattern, pathname)) {
        return handler;
      }
    }
    
    return null;
  }
  
  /**
   * Match route pattern against pathname
   * @param {string} pattern - Route pattern
   * @param {string} pathname - URL pathname
   */
  matchRoute(pattern, pathname) {
    // Convert pattern to regex
    const regexPattern = pattern
      .replace(/\*/g, '.*')
      .replace(/:[^/]+/g, '([^/]+)');
    
    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(pathname);
  }
  
  /**
   * Setup default routes
   */
  setupDefaultRoutes() {
    // Default test route
    this.route('/test/basic', (context) => {
      this.emit('test-basic', context);
    });
    
    // Default auth callback route
    this.route('/auth/callback', (context) => {
      this.emit('auth-callback', context);
    });
  }
  
  /**
   * Create a new session
   * @param {object} data - Session data
   */
  createSession(data = {}) {
    const sessionId = require('uuid').v4();
    const session = {
      id: sessionId,
      ...data,
      createdAt: Date.now(),
      status: 'pending'
    };
    
    this.activeSessions.set(sessionId, session);
    return session;
  }
  
  /**
   * Get session by ID
   * @param {string} sessionId - Session ID
   */
  getSession(sessionId) {
    return this.activeSessions.get(sessionId);
  }
  
  /**
   * Update session
   * @param {string} sessionId - Session ID
   * @param {object} updates - Updates to apply
   */
  updateSession(sessionId, updates) {
    const session = this.activeSessions.get(sessionId);
    if (session) {
      Object.assign(session, updates);
      this.emit('session-updated', session);
    }
    return session;
  }
  
  /**
   * Clean up expired sessions
   * @param {number} maxAge - Maximum age in milliseconds
   */
  cleanupSessions(maxAge = 30 * 60 * 1000) {
    const now = Date.now();
    for (const [sessionId, session] of this.activeSessions) {
      if (now - session.createdAt > maxAge) {
        this.activeSessions.delete(sessionId);
        this.emit('session-expired', session);
      }
    }
  }
}

module.exports = ProtocolHandler;