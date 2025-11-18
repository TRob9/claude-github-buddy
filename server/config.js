#!/usr/bin/env node

/**
 * Configuration for Claude GitHub Buddy Server
 *
 * Configuration is now loaded from config.json
 * Use the Settings dialog in the extension to update directories
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const configPath = path.join(__dirname, 'config.json');

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
  // User-configurable directories (from config.json)
  prReviewsDir: userConfig.prReviewsDir || path.join(dirname(__dirname), 'questions and actions'),
  projectsDir: userConfig.projectsDir || path.join(process.env.HOME, 'Projects'),

  // Server ports (change if these conflict with other services)
  httpPort: 47382,
  wsPort: 47383,

  // Git configuration - customize based on your git setup
  git: {
    'github.com': {
      protocol: 'ssh',
      sshKey: '~/.ssh/id_ed25519'
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
