# Claude GitHub Buddy

A Chrome extension that integrates Claude AI directly into GitHub Pull Requests. Ask questions about code changes, mark sections for action, and let Claude answer or implement changes - all from your browser.

## Features

- **Ask Questions**: Highlight code in PR diffs and ask Claude questions about it
- **Mark for Action**: Flag code sections that need changes and give Claude instructions
- **Auto-Answer**: Claude can answer all your questions in one go via Agent SDK
- **Auto-Complete Actions**: Claude can implement marked actions directly in the repository
- **Inline Display**: Answers and actions appear as GitHub-style comments in the PR
- **GitHub Enterprise Support**: Works with GitHub Enterprise (configurable)
- **Markdown Files**: Questions and actions saved to markdown files for review and version control

## Quick Start

### 1. Install Dependencies

```bash
cd server
npm install
```

### 2. Start the Server

**Option 1 - Double-click launcher (easiest):**
```bash
./Start Server.command
```

**Option 2 - Manual:**
```bash
cd server
node server.js
```

The server runs on `http://localhost:47382` and handles file I/O and Claude Agent SDK integration.

### 3. Install the Extension

**Chrome/Edge/Brave:**
1. Open `chrome://extensions/`
2. Enable "Developer mode" (top-right toggle)
3. Click "Load unpacked"
4. Select the `extension/` folder

**Firefox:**
1. Open `about:debugging#/runtime/this-firefox`
2. Click "Load Temporary Add-on"
3. Select `extension/manifest.json`

### 4. Configure (Optional)

Open Settings from the extension dropdown menu to configure:
- **Projects Directory**: Where git repositories are cloned
- **Questions & Actions Directory**: Where markdown files are saved
- **Agent Permissions**: Which tools Claude can use automatically

## Usage

### Asking Questions

1. Go to any GitHub PR → "Files changed" tab
2. Click line numbers to highlight code (yellow highlight)
3. Click the Claude icon that appears
4. Type your question → "Save Question"
5. Question saved to markdown file

### Answering Questions

1. Click "Answer Questions" button in the PR
2. Claude automatically answers all unanswered questions
3. Answers appear inline in the PR

### Marking for Action

1. Highlight code in PR diff
2. Click Claude dropdown → "Mark for Action"
3. Give Claude instructions on what to change
4. Action saved to markdown file

### Completing Actions

1. Click "Start Actions" button in the PR
2. Claude automatically implements all pending actions
3. Changes committed to the repository
4. Summaries appear in the markdown file

## File Structure

```
claude-github-buddy/
├── extension/              # Browser extension
│   ├── manifest.json       # Extension config
│   ├── scripts/
│   │   ├── content.js      # Main UI logic
│   │   ├── background.js   # Markdown generation
│   │   ├── agent-client.js # Agent SDK client
│   │   └── ...
│   ├── styles/
│   │   └── content.css     # GitHub-native styling
│   └── icons/
├── server/
│   ├── server.js           # HTTP server
│   ├── agent-server.js     # Agent SDK integration
│   ├── git-helper.js       # Repository management
│   └── config.js           # Configuration
└── questions and actions/  # Generated markdown files (gitignored)
```

## Configuration

### Environment Variables

**Required for Agent SDK features:**
- `ANTHROPIC_API_KEY` or `ANTHROPIC_VERTEX_PROJECT_ID` - Your Claude API credentials

**Optional:**
- `GITHUB_ENTERPRISE_URL` - Your GitHub Enterprise domain (e.g., `github.example.com`)
- `ANTHROPIC_VERTEX_PROJECT_ID` - GCP project ID for Vertex AI
- `CLOUD_ML_REGION` - GCP region for Vertex AI

**Example:**
```bash
export ANTHROPIC_API_KEY=your-api-key
export GITHUB_ENTERPRISE_URL=github.example.com
node server.js
```

### GitHub Enterprise Setup

To use with GitHub Enterprise:

