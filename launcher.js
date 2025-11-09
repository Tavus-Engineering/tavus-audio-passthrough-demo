#!/usr/bin/env node

/**
 * Tavus Audio Passthrough Launcher
 *
 * This script:
 * 1. Starts the Python bot
 * 2. Captures the Tavus conversation URL from logs
 * 3. Launches the React frontend with the URL
 * 4. Monitors connections and restarts on failure
 */

import { spawn } from 'child_process';
import { writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const CONFIG_FILE = join(__dirname, 'frontend', 'src', 'conversation-url.json');
const RESTART_DELAY = 3000; // 3 seconds before restart

let pythonProcess = null;
let frontendProcess = null;
let conversationUrl = null;
let isShuttingDown = false;

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function clearConversationUrl() {
  if (existsSync(CONFIG_FILE)) {
    writeFileSync(CONFIG_FILE, JSON.stringify({ url: null }));
  }
}

function saveConversationUrl(url) {
  conversationUrl = url;
  writeFileSync(CONFIG_FILE, JSON.stringify({ url }));
  log(`\n${'='.repeat(80)}`, colors.green);
  log(`✓ Tavus Conversation URL: ${url}`, colors.green);
  log(`✓ React frontend will auto-connect`, colors.green);
  log(`${'='.repeat(80)}\n`, colors.green);
}

function startPythonBot() {
  return new Promise((resolve, reject) => {
    log('\n[Python Bot] Starting...', colors.blue);

    pythonProcess = spawn('python', ['main.py'], {
      cwd: __dirname,
      stdio: ['inherit', 'pipe', 'pipe'],
    });

    let hasJoined = false;

    pythonProcess.stdout.on('data', (data) => {
      const output = data.toString();
      process.stdout.write(`${colors.blue}[Bot]${colors.reset} ${output}`);

      // Look for the conversation URL in logs
      const urlMatch = output.match(/'conversation_url':\s*'([^']+)'/);
      if (urlMatch && !conversationUrl) {
        saveConversationUrl(urlMatch[1]);
        if (!hasJoined) {
          hasJoined = true;
          resolve();
        }
      }

      // Detect if bot joined the room
      if (output.includes('Joined https://') && !hasJoined) {
        hasJoined = true;
        if (conversationUrl) {
          resolve();
        }
      }
    });

    pythonProcess.stderr.on('data', (data) => {
      const output = data.toString();
      process.stderr.write(`${colors.blue}[Bot]${colors.reset} ${output}`);

      // Also check stderr for conversation URL (some loggers use stderr)
      const urlMatch = output.match(/'conversation_url':\s*'([^']+)'/);
      if (urlMatch && !conversationUrl) {
        saveConversationUrl(urlMatch[1]);
        if (!hasJoined) {
          hasJoined = true;
          resolve();
        }
      }
    });

    pythonProcess.on('error', (error) => {
      log(`[Python Bot] Error: ${error.message}`, colors.red);
      reject(error);
    });

    pythonProcess.on('exit', (code, signal) => {
      log(`[Python Bot] Exited with code ${code}, signal ${signal}`, colors.yellow);
      pythonProcess = null;

      if (!isShuttingDown) {
        log('[Python Bot] Connection lost. Restarting in 3 seconds...', colors.yellow);
        setTimeout(() => restartAll(), RESTART_DELAY);
      }
    });
  });
}

function startFrontend() {
  return new Promise((resolve, reject) => {
    log('\n[React Frontend] Starting on http://localhost:3000...', colors.cyan);

    frontendProcess = spawn('npm', ['run', 'dev'], {
      cwd: join(__dirname, 'frontend'),
      stdio: ['inherit', 'pipe', 'pipe'],
      shell: true,
    });

    let hasStarted = false;

    frontendProcess.stdout.on('data', (data) => {
      const output = data.toString();
      process.stdout.write(`${colors.cyan}[Frontend]${colors.reset} ${output}`);

      if (output.includes('Local:') && !hasStarted) {
        hasStarted = true;
        setTimeout(() => {
          log('\n[Frontend] Ready! Open http://localhost:3000 in your browser', colors.green);
          resolve();
        }, 1000);
      }
    });

    frontendProcess.stderr.on('data', (data) => {
      const output = data.toString();
      // Vite outputs some info to stderr, so don't color it as error
      process.stderr.write(`${colors.cyan}[Frontend]${colors.reset} ${output}`);
    });

    frontendProcess.on('error', (error) => {
      log(`[React Frontend] Error: ${error.message}`, colors.red);
      reject(error);
    });

    frontendProcess.on('exit', (code, signal) => {
      log(`[React Frontend] Exited with code ${code}, signal ${signal}`, colors.yellow);
      frontendProcess = null;
    });
  });
}

async function restartAll() {
  if (isShuttingDown) return;

  log('\n[Launcher] Restarting all services...', colors.magenta);

  // Clean up
  cleanup(false);
  conversationUrl = null;
  clearConversationUrl();

  // Wait a bit for cleanup
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Restart
  await startAll();
}

async function startAll() {
  try {
    // Clear any old URL
    clearConversationUrl();

    // Start Python bot first and wait for conversation URL
    await startPythonBot();

    // Start frontend
    await startFrontend();

    log('\n✓ All services started successfully!', colors.green);
    log('✓ Bot is capturing audio from Daily room', colors.green);
    log('✓ Frontend is displaying the Tavus replica', colors.green);
    log('\nPress Ctrl+C to stop all services.\n', colors.yellow);

  } catch (error) {
    log(`\nError starting services: ${error.message}`, colors.red);
    cleanup(true);
  }
}

function cleanup(exit = true) {
  if (isShuttingDown && exit) return;
  isShuttingDown = exit;

  log('\n[Launcher] Shutting down...', colors.yellow);

  if (pythonProcess) {
    log('[Launcher] Stopping Python bot...', colors.yellow);
    pythonProcess.kill('SIGTERM');
    pythonProcess = null;
  }

  if (frontendProcess) {
    log('[Launcher] Stopping React frontend...', colors.yellow);
    frontendProcess.kill('SIGTERM');
    frontendProcess = null;
  }

  if (exit) {
    log('[Launcher] Goodbye!', colors.green);
    process.exit(0);
  }
}

// Handle Ctrl+C
process.on('SIGINT', () => {
  log('\n[Launcher] Received SIGINT', colors.yellow);
  cleanup(true);
});

process.on('SIGTERM', () => {
  log('\n[Launcher] Received SIGTERM', colors.yellow);
  cleanup(true);
});

// Start everything
log(`${colors.bright}${colors.magenta}
╔══════════════════════════════════════════════════════════════╗
║          Tavus Audio Passthrough Launcher                    ║
╚══════════════════════════════════════════════════════════════╝
${colors.reset}`);

startAll().catch((error) => {
  log(`Fatal error: ${error.message}`, colors.red);
  cleanup(true);
});
