# URL Protocol Handler Framework

A comprehensive framework for building desktop applications that handle custom URL protocols with Electron and Node.js.

## 🚀 Features

- **Protocol Handling**: Easy registration and handling of custom URL schemes
- **Server Framework**: Built-in Express.js server with configurable routes
- **Electron Integration**: Seamless desktop application wrapper
- **Authentication Providers**: Pluggable authentication system (GitHub, OAuth, etc.)
- **Session Management**: Secure session handling with cleanup
- **Middleware Support**: Extensible middleware system
- **Configuration-driven**: Easy setup with minimal code

## 📦 Installation

```bash
npm install
```

## 🎯 Quick Start

### Basic Application

```javascript
const { createBasicApp } = require('./framework');

const app = createBasicApp('myapp', {
  port: 3000,
  staticPath: './web'
});

// Add custom protocol routes
app.protocolHandler.route('/custom/route', (context) => {
  console.log('Custom route called:', context);
});

// Start the application
app.start().then(() => {
  console.log('App started successfully!');
});
```

### GitHub Authentication App

```javascript
const { createGitHubApp } = require('./framework');

const app = createGitHubApp('myapp', {
  clientID: 'your_github_client_id',
  clientSecret: 'your_github_client_secret'
}, {
  port: 3000,
  staticPath: './web'
});

// Handle authentication success
app.protocolHandler.on('auth-callback', (context) => {
  const user = JSON.parse(context.searchParams.get('user'));
  console.log('User authenticated:', user.username);
});

app.start();
```

## 🏗️ Framework Architecture

```
framework/
├── core/
│   └── ProtocolHandler.js     # Core protocol handling logic
├── server/
│   └── ServerFramework.js     # Express.js server wrapper
├── electron/
│   └── ElectronFramework.js   # Electron application wrapper
├── auth/
│   └── GitHubAuthProvider.js  # GitHub OAuth provider
├── utils/
│   └── index.js               # Utility functions
└── index.js                   # Main framework entry point
```

## 📋 API Reference

### Core Components

#### ProtocolHandler

Handles custom protocol URLs and routes them to appropriate handlers.

```javascript
const handler = new ProtocolHandler({
  protocol: 'myapp',
  routes: new Map(),
  middleware: []
});

// Register route
handler.route('/test/basic', (context) => {
  console.log('Basic test route called');
});

// Handle protocol URL
handler.handleProtocolUrl('myapp://test/basic?param=value');
```

#### ServerFramework

Provides Express.js server with framework-specific enhancements.

```javascript
const server = new ServerFramework({
  port: 3000,
  host: 'localhost',
  corsEnabled: true
});

// Add routes
server.get('/api/test', (req, res) => {
  res.json({ message: 'Hello from framework!' });
});

// Start server
const result = await server.start();
```

#### ElectronFramework

Wraps Electron application with protocol handling capabilities.

```javascript
const electron = new ElectronFramework({
  protocol: 'myapp',
  window: {
    width: 1200,
    height: 800
  }
});

// Set protocol handler
electron.setProtocolHandler(protocolHandler);
```

### Factory Functions

#### createApp(config)

Creates a fully configured application with all components.

```javascript
const app = createApp({
  protocol: 'myapp',
  server: {
    port: 3000,
    staticPath: './web'
  },
  electron: {
    window: { width: 1000, height: 700 }
  },
  auth: {
    providers: [{
      type: 'github',
      clientID: 'your_client_id',
      clientSecret: 'your_client_secret'
    }]
  }
});
```

#### createBasicApp(protocol, options)

Creates a basic application without authentication.

```javascript
const app = createBasicApp('myapp', {
  port: 3000,
  staticPath: './web',
  window: { width: 800, height: 600 }
});
```

#### createGitHubApp(protocol, githubConfig, options)

Creates an application with GitHub OAuth authentication.

```javascript
const app = createGitHubApp('myapp', {
  clientID: 'github_client_id',
  clientSecret: 'github_client_secret',
  scope: ['user:email']
}, {
  port: 3000,
  staticPath: './web'
});
```

## 🔧 Configuration

### Protocol Configuration

```javascript
{
  protocol: 'myapp',           // Protocol scheme (e.g., myapp://)
  routes: new Map(),           // Route handlers
  middleware: [],              // Middleware functions
  sessionManager: null         // Session manager instance
}
```

### Server Configuration

```javascript
{
  port: 3000,                  // Server port
  host: 'localhost',           // Server host
  staticPath: './web',         // Static files directory
  sessionConfig: {             // Express session config
    secret: 'your-secret',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1800000 }
  },
  corsEnabled: true            // Enable CORS
}
```

### Electron Configuration

```javascript
{
  protocol: 'myapp',           // Protocol scheme
  window: {                    // BrowserWindow options
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  },
  serverUrl: null,             // Server URL (auto-set)
  serverConfig: null,          // Server config
  menu: [],                    // Custom menu items
  isDevelopment: false,        // Development mode
  singleInstance: true         // Single instance enforcement
}
```

## 🧪 Testing

Run the comprehensive test suite:

```bash
node tests/framework-tests.js
```

The test suite covers:
- Protocol Handler Core functionality
- Server Framework capabilities
- Utility functions
- Framework integration
- Authentication providers

Test results and snapshots are saved in the `test-snapshots/` directory.

## 📝 Examples

### Basic Protocol Handler

See `examples/basic-app/` for a complete basic application example.

### GitHub Authentication

The main application demonstrates GitHub OAuth integration with the framework.

## 🔒 Security Considerations

- Always validate protocol URLs before processing
- Use HTTPS in production for authentication flows
- Implement proper session management and cleanup
- Validate and sanitize user input
- Use environment variables for sensitive configuration

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests: `node tests/framework-tests.js`
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details.

## 🆘 Support

For questions, issues, or contributions, please refer to the project repository.