1. Set environment variable:
   ```bash
   export GITHUB_ENTERPRISE_URL=github.example.com
   ```

2. Update `extension/manifest.json` to add your domain:
   ```json
   "host_permissions": [
     "https://github.com/*",
     "https://github.example.com/*"
   ],
   "content_scripts": [{
     "matches": [
       "https://github.com/*/pull/*",
       "https://github.example.com/*/pull/*"
     ],
     ...
   }],
   "web_accessible_resources": [{
     "matches": ["https://github.com/*", "https://github.example.com/*"]
   }]
   ```

3. Reload the extension in Chrome

## Server API

The server exposes these endpoints:

- `POST /writeFile` - Write markdown file
- `POST /readFile` - Read markdown file
- `GET /listFiles` - List all markdown files
- `POST /deleteFile` - Delete markdown file
- `POST /archiveFile` - Archive markdown file with timestamp
- `GET /getConfig` - Get current configuration
- `POST /updateConfig` - Update configuration
- `GET /getDefaultConfig` - Get default configuration values
- `POST /startSession` - Start Agent SDK session
- `POST /answerQuestions` - Answer questions via Agent SDK
- `POST /completeActions` - Complete actions via Agent SDK
- `GET /health` - Server health check

## Markdown File Format

### Questions File

```markdown
# Claude PR Review: myorg/myrepo - Feature Implementation

**PR Number:** #123
**Generated:** 2025-01-15T10:30:00.000Z

## Question 1

**File:** `src/server.js`
**Lines:** L42-L58
**Code:**
\```javascript
+ async function handleRequest(req, res) {
+   // ...
+ }
\```

**QUESTION:**
Why are we using async here instead of callbacks?

**ANSWER:**
_[Claude, please fill in your answer here]_
```

### Actions File

```markdown
# Claude Actions: myorg/myrepo

**PR Number:** #123
**Generated:** 2025-01-15T10:30:00.000Z

## Action 1

**File:** `src/utils.js`
**Lines:** L15-L20
**Type:** Question-Linked

**ORIGINAL QUESTION:**
Should we add error handling here?

**ORIGINAL ANSWER:**
Yes, we should wrap this in a try-catch block...

**ACTION:**
Add try-catch error handling as suggested

**SUMMARY:**
_[Claude, please fill in your action summary here]_
```

## Troubleshooting

**Server won't start:**
```bash
# Check port availability
lsof -i :47382

# Verify Node.js installation
node --version  # Should be v16 or higher
```

**Extension can't save files:**
- Verify server is running (`curl http://localhost:47382/health`)
- Check Chrome DevTools → Console for errors
- Ensure server directory has write permissions

**Agent SDK not working:**
- Set `ANTHROPIC_API_KEY` environment variable
- Check server logs for authentication errors
- Verify API key has sufficient credits

**GitHub Enterprise not working:**
- Set `GITHUB_ENTERPRISE_URL` environment variable
- Update extension manifest with your domain
- Reload extension after manifest changes

## Development

**Running in dev mode:**
```bash
cd server
npm install
node server.js
```

**Extension development:**
1. Make changes to `extension/` files
2. Go to `chrome://extensions/`
3. Click reload icon on the extension
4. Refresh GitHub page

**Testing Agent SDK:**
```bash
# Set up environment
export ANTHROPIC_API_KEY=your-key

# Run server with debug logging
DEBUG=* node server.js
```

## Security Notes

- Server runs locally only (`localhost:47382`)
- No data sent to external servers except Claude API
- Questions and actions stored locally in markdown files
- Agent SDK requires explicit user action (button click)
- Tool permissions configurable in Settings

## License

MIT

## Contributing

Contributions welcome! Please open an issue or PR.

## Credits

Built with:
- [Anthropic Claude Agent SDK](https://github.com/anthropics/anthropic-sdk-js)
- Chrome Extensions Manifest V3
- GitHub Primer CSS
