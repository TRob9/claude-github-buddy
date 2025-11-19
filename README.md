# Claude GitHub Buddy

A Chrome extension that brings a Claude assistant directly into the "Files Changed" section of GitHub PRs, allowing you to ask questions inline about code changes, mark sections for action, and let Claude answer or implement changes at your instruction - all from your browser. Features an in-browser streaming interface for viewing Claude’s live logs, enabling you to redirect it with new prompts if it deviates, or immediately terminate the session if needed.

## Features

- **Ask Questions**: Highlight code in PR diffs and ask Claude questions about it
- **Mark for Action**: Flag code sections that need changes and give Claude instructions
- **Auto-Answer**: Claude can answer all your questions in one go via Agent SDK
- **Auto-Complete Actions**: Claude can implement marked actions directly in the repository
- **Inline Display**: Answers and actions appear as GitHub-style comments in the PR
- **Markdown Files**: Questions and actions saved to markdown files for review and version control

## Screenshots
<img width="679" height="154" alt="image" src="https://github.com/user-attachments/assets/b7d1162c-45e8-4b26-ac1b-47b1fbd93c69" />
<img width="622" height="153" alt="image" src="https://github.com/user-attachments/assets/3ce5e022-4846-4605-bca4-4f2299612b0d" />
<img width="460" height="408" alt="image" src="https://github.com/user-attachments/assets/b6dcad32-842f-452e-9c48-d19d39ec5875" />
<img width="545" height="411" alt="image" src="https://github.com/user-attachments/assets/58caaebb-d74c-4daf-a89d-4cef38a0fb10" />
<img width="925" height="246" alt="image" src="https://github.com/user-attachments/assets/22f39319-cd24-41d8-8113-e2c52176b572" />






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

**Chrome/Edge/Brave/Opera:**
1. Open `chrome://extensions/` (or `edge://extensions/` for Edge)
2. Enable "Developer mode" (top-right toggle)
3. Click "Load unpacked"
4. Select the `extension/` folder

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
- `ANTHROPIC_VERTEX_PROJECT_ID` - GCP project ID for Vertex AI
- `CLOUD_ML_REGION` - GCP region for Vertex AI

**Example:**
```bash
export ANTHROPIC_API_KEY=your-api-key
node server.js
```

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
- [Anthropic Claude Agent SDK](https://docs.claude.com/en/docs/agent-sdk/overview)
- Chrome Extensions Manifest V3
- GitHub Primer CSS
