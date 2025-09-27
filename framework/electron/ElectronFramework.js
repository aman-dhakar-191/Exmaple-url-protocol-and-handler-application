/**
 * Electron Framework for URL Protocol Handler
 * Provides Electron application wrapper with protocol handling
 */

const path = require('path');

// Try to load Electron modules, but handle gracefully if not available
let app, BrowserWindow, shell, dialog, Menu;
try {
  const electron = require('electron');
  app = electron.app;
  BrowserWindow = electron.BrowserWindow;
  shell = electron.shell;
  dialog = electron.dialog;
  Menu = electron.Menu;
  
  // Check if we're actually in an Electron process
  if (!app || !BrowserWindow) {
    throw new Error('Not in Electron main process');
  }
} catch (error) {
  // Electron not available or not in main process (e.g., in tests), create mock objects
  console.warn('Electron not available or not in main process, using mock objects');
  app = {
    on: () => {},
    requestSingleInstanceLock: () => true,
    setAsDefaultProtocolClient: () => true,
    isDefaultProtocolClient: () => false,
    quit: () => {}
  };
  BrowserWindow = class MockBrowserWindow {
    constructor() { 
      this.webContents = { 
        executeJavaScript: () => {}, 
        setWindowOpenHandler: () => {}, 
        toggleDevTools: () => {}, 
        openDevTools: () => {} 
      }; 
    }
    loadURL() { return Promise.resolve(); }
    loadFile() { return Promise.resolve(); }
    on() {}
    once() {}
    show() {}
    focus() {}
    restore() {}
    isMinimized() { return false; }
    static getAllWindows() { return []; }
  };
  shell = { openExternal: () => {} };
  dialog = { showMessageBox: () => {} };
  Menu = { buildFromTemplate: () => {}, setApplicationMenu: () => {} };
}

class ElectronFramework {
  constructor(config = {}) {
    this.config = {
      protocol: 'myapp',
      window: {
        width: 1200,
        height: 800,
        webPreferences: {
          nodeIntegration: true,
          contextIsolation: false,
          enableRemoteModule: true
        },
        show: false
      },
      serverUrl: null,
      serverConfig: null,
      menu: null,
      isDevelopment: process.env.NODE_ENV === 'development',
      singleInstance: true,
      ...config
    };
    
    this.mainWindow = null;
    this.server = null;
    this.protocolHandler = null;
    this.menuTemplate = [];
    
    this.setupAppEvents();
  }
  
  /**
   * Setup Electron app events
   */
  setupAppEvents() {
    // Handle protocol on app start
    app.on('ready', () => {
      this.onReady();
    });
    
    // macOS specific
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        this.createWindow();
      }
    });
    
    app.on('window-all-closed', () => {
      if (process.platform !== 'darwin') {
        app.quit();
      }
    });
    
    // Handle protocol URLs
    app.on('open-url', (event, url) => {
      event.preventDefault();
      this.handleProtocolUrl(url);
    });
    
    // Windows/Linux protocol handling
    if (process.platform === 'win32' || process.platform === 'linux') {
      app.on('second-instance', (event, commandLine) => {
        // Find protocol URL in command line
        const protocolUrl = commandLine.find(arg => 
          arg.startsWith(this.config.protocol + '://')
        );
        
        if (protocolUrl) {
          this.handleProtocolUrl(protocolUrl);
        }
        
        this.focusMainWindow();
      });
    }
  }
  
  /**
   * App ready handler
   */
  async onReady() {
    // Set up single instance if configured
    if (this.config.singleInstance) {
      const gotTheLock = app.requestSingleInstanceLock();
      if (!gotTheLock) {
        app.quit();
        return;
      }
    }
    
    // Register protocol
    this.registerProtocol();
    
    // Create main window
    await this.createWindow();
    
    // Setup menu
    this.setupMenu();
    
    // Enable dev tools in development
    if (this.config.isDevelopment) {
      this.enableDevelopmentFeatures();
    }
  }
  
  /**
   * Register URL protocol
   */
  registerProtocol() {
    const protocolName = this.config.protocol;
    
    if (!app.isDefaultProtocolClient(protocolName)) {
      app.setAsDefaultProtocolClient(protocolName);
      console.log(`Registered as default client for ${protocolName}:// protocol`);
    }
  }
  
  /**
   * Create main window
   */
  async createWindow() {
    this.mainWindow = new BrowserWindow({
      ...this.config.window,
      icon: this.config.icon ? path.resolve(this.config.icon) : undefined
    });
    
    // Start server if configured
    if (this.server && this.config.serverConfig) {
      try {
        const result = await this.server.start(this.config.serverConfig.port);
        const serverUrl = `http://localhost:${result.port}`;
        await this.loadUrl(serverUrl);
      } catch (error) {
        console.error('Failed to start server:', error);
        await this.loadFallback();
      }
    } else if (this.config.serverUrl) {
      await this.loadUrl(this.config.serverUrl);
    } else {
      await this.loadFallback();
    }
    
    // Handle window events
    this.mainWindow.on('closed', () => {
      this.mainWindow = null;
    });
    
    // Handle external links
    this.mainWindow.webContents.setWindowOpenHandler(({ url }) => {
      shell.openExternal(url);
      return { action: 'deny' };
    });
    
    // Show window when ready
    this.mainWindow.once('ready-to-show', () => {
      this.mainWindow.show();
    });
  }
  
  /**
   * Load URL in main window
   * @param {string} url - URL to load
   */
  async loadUrl(url) {
    if (this.mainWindow) {
      await this.mainWindow.loadURL(url);
    }
  }
  
  /**
   * Load fallback content
   */
  async loadFallback() {
    if (this.config.fallbackHtml) {
      await this.mainWindow.loadFile(this.config.fallbackHtml);
    } else {
      // Load a basic HTML page
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>URL Protocol Handler</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; text-align: center; }
            .container { max-width: 600px; margin: 0 auto; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>URL Protocol Handler</h1>
            <p>Server is not running. Please start the server first.</p>
            <button onclick="location.reload()">Retry</button>
          </div>
        </body>
        </html>
      `;
      await this.mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
    }
  }
  
  /**
   * Handle protocol URL
   * @param {string} url - Protocol URL
   */
  handleProtocolUrl(url) {
    console.log('Protocol URL received:', url);
    
    if (!this.mainWindow) {
      this.createWindow().then(() => {
        this.processProtocolUrl(url);
      });
    } else {
      this.processProtocolUrl(url);
      this.focusMainWindow();
    }
  }
  
  /**
   * Process protocol URL
   * @param {string} url - Protocol URL
   */
  processProtocolUrl(url) {
    if (this.protocolHandler) {
      this.protocolHandler.handleProtocolUrl(url);
    } else {
      // Default handling - just log
      console.log('No protocol handler configured, URL:', url);
    }
  }
  
  /**
   * Focus main window
   */
  focusMainWindow() {
    if (this.mainWindow) {
      if (this.mainWindow.isMinimized()) {
        this.mainWindow.restore();
      }
      this.mainWindow.show();
      this.mainWindow.focus();
    }
  }
  
  /**
   * Setup application menu
   */
  setupMenu() {
    const template = this.buildMenuTemplate();
    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
  }
  
  /**
   * Build menu template
   */
  buildMenuTemplate() {
    const template = [
      {
        label: 'File',
        submenu: [
          {
            label: 'Reload',
            accelerator: 'CmdOrCtrl+R',
            click: () => {
              if (this.mainWindow) {
                this.mainWindow.reload();
              }
            }
          },
          { type: 'separator' },
          {
            label: 'Exit',
            accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
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
            label: `Test ${this.config.protocol}://test/basic`,
            click: () => {
              this.handleProtocolUrl(`${this.config.protocol}://test/basic`);
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
              if (this.mainWindow) {
                dialog.showMessageBox(this.mainWindow, {
                  type: 'info',
                  title: 'About',
                  message: 'URL Protocol Handler Framework',
                  detail: `This application demonstrates URL protocol handling.\\n\\nProtocol: ${this.config.protocol}://`
                });
              }
            }
          },
          {
            label: 'DevTools',
            accelerator: process.platform === 'darwin' ? 'Alt+Cmd+I' : 'Ctrl+Shift+I',
            click: () => {
              if (this.mainWindow) {
                this.mainWindow.webContents.toggleDevTools();
              }
            }
          }
        ]
      }
    ];
    
    // Merge with custom menu items
    if (this.config.menu && Array.isArray(this.config.menu)) {
      template.push(...this.config.menu);
    }
    
    return template;
  }
  
  /**
   * Enable development features
   */
  enableDevelopmentFeatures() {
    if (this.mainWindow) {
      // Enable dev tools
      this.mainWindow.webContents.openDevTools();
      
      // Enable live reload if available
      try {
        require('electron-reload')(__dirname, {
          electron: path.join(__dirname, '../../node_modules/.bin/electron'),
          hardResetMethod: 'exit'
        });
      } catch (error) {
        // electron-reload not available
      }
    }
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
   * Set server instance
   * @param {object} server - Server instance
   */
  setServer(server) {
    this.server = server;
    return this;
  }
  
  /**
   * Get main window
   */
  getMainWindow() {
    return this.mainWindow;
  }
  
  /**
   * Get configuration
   */
  getConfig() {
    return this.config;
  }
}

module.exports = ElectronFramework;