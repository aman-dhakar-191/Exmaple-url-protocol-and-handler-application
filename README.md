# URL Protocol Handler Application

A complete example application demonstrating URL protocol handling with Node.js and Electron. This application showcases the authentication flow where users can start the process in a desktop app, complete authentication in their browser, and seamlessly return to the desktop application with authentication parameters.

## 🚀 Features

- **Desktop Application**: Built with Electron for cross-platform compatibility
- **Web Server**: Express.js server for handling authentication flow
- **Custom URL Protocol**: `myapp://` protocol handler registration
- **Authentication Flow**: Complete OAuth-like flow with browser redirect
- **Windows Registry Integration**: Automatic protocol registration during installation
- **Session Management**: Secure session handling with timeout
- **Real-time Status Updates**: Polling-based status checking

## 📋 Requirements

- Node.js 16+ 
- npm or yarn
- Windows, macOS, or Linux

## 🛠️ Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd Exmaple-url-protocol-and-handler-application-
```

2. Install dependencies:
```bash
npm install
```

## 🎯 Usage

### Development Mode

1. Start the application in development mode:
```bash
npm run dev
```

This will:
- Start the Express.js server on `http://localhost:3000`
- Launch the Electron desktop application
- Enable hot-reload for development

### Production Build

1. Build the application:
```bash
npm run build
```

2. Create distribution package:
```bash
npm run dist
```

The built application will be in the `dist/` directory.

## 🔄 Authentication Flow

1. **Start Flow**: User clicks "Start Authentication Flow" in the desktop app
2. **Browser Opens**: Default browser opens to the authentication page
3. **User Login**: User enters credentials on the web page
4. **Protocol Redirect**: Browser redirects to `myapp://auth/callback?token=...&user=...`
5. **App Handles**: Desktop app receives the protocol URL and processes the authentication
6. **Success**: User is authenticated and returned to the desktop app

## 🔗 Protocol Handling

The application registers the `myapp://` protocol and handles these URL patterns:

- `myapp://test/basic` - Basic protocol test
- `myapp://auth/callback?token=<token>&user=<user_json>` - Authentication callback

### Example URLs

```
myapp://test/basic
myapp://auth/callback?token=abc123&user={"id":"123","username":"john","email":"john@example.com"}
```

## 🏗️ Project Structure

```
├── src/
│   ├── electron/          # Electron main process
│   │   └── main.js
│   ├── server/            # Express.js server
│   │   └── server.js
│   └── web/               # Web interface
│       └── index.html
├── assets/                # Application assets
├── dist/                  # Build output
├── package.json           # Project configuration
├── register-protocol.reg  # Windows registry file (dev)
└── README.md
```

## ⚙️ Configuration

### Custom Protocol

The protocol is configured in `package.json` under the `build.protocols` section:

```json
{
  "protocols": {
    "name": "myapp-protocol",
    "schemes": ["myapp"]
  }
}
```

### Server Configuration

Default server runs on `http://localhost:3000`. You can modify this in `src/server/server.js`.

## 🔧 API Endpoints

- `GET /` - Main application interface
- `GET /auth/start` - Start authentication flow
- `GET /auth/login` - Mock login page
- `GET /auth/callback` - Web callback (fallback)
- `GET /auth/status/:sessionId` - Check authentication status
- `GET /health` - Server health check

## 🖥️ Windows Registry Registration

For development, you can manually register the protocol using `register-protocol.reg`:

1. Edit the file to point to your built application
2. Double-click to import into Windows Registry

For production, electron-builder handles this automatically during installation.

## 🧪 Testing

### Manual Testing

1. Start the application: `npm run dev`
2. Click "Start Authentication Flow"
3. Complete the login in the browser
4. Verify the desktop app receives the callback

### Protocol Testing

Test the protocol directly by:
1. Opening a browser
2. Entering `myapp://test/basic` in the address bar
3. Verifying the desktop app responds

## 🐛 Troubleshooting

### Protocol Not Working

1. Ensure the desktop app is running
2. Check if protocol is registered (Windows Registry)
3. Try reinstalling/rebuilding the application

### Server Not Starting

1. Check if port 3000 is available
2. Look for error messages in the console
3. Verify Node.js installation

### Authentication Flow Issues

1. Check browser console for errors
2. Verify server is running on localhost:3000
3. Check session timeout (30 minutes default)

## 📝 Development Notes

- The application uses a mock authentication system for demonstration
- In production, replace with real OAuth providers (Google, GitHub, etc.)
- Session storage is in-memory; use Redis or database for production
- Icons should be added to `assets/` directory for proper branding

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details.