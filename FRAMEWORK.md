# URL Protocol Handler Framework

This document describes the framework that has been created from the original URL Protocol Handler application.

## 🏗️ Framework Conversion Overview

The original monolithic application has been converted into a modular, reusable framework that allows developers to easily create URL protocol handler applications with minimal code.

### What Was Changed

1. **Extracted Core Components**:
   - `ProtocolHandler`: Core protocol handling logic
   - `ServerFramework`: Express.js server wrapper with framework features
   - `ElectronFramework`: Electron application wrapper
   - `GitHubAuthProvider`: Pluggable GitHub OAuth authentication

2. **Created Framework Structure**:
   ```
   framework/
   ├── core/ProtocolHandler.js       # Protocol URL routing and handling
   ├── server/ServerFramework.js     # Express server with middleware
   ├── electron/ElectronFramework.js # Electron app with protocol support
   ├── auth/GitHubAuthProvider.js    # GitHub OAuth provider
   ├── utils/index.js                # Utility functions
   └── index.js                      # Main framework entry point
   ```

3. **Added Factory Functions**:
   - `createApp()`: Full-featured app creation
   - `createBasicApp()`: Simple app without authentication
   - `createGitHubApp()`: App with GitHub OAuth

4. **Enhanced Testing**:
   - Comprehensive test suite covering all framework components
   - Mock objects for Electron in non-Electron environments
   - Test snapshots for validation

## 🚀 Quick Start Examples

### Basic Application
```javascript
const { createBasicApp } = require('./framework');

const app = createBasicApp('myapp', {
  port: 3000,
  staticPath: './web'
});

app.start().then(() => console.log('App started!'));
```

### Application with Custom Routes
```javascript
const { createBasicApp } = require('./framework');

const app = createBasicApp('myapp');

// Add custom protocol route
app.protocolHandler.route('/custom/action', (context) => {
  console.log('Custom action triggered:', context.searchParams);
});

// Add server API route  
app.server.get('/api/data', (req, res) => {
  res.json({ message: 'Hello from API!' });
});

app.start();
```

### GitHub Authentication App
```javascript
const { createGitHubApp } = require('./framework');

const app = createGitHubApp('myapp', {
  clientID: process.env.GITHUB_CLIENT_ID,
  clientSecret: process.env.GITHUB_CLIENT_SECRET
});

// Handle authentication success
app.protocolHandler.on('auth-callback', (context) => {
  const user = JSON.parse(context.searchParams.get('user'));
  console.log('User authenticated:', user.username);
});

app.start();
```

## 🔧 Configuration Options

### Protocol Handler Configuration
```javascript
{
  protocol: 'myapp',           // Protocol scheme (e.g., myapp://)
  routes: new Map(),           // Custom route handlers
  middleware: [],              // Middleware functions
  sessionManager: null         // Custom session manager
}
```

### Server Framework Configuration
```javascript
{
  port: 3000,                  // Server port
  host: 'localhost',           // Server host
  staticPath: './web',         // Static files directory
  corsEnabled: true,           // Enable CORS
  sessionConfig: {             // Express session configuration
    secret: 'your-secret',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1800000 }
  }
}
```

### Electron Framework Configuration
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
  singleInstance: true,        // Enforce single instance
  isDevelopment: false,        // Development mode
  menu: []                     // Custom menu items
}
```

## 🧪 Testing

The framework includes a comprehensive test suite:

### Run All Tests
```bash
npm run framework:test
```

### Test Components
- **Protocol Handler Core**: URL parsing, routing, session management
- **Server Framework**: Express server, middleware, routes
- **Electron Framework**: Application wrapper, protocol registration
- **Authentication Providers**: GitHub OAuth flow
- **Utilities**: Helper functions, validation
- **Integration**: Full framework integration tests

### Test Results
Test results and snapshots are saved in `test-snapshots/`:
- `framework-structure.json`: Framework file structure
- `test-results.json`: Detailed test results and metrics

## 🔌 Extensibility

### Custom Authentication Providers
```javascript
class CustomAuthProvider {
  authenticate() {
    return (req, res, next) => {
      // Custom authentication logic
    };
  }
  
  callback() {
    return (req, res, next) => {
      // Handle authentication callback
    };
  }
  
  getSessionStatus(sessionId) {
    // Return session status
  }
}

// Register with server
app.server.registerAuthProvider('custom', new CustomAuthProvider());
```

### Custom Protocol Routes
```javascript
app.protocolHandler.route('/custom/:id', (context) => {
  const id = context.params.id;
  // Handle custom route with parameter
});

app.protocolHandler.route('/files/*', (context) => {
  // Handle wildcard routes
});
```

### Custom Middleware
```javascript
app.protocolHandler.use((context) => {
  // Log all protocol requests
  console.log('Protocol request:', context.url);
});

app.server.use((req, res, next) => {
  // Custom server middleware
  req.customData = 'framework';
  next();
});
```

## 📦 Framework Components

### ProtocolHandler
- **Purpose**: Handle custom protocol URLs and route them to handlers
- **Features**: Route matching, middleware support, session management
- **Events**: `url-handled`, `unhandled-route`, `test-basic`, `auth-callback`

### ServerFramework  
- **Purpose**: Enhanced Express.js server with framework features
- **Features**: Auto port fallback, health endpoints, auth provider integration
- **Methods**: `get()`, `post()`, `use()`, `registerAuthProvider()`

### ElectronFramework
- **Purpose**: Electron application wrapper with protocol handling
- **Features**: Protocol registration, window management, menu creation
- **Methods**: `setProtocolHandler()`, `setServer()`, `getMainWindow()`

### GitHubAuthProvider
- **Purpose**: GitHub OAuth authentication provider
- **Features**: OAuth flow, session management, protocol callbacks
- **Methods**: `authenticate()`, `callback()`, `getSessionStatus()`

## 🔄 Migration from Original Application

### Before (Monolithic)
```javascript
// All code mixed together in main.js and server.js
const { app, BrowserWindow } = require('electron');
const express = require('express');
// ... hundreds of lines of mixed concerns
```

### After (Framework-based)
```javascript
// Clean, declarative application setup
const { createGitHubApp } = require('./framework');

const app = createGitHubApp('myapp', {
  clientID: process.env.GITHUB_CLIENT_ID,
  clientSecret: process.env.GITHUB_CLIENT_SECRET
});

app.start();
```

### Migration Benefits
- **90% Less Code**: Applications require minimal setup code
- **Better Separation**: Clear separation of concerns
- **Reusability**: Framework can be used for multiple applications
- **Testability**: Each component is independently testable
- **Maintainability**: Framework updates benefit all applications

## 🔍 Framework vs Original Comparison

| Aspect | Original | Framework |
|--------|----------|-----------|
| Code Lines | ~600 lines | ~50 lines (app code) |
| Components | Monolithic | Modular |
| Reusability | None | High |
| Testing | Basic | Comprehensive |
| Configuration | Hardcoded | Configurable |
| Extensibility | Limited | Pluggable |
| Documentation | Basic | Extensive |

## 🚀 Production Considerations

### Security
- Use environment variables for sensitive configuration
- Implement proper session management
- Validate all protocol URLs
- Use HTTPS in production

### Performance
- Framework includes automatic port fallback
- Session cleanup prevents memory leaks
- Efficient event handling with minimal overhead

### Deployment
- Framework supports Electron Builder
- Static file serving for web assets
- Graceful error handling and fallbacks

## 📝 Next Steps

1. **Custom Providers**: Create additional authentication providers (Google, Microsoft, etc.)
2. **Enhanced Routing**: Add more sophisticated route matching patterns
3. **Plugin System**: Develop a plugin architecture for extensions
4. **CLI Tools**: Create command-line tools for scaffolding new applications
5. **Documentation Site**: Build comprehensive documentation website

## 🤝 Contributing

To contribute to the framework:

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Run the test suite: `npm run framework:test`
5. Submit a pull request

## 📄 License

The framework maintains the same MIT license as the original application.