'use strict';

const fs = require('fs');
const path = require('path');

// Preserve original console methods
const {
  log: consoleLog,
  warn: consoleWarn,
  error: consoleError
} = console;

/**
 * Absolute, fixed log directory (NOT user controlled)
 */
const BASE_LOG_DIR = path.resolve(__dirname, '../../logs');
const LOG_FILE_NAME = 'service.log';
const LOG_FILE_PATH = path.join(BASE_LOG_DIR, LOG_FILE_NAME);

/**
 * Ensure log directory exists
 */
if (!fs.existsSync(BASE_LOG_DIR)) {
  fs.mkdirSync(BASE_LOG_DIR, { recursive: true });
}

/**
 * Flatten parameters into safe string
 */
function flatten(...params) {
  return params.map(item => {

    if (['string', 'boolean', 'number'].includes(typeof item)) {
      return item;
    }

    if (item instanceof Error) {
      return JSON.stringify({
        message: item.message,
        stack: item.stack,
        name: item.name
      });
    }

    try {
      return JSON.stringify(item);
    } catch {
      return '[Unserializable object]';
    }

  }).join(' ');
}

/**
 * Secure log writer
 */
function write(type = 'LOG', date = true, ...out) {

  let logEntry = '\n';

  if (date) {
    logEntry += `${new Date().toLocaleString()}: `;
  }

  if (type !== 'LOG') {
    logEntry += `${type}: `;
  }

  logEntry += flatten(...out);

  try {
    fs.appendFileSync(LOG_FILE_PATH, logEntry, {
      encoding: 'utf8',
      flag: 'a'
    });
  } catch (err) {
    consoleError('Failed to write to log file:', err);
  }
}

/**
 * Wrapped log methods
 */
const log = (...out) => {
  consoleLog('pm2-service:', ...out);
  write('LOG', true, ...out);
};

const warn = (...out) => {
  consoleWarn('pm2-service:', ...out);
  write('WARNING', true, ...out);
};

const error = (...out) => {
  consoleError('pm2-service:', ...out);
  write('ERROR', true, ...out);
};

/**
 * Override console methods safely
 */
console.log = (...out) => {
  consoleLog(...out);
  write('LOG', false, ...out);
};

console.warn = (...out) => {
  consoleWarn(...out);
  write('WARNING', false, ...out);
};

console.error = (...out) => {
  consoleError(...out);
  write('ERROR', false, ...out);
};

module.exports = { log, warn, error };