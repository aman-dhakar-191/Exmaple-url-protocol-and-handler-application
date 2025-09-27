/**
 * URL Protocol Handler Framework
 * Main entry point for the framework
 */

const ProtocolHandler = require('./core/ProtocolHandler');
const ServerFramework = require('./server/ServerFramework');
const ElectronFramework = require('./electron/ElectronFramework');
const GitHubAuthProvider = require('./auth/GitHubAuthProvider');

/**
 * Create a new URL Protocol Handler Application
 * @param {object} config - Application configuration
 */
function createApp(config = {}) {
  const appConfig = {
    protocol: 'myapp',
    server: {
      port: 3000,
      host: 'localhost',
      staticPath: null
    },
    electron: {
      window: {
        width: 1200,
        height: 800
      }
    },
    auth: {
      providers: []
    },
    ...config
  };
  
  // Create framework components
  const protocolHandler = new ProtocolHandler({
    protocol: appConfig.protocol,
    ...appConfig.protocolHandler
  });
  
  const server = new ServerFramework({
    ...appConfig.server
  });
  
  const electron = new ElectronFramework({
    protocol: appConfig.protocol,
    serverConfig: appConfig.server,
    ...appConfig.electron
  });
  
  // Wire components together
  electron.setProtocolHandler(protocolHandler);
  electron.setServer(server);
  
  // Setup authentication providers
  if (appConfig.auth && appConfig.auth.providers) {
    appConfig.auth.providers.forEach(providerConfig => {
      if (providerConfig.type === 'github') {
        const githubAuth = new GitHubAuthProvider({
          ...providerConfig,
          protocol: appConfig.protocol
        });
        githubAuth.setProtocolHandler(protocolHandler);
        server.registerAuthProvider('github', githubAuth);
      }
    });
  }
  
  return {
    protocolHandler,
    server,
    electron,
    
    /**
     * Start the application
     */
    async start() {
      console.log('🚀 Starting URL Protocol Handler Application...');
      
      // Start server first
      const serverResult = await server.start();
      console.log(`📡 Server started on port ${serverResult.port}`);
      
      // Update electron config with actual server port
      electron.config.serverUrl = `http://localhost:${serverResult.port}`;
      
      console.log('🖥️  Electron app ready');
      console.log(`🔗 Protocol registered: ${appConfig.protocol}://`);
      
      return {
        server: serverResult,
        protocol: appConfig.protocol
      };
    },
    
    /**
     * Stop the application
     */
    async stop() {
      console.log('🛑 Stopping application...');
      await server.stop();
      console.log('✅ Application stopped');
    }
  };
}

/**
 * Create a basic app with minimal configuration
 * @param {string} protocol - Protocol scheme
 * @param {object} options - Additional options
 */
function createBasicApp(protocol = 'myapp', options = {}) {
  return createApp({
    protocol,
    server: {
      port: options.port || 3000,
      staticPath: options.staticPath || null
    },
    electron: {
      window: options.window || {}
    }
  });
}

/**
 * Create an app with GitHub authentication
 * @param {string} protocol - Protocol scheme
 * @param {object} githubConfig - GitHub OAuth configuration
 * @param {object} options - Additional options
 */
function createGitHubApp(protocol = 'myapp', githubConfig = {}, options = {}) {
  return createApp({
    protocol,
    server: {
      port: options.port || 3000,
      staticPath: options.staticPath || null
    },
    electron: {
      window: options.window || {}
    },
    auth: {
      providers: [{
        type: 'github',
        ...githubConfig
      }]
    }
  });
}

module.exports = {
  createApp,
  createBasicApp,
  createGitHubApp,
  ProtocolHandler,
  ServerFramework,
  ElectronFramework,
  GitHubAuthProvider
};