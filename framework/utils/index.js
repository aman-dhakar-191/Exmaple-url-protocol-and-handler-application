/**
 * Utility functions for URL Protocol Handler Framework
 */

const { URL } = require('url');
const path = require('path');
const fs = require('fs');

/**
 * Parse protocol URL and extract components
 * @param {string} url - Protocol URL
 * @returns {object} Parsed URL components
 */
function parseProtocolUrl(url) {
  try {
    const urlObj = new URL(url);
    
    return {
      protocol: urlObj.protocol.replace(':', ''),
      hostname: urlObj.hostname,
      pathname: urlObj.pathname,
      searchParams: Object.fromEntries(urlObj.searchParams),
      hash: urlObj.hash,
      url: url,
      isValid: true
    };
  } catch (error) {
    return {
      url: url,
      isValid: false,
      error: error.message
    };
  }
}

/**
 * Build protocol URL from components
 * @param {string} protocol - Protocol scheme
 * @param {string} hostname - Hostname/path
 * @param {string} pathname - Path
 * @param {object} params - Query parameters
 * @returns {string} Protocol URL
 */
function buildProtocolUrl(protocol, hostname, pathname = '', params = {}) {
  const searchParams = new URLSearchParams(params);
  const queryString = searchParams.toString();
  
  let url = `${protocol}://${hostname}${pathname}`;
  if (queryString) {
    url += `?${queryString}`;
  }
  
  return url;
}

/**
 * Validate protocol scheme name
 * @param {string} protocol - Protocol scheme
 * @returns {boolean} Is valid
 */
function validateProtocolScheme(protocol) {
  // Protocol schemes must start with a letter and contain only letters, digits, +, -, .
  const protocolRegex = /^[a-zA-Z][a-zA-Z0-9+.-]*$/;
  return protocolRegex.test(protocol);
}

/**
 * Generate session ID
 * @returns {string} Session ID
 */
function generateSessionId() {
  return require('uuid').v4();
}

/**
 * Create safe filename from string
 * @param {string} str - Input string
 * @returns {string} Safe filename
 */
function createSafeFilename(str) {
  return str
    .replace(/[^a-zA-Z0-9.-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

/**
 * Ensure directory exists
 * @param {string} dirPath - Directory path
 */
function ensureDirectory(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * Read JSON file safely
 * @param {string} filePath - File path
 * @param {object} defaultValue - Default value if file doesn't exist
 * @returns {object} Parsed JSON or default value
 */
function readJsonFile(filePath, defaultValue = {}) {
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(content);
    }
  } catch (error) {
    console.warn(`Failed to read JSON file ${filePath}:`, error.message);
  }
  return defaultValue;
}

/**
 * Write JSON file safely
 * @param {string} filePath - File path
 * @param {object} data - Data to write
 */
function writeJsonFile(filePath, data) {
  try {
    ensureDirectory(path.dirname(filePath));
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error(`Failed to write JSON file ${filePath}:`, error.message);
    throw error;
  }
}

/**
 * Debounce function calls
 * @param {function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {function} Debounced function
 */
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Simple retry mechanism
 * @param {function} fn - Function to retry
 * @param {number} maxAttempts - Maximum attempts
 * @param {number} delay - Delay between attempts
 * @returns {Promise} Result or error
 */
async function retry(fn, maxAttempts = 3, delay = 1000) {
  let lastError;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      if (attempt < maxAttempts) {
        console.log(`Attempt ${attempt} failed, retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
}

/**
 * Check if port is available
 * @param {number} port - Port number
 * @param {string} host - Host address
 * @returns {Promise<boolean>} Is port available
 */
function isPortAvailable(port, host = 'localhost') {
  return new Promise((resolve) => {
    const net = require('net');
    const server = net.createServer();
    
    server.listen(port, host, () => {
      server.once('close', () => {
        resolve(true);
      });
      server.close();
    });
    
    server.on('error', () => {
      resolve(false);
    });
  });
}

/**
 * Find available port starting from given port
 * @param {number} startPort - Starting port
 * @param {number} maxAttempts - Maximum attempts
 * @param {string} host - Host address
 * @returns {Promise<number>} Available port
 */
async function findAvailablePort(startPort = 3000, maxAttempts = 10, host = 'localhost') {
  for (let i = 0; i < maxAttempts; i++) {
    const port = startPort + i;
    const available = await isPortAvailable(port, host);
    
    if (available) {
      return port;
    }
  }
  
  throw new Error(`No available port found starting from ${startPort}`);
}

module.exports = {
  parseProtocolUrl,
  buildProtocolUrl,
  validateProtocolScheme,
  generateSessionId,
  createSafeFilename,
  ensureDirectory,
  readJsonFile,
  writeJsonFile,
  debounce,
  retry,
  isPortAvailable,
  findAvailablePort
};