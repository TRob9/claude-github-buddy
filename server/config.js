#!/usr/bin/env node

/**
 * Configuration for Claude GitHub Buddy Server
 *
 * Configuration priority (highest to lowest):
 * 1. Environment variables (from .env file or system)
 * 2. config.json (UI settings)
 * 3. Defaults
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const configPath = path.join(__dirname, 'config.json');
const envPath = path.join(dirname(__dirname), '.env');

// Load .env file if it exists
function loadEnv() {
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        const value = valueParts.join('=').trim();
        if (key && value && !process.env[key]) {
          process.env[key] = value;
        }
      }
    });
  }
}

loadEnv();

// Load user configuration from JSON file
let userConfig = {};
try {
  if (fs.existsSync(configPath)) {
    const configData = fs.readFileSync(configPath, 'utf8');
    userConfig = JSON.parse(configData);
  }
} catch (error) {
  console.error('[CONFIG] Error loading config.json:', error);
}

export const config = {
  // User-configurable directories (priority: env > config.json > defaults)
  prReviewsDir: process.env.PR_REVIEWS_DIR || userConfig.prReviewsDir || path.join(dirname(__dirname), 'questions and actions'),
  projectsDir: process.env.PROJECTS_DIR || userConfig.projectsDir || path.join(process.env.HOME, 'Projects'),

  // Server ports (priority: env > hardcoded)
  httpPort: parseInt(process.env.HTTP_PORT) || 13030,
  wsPort: parseInt(process.env.WS_PORT) || 13031,

  // Git configuration - customize based on your git setup
  git: {
    'github.com': {
      protocol: process.env.GIT_GITHUB_PROTOCOL || 'ssh',
      sshKey: process.env.GIT_GITHUB_SSH_KEY || '~/.ssh/id_ed25519'
    }
  }
};

/**
 * Reload configuration from config.json
 * Called when user updates settings via UI
 */
export function reloadConfig() {
  try {
    const configData = fs.readFileSync(configPath, 'utf8');
    const newConfig = JSON.parse(configData);

    // Update the exported config object
    config.prReviewsDir = newConfig.prReviewsDir || config.prReviewsDir;
    config.projectsDir = newConfig.projectsDir || config.projectsDir;

    console.log('[CONFIG] Configuration reloaded:', {
      prReviewsDir: config.prReviewsDir,
      projectsDir: config.projectsDir
    });
    return true;
  } catch (error) {
    console.error('[CONFIG] Error reloading config:', error);
    return false;
  }
}
