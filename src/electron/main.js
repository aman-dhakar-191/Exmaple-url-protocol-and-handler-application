const { app, BrowserWindow, ipcMain, shell, dialog, Menu } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../..', '.env') });

// Keep a global reference of the window object
let mainWindow;
let serverProcess;

// Enable live reload for development
if (process.env.NODE_ENV === 'development') {
  try {
    require('electron-reload')(__dirname, {
      electron: path.join(__dirname, '..', '..', 'node_modules', '.bin', 'electron'),
      hardResetMethod: 'exit'
    });
  } catch (error) {
    console.log('electron-reload not available in production build');
  }
}

function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true
    },
    icon: path.join(__dirname, '../../assets/icon.png'),
    show: false // Don't show until ready
  });

  // Start the Express server first
  startServer().then((result) => {
    // Use the actual port from the server startup
    const actualPort = result?.port || global.serverPort || 3000;
    const serverUrl = `http://localhost:${actualPort}`;
    
    console.log(`Loading web app from: ${serverUrl}`);
    
    // Wait a bit for server to fully start
    setTimeout(() => {
      mainWindow.loadURL(serverUrl);
      mainWindow.show();
      
      // Show window when ready to prevent white screen
      mainWindow.once('ready-to-show', () => {
        mainWindow.show();
      });
    }, 2000); // Reduced timeout since we now have proper server startup confirmation
  }).catch((error) => {
    console.error('Failed to start server:', error);
    // Fallback: load HTML file directly
    const htmlPath = path.join(__dirname, '../web/index.html');
    mainWindow.loadFile(htmlPath);
    mainWindow.show();
  });

  // Open the DevTools in development
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Create application menu
  createMenu();
}

function createMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Open Auth Flow',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.executeJavaScript(`
                document.getElementById('startAuth').click();
              `);
            }
          }
        },
        { type: 'separator' },
        {
          label: 'Exit',
          click: () => {
            app.quit();
          }
        }
      ]
    },
    {
      label: 'Protocol',
      submenu: [
        {
          label: 'Test Basic Protocol',
          click: () => {
            handleProtocolUrl('myapp://test/basic');
          }
        },
        {
          label: 'Test Auth Callback',
          click: () => {
            handleProtocolUrl('myapp://auth/callback?token=menu_test_token&user={"name":"Menu Test User"}');
          }
        }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'About',
              message: 'URL Protocol Handler Demo',
              detail: 'This application demonstrates URL protocol handling with Node.js and Electron.\n\nVersion: 1.0.0'
            });
          }
        },
        {
          label: 'DevTools',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.toggleDevTools();
            }
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

let embeddedServer;
const activeSessions = new Map();

function startEmbeddedServer() {
  return new Promise(async (resolve, reject) => {
    try {
      // Import the server module with the new startup method
      const { startServerWithPortFallback } = require('../server/server.js');
      
      // Start server with automatic port fallback
      const result = await startServerWithPortFallback(3000, 5);
      
      // Store the server reference and actual port for cleanup
      global.embeddedServerInstance = result.server;
      global.serverPort = result.port;
      
      console.log(`Server started successfully on port ${result.port}`);
      resolve(result);
    } catch (error) {
      console.error('Failed to start embedded server:', error);
      reject(error);
    }
  });
}

function startServer() {
  // Use the standalone server for GitHub OAuth support
  return startEmbeddedServer();
}

function handleProtocolUrl(url) {
  console.log('Protocol URL received:', url);
  
  if (!mainWindow) {
    createWindow();
    // Wait for window to be ready
    mainWindow.once('ready-to-show', () => {
      processProtocolUrl(url);
    });
  } else {
    processProtocolUrl(url);
    // Bring window to front
    mainWindow.show();
    mainWindow.focus();
  }
}

function processProtocolUrl(url) {
  try {
    const urlObj = new URL(url);
    const protocol = urlObj.protocol; // 'myapp:'
    const host = urlObj.hostname; // e.g., 'auth', 'test'
    const pathname = urlObj.pathname; // e.g., '/callback'
    const searchParams = urlObj.searchParams;

    console.log('Processing protocol URL:', { protocol, host, pathname });

    if (host === 'auth' && pathname === '/callback') {
      // Handle authentication callback
      const token = searchParams.get('token');
      const userStr = searchParams.get('user');
      const sessionId = searchParams.get('session_id');

      let user = null;
      try {
        user = JSON.parse(userStr);
      } catch (e) {
        console.error('Error parsing user data:', e);
      }

      // Update session status on server side
      if (sessionId && activeSessions.has(sessionId)) {
        const session = activeSessions.get(sessionId);
        session.status = 'completed';
        session.token = token;
        session.user = user;
        console.log('Updated session status:', sessionId);
      }

      const authResult = {
        success: true,
        token,
        user,
        sessionId,
        timestamp: new Date().toISOString()
      };

      // Show success dialog with more details
      dialog.showMessageBox(mainWindow, {
        type: 'info',
        title: 'Authentication Successful',
        message: 'Welcome back!',
        detail: `User: ${user ? user.username || user.name || 'Unknown' : 'N/A'}\nToken: ${token ? token.substring(0, 20) + '...' : 'N/A'}\nSession: ${sessionId}`
      });

      // Send result to renderer process
      if (mainWindow && mainWindow.webContents) {
        mainWindow.webContents.executeJavaScript(`
          console.log('Auth callback received:', ${JSON.stringify(authResult)});
          
          // Update the page UI
          const statusDiv = document.getElementById('authStatus');
          if (statusDiv) {
            statusDiv.innerHTML = \`
              <div class="status success">
                ✅ Authentication completed via protocol handler!<br>
                User: ${user ? user.username || user.name || 'Unknown' : 'N/A'}<br>
                Token: ${token}<br>
                Session ID: ${sessionId}<br>
                Timestamp: ${authResult.timestamp}
              </div>
            \`;
          }
          
          // Reset auth buttons
          const startBtn = document.getElementById('startAuth');
          const checkBtn = document.getElementById('checkStatus');
          if (startBtn) startBtn.style.display = 'inline-block';
          if (checkBtn) checkBtn.classList.add('hidden');
          
          // Stop any polling that might be active
          if (typeof stopStatusPolling === 'function') {
            stopStatusPolling();
          }
        `);
      }

    } else if (host === 'test') {
      // Handle test protocols
      dialog.showMessageBox(mainWindow, {
        type: 'info',
        title: 'Protocol Test',
        message: 'Protocol handler is working!',
        detail: `Full URL: ${url}\nHost: ${host}\nPath: ${pathname}`
      });

      // Log to console in the web page
      if (mainWindow && mainWindow.webContents) {
        mainWindow.webContents.executeJavaScript(`
          console.log('Protocol test received:', '${url}');
          alert('Protocol test successful!\\n\\nURL: ${url}');
        `);
      }
    } else {
      // Unknown protocol format
      console.log('Unknown protocol format:', url);
      dialog.showMessageBox(mainWindow, {
        type: 'warning',
        title: 'Unknown Protocol',
        message: 'Received unknown protocol format',
        detail: url
      });
    }

  } catch (error) {
    console.error('Error processing protocol URL:', error);
    dialog.showErrorBox('Protocol Error', `Error processing URL: ${url}\n\nError: ${error.message}`);
  }
}

// App event handlers
app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    // Close embedded server properly
    if (global.embeddedServerInstance) {
      console.log('Closing embedded server...');
      global.embeddedServerInstance.close((err) => {
        if (err) {
          console.error('Error closing server:', err);
        } else {
          console.log('Server closed successfully');
        }
      });
    }
    
    // Legacy cleanup for old server processes
    if (global.serverProcess) {
      global.serverProcess.kill();
    }
    
    app.quit();
  }
});

// Handle protocol on Windows/Linux
app.on('second-instance', (event, commandLine, workingDirectory) => {
  // Someone tried to run a second instance, focus our window instead
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }

  // Check if there's a protocol URL in the command line
  const protocolUrl = commandLine.find(arg => arg.startsWith('myapp://'));
  if (protocolUrl) {
    handleProtocolUrl(protocolUrl);
  }
});

// Handle protocol on macOS
app.on('open-url', (event, url) => {
  event.preventDefault();
  handleProtocolUrl(url);
});

// Set as default protocol client
if (!app.isDefaultProtocolClient('myapp')) {
  app.setAsDefaultProtocolClient('myapp');
}

// Handle protocol URLs passed as command line arguments (Windows/Linux)
if (process.argv.length >= 2) {
  const protocolUrl = process.argv.find(arg => arg.startsWith('myapp://'));
  if (protocolUrl) {
    // Delay handling until app is ready
    app.whenReady().then(() => {
      setTimeout(() => {
        handleProtocolUrl(protocolUrl);
      }, 3000); // Wait for window to be fully loaded
    });
  }
}

// Prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

console.log('Electron app starting...');
console.log('Protocol client set for: myapp://');