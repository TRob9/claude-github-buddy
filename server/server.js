#!/usr/bin/env node

/**
 * Claude GitHub Buddy - Local HTTP Server
 * Handles file operations AND Claude API calls for the Chrome extension
 */

import http from 'http';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { createSession, answerQuestionsWithAgent, completeActionsWithAgent } from './agent-server.js';
import { config, reloadConfig } from './config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PORT = config.httpPort;

// Ensure directory exists
if (!fs.existsSync(config.prReviewsDir)) {
  fs.mkdirSync(config.prReviewsDir, { recursive: true });
}

console.log('🤖 Claude GitHub Buddy Server');
console.log('==============================');
console.log(`📁 Saving files to: ${config.prReviewsDir}`);
console.log(`🌐 Server running at: http://localhost:${PORT}`);
console.log('✅ Ready! Keep this running while using the extension.');
console.log('');

const server = http.createServer((req, res) => {
  // CORS headers for Chrome extension
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Parse request
  let body = '';
  req.on('data', chunk => {
    body += chunk.toString();
  });

  req.on('end', () => {
    try {
      const data = JSON.parse(body || '{}');

      if (req.url === '/writeFile' && req.method === 'POST') {
        const filePath = path.join(config.prReviewsDir, data.filename);

        // Create nested directories if they don't exist
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
          console.log(`📁 Created directory: ${path.relative(config.prReviewsDir, dir)}`);
        }

        fs.writeFileSync(filePath, data.content, 'utf8');
        console.log(`✅ Wrote: ${data.filename}`);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, filePath }));
        return;
      }

      if (req.url === '/readFile' && req.method === 'POST') {
        console.log('[SERVER] readFile request received');
        console.log('[SERVER] data.filename:', data.filename);
        const filePath = path.join(config.prReviewsDir, data.filename);
        console.log('[SERVER] Full path:', filePath);
        console.log('[SERVER] File exists?', fs.existsSync(filePath));

        if (!fs.existsSync(filePath)) {
          console.log('[SERVER] ❌ File not found:', filePath);
          // List what files DO exist in the directory
          const dir = path.dirname(filePath);
          if (fs.existsSync(dir)) {
            console.log('[SERVER] Directory exists. Files in directory:');
            const filesInDir = fs.readdirSync(dir);
            filesInDir.forEach(f => console.log(`  - ${f}`));
          } else {
            console.log('[SERVER] Directory does not exist:', dir);
          }
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: 'File not found' }));
          return;
        }
        const content = fs.readFileSync(filePath, 'utf8');
        console.log(`[SERVER] ✅ Successfully read: ${data.filename} (${content.length} bytes)`);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, content }));
        return;
      }

      if (req.url === '/listFiles' && req.method === 'GET') {
        const files = fs.readdirSync(config.prReviewsDir)
          .filter(f => f.endsWith('.md'))
          .map(f => ({
            name: f,
            path: path.join(config.prReviewsDir, f),
            modified: fs.statSync(path.join(config.prReviewsDir, f)).mtime
          }));
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, files }));
        return;
      }

      if (req.url === '/deleteFile' && req.method === 'POST') {
        console.log('[SERVER] deleteFile request received');
        const filePath = path.join(config.prReviewsDir, data.filename);
        console.log('[SERVER] File to delete:', filePath);

        if (!fs.existsSync(filePath)) {
          console.log('[SERVER] ❌ File not found for deletion:', filePath);
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: 'File not found' }));
          return;
        }

        try {
          fs.unlinkSync(filePath);
          console.log('🗑️  File deleted:', data.filename);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true }));
        } catch (error) {
          console.error('❌ Error deleting file:', error);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: error.message }));
        }
        return;
      }

      if (req.url === '/archiveFile' && req.method === 'POST') {
        console.log('[SERVER] archiveFile request received');
        const filePath = path.join(config.prReviewsDir, data.filename);
        console.log('[SERVER] Source file:', filePath);

        if (!fs.existsSync(filePath)) {
          console.log('[SERVER] ❌ File not found for archiving:', filePath);
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: 'File not found' }));
          return;
        }

        // Create archive directory in the same folder as the file
        const fileDir = path.dirname(filePath);
        const archiveDir = path.join(fileDir, 'archive');
        if (!fs.existsSync(archiveDir)) {
          fs.mkdirSync(archiveDir, { recursive: true });
          console.log(`📁 Created archive directory: ${path.relative(config.prReviewsDir, archiveDir)}`);
        }

        // Create archive filename with timestamp
        const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
        const fileName = path.basename(filePath);
        const archiveFileName = fileName.replace(/\.md$/, `_${timestamp}.md`);
        const archivePath = path.join(archiveDir, archiveFileName);

        // Copy file to archive
        fs.copyFileSync(filePath, archivePath);
        console.log(`📦 Archived: ${data.filename} → archive/${archiveFileName}`);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, archivePath: path.relative(config.prReviewsDir, archivePath) }));
        return;
      }

      if (req.url === '/startSession' && req.method === 'POST') {
        // Create a new Agent SDK session and return sessionId
        const sessionId = createSession();
        console.log(`[SESSION] Created new session: ${sessionId}`);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, sessionId }));
        return;
      }

      if (req.url === '/answerQuestions' && req.method === 'POST') {
        console.log('[AGENT] Processing answer questions request...');
        const { sessionId, prInfo, useUltrathink } = data;

        if (!sessionId) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: 'Missing sessionId' }));
          return;
        }

        // Build file path to questions file
        const repoName = prInfo.fullRepoName.split('/')[1];
        const prFolder = `PR-${prInfo.prNumber}`;
        const dateStr = new Date().toISOString().split('T')[0];
        const filename = `${repoName}/${prFolder}/Questions ${dateStr}.md`;
        const filePath = path.join(config.prReviewsDir, filename);

        // Use Agent SDK to answer questions
        answerQuestionsWithAgent(sessionId, prInfo, filePath, useUltrathink)
          .then(result => {
            // Parse result and update markdown file
            // (For now, Claude updates via tools directly)
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, ...result }));
          })
          .catch(error => {
            console.error('❌ Error answering questions:', error);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: error.message }));
          });
        return;
      }

      if (req.url === '/completeActions' && req.method === 'POST') {
        console.log('[AGENT] Processing complete actions request...');
        const { sessionId, prInfo, useUltrathink } = data;

        if (!sessionId) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: 'Missing sessionId' }));
          return;
        }

        // Build file path to actions file
        const repoName = prInfo.fullRepoName.split('/')[1];
        const prFolder = `PR-${prInfo.prNumber}`;
        const dateStr = new Date().toISOString().split('T')[0];
        const filename = `${repoName}/${prFolder}/Actions ${dateStr}.md`;
        const filePath = path.join(config.prReviewsDir, filename);

        // Use Agent SDK to complete actions
        completeActionsWithAgent(sessionId, prInfo, filePath, useUltrathink)
          .then(result => {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, ...result }));
          })
          .catch(error => {
            console.error('❌ Error completing actions:', error);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: error.message }));
          });
        return;
      }

      if (req.url === '/getConfig' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          config: {
            prReviewsDir: config.prReviewsDir,
            projectsDir: config.projectsDir
          }
        }));
        return;
      }

      if (req.url === '/getDefaultConfig' && req.method === 'GET') {
        // Return default values (what they would be without config.json)
        const defaults = {
          prReviewsDir: path.join(dirname(__dirname), 'questions and actions'),
          projectsDir: path.join(process.env.HOME, 'Projects')
        };
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          defaults: defaults
        }));
        return;
      }

      if (req.url === '/updateConfig' && req.method === 'POST') {
        console.log('[SERVER] updateConfig request received');
        const { prReviewsDir, projectsDir } = data;

        if (!prReviewsDir || !projectsDir) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: 'Missing required fields' }));
          return;
        }

        try {
          // Write to config.json
          const configPath = path.join(__dirname, 'config.json');
          const newConfig = { prReviewsDir, projectsDir };
          fs.writeFileSync(configPath, JSON.stringify(newConfig, null, 2), 'utf8');

          // Reload configuration
          const reloaded = reloadConfig();

          if (reloaded) {
            console.log('✅ Configuration updated:', newConfig);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, config: newConfig }));
          } else {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: 'Failed to reload config' }));
          }
        } catch (error) {
          console.error('❌ Error updating config:', error);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: error.message }));
        }
        return;
      }

      if (req.url === '/health' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', directory: config.prReviewsDir }));
        return;
      }

      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: 'Not found' }));
    } catch (error) {
      console.error('❌ Error:', error.message);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: error.message }));
    }
  });
});

server.listen(PORT, () => {
  console.log(`Press Ctrl+C to stop the server\n`);
});

