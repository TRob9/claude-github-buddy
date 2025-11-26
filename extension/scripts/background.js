// Claude GitHub Buddy - Background Script
// Handles file system operations via native messaging

console.log('Claude GitHub Buddy background script loaded');

// Test if native messaging host is visible to Chrome
chrome.runtime.onStartup.addListener(() => {
  console.log('Extension started, testing native host connection...');
  testNativeHost();
});

// Also test on install
chrome.runtime.onInstalled.addListener(() => {
  console.log('Extension installed/updated, testing native host connection...');
  testNativeHost();
});

// Test immediately on load
testNativeHost();

async function testNativeHost() {
  try {
    const response = await fetch('http://localhost:47382/health');
    const result = await response.json();
    console.log('✅ Server is running:', result);
  } catch (error) {
    console.warn('⚠️ Server not running. Start it by double-clicking "Start Server.command"');
  }
}

// Listen for messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Background received message:', request);

  if (request.action === 'exportToMarkdown') {
    console.log('Exporting to markdown:', request.prInfo);
    exportToMarkdown(request.prInfo, request.questions)
      .then((response) => {
        console.log('Export successful:', response);
        sendResponse({ success: true });
      })
      .catch(error => {
        console.error('Export failed:', error);
        sendResponse({ success: false, error: error.message });
      });
    return true; // Keep channel open for async response
  }

  if (request.action === 'importFromMarkdown') {
    console.log('Importing from markdown:', request.prInfo);
    importFromMarkdown(request.prInfo)
      .then(data => {
        console.log('Import successful:', data);
        sendResponse({ success: true, data });
      })
      .catch(error => {
        console.error('Import failed:', error);
        sendResponse({ success: false, error: error.message });
      });
    return true;
  }

  if (request.action === 'exportToActions') {
    console.log('Exporting to actions:', request.prInfo);
    exportToActions(request.prInfo, request.actions)
      .then((response) => {
        console.log('Actions export successful:', response);
        sendResponse({ success: true });
      })
      .catch(error => {
        console.error('Actions export failed:', error);
        sendResponse({ success: false, error: error.message });
      });
    return true;
  }

  if (request.action === 'importFromActions') {
    console.log('Importing from actions:', request.prInfo);
    importFromActions(request.prInfo)
      .then(data => {
        console.log('Actions import successful:', data);
        sendResponse({ success: true, data });
      })
      .catch(error => {
        console.error('Actions import failed:', error);
        sendResponse({ success: false, error: error.message });
      });
    return true;
  }

  if (request.action === 'archiveFile') {
    console.log('Archiving file:', request.filename);
    archiveFile(request.filename)
      .then(() => {
        console.log('Archive successful');
        sendResponse({ success: true });
      })
      .catch(error => {
        console.error('Archive failed:', error);
        sendResponse({ success: false, error: error.message });
      });
    return true;
  }
});

function sanitizeFilename(str) {
  return str.replace(/[^a-z0-9-_]/gi, '_').substring(0, 100);
}

function getTodayDate() {
  const now = new Date();
  return now.toISOString().split('T')[0]; // Returns YYYY-MM-DD
}

function sanitizeFolderName(str) {
  // More permissive - only remove truly problematic characters for folder names
  // Allow spaces, #, and most punctuation
  return str.replace(/[\/\\:*?"<>|]/g, '_');
}

async function exportToMarkdown(prInfo, questions) {
  // Structure: {repo_name}/PR-{pr_number}/Questions {date}.md
  const repoName = prInfo.fullRepoName.split('/')[1]; // Extract repo part (e.g., fabric-credit-card-repayments)
  const prFolder = `PR-${prInfo.prNumber}`; // e.g., "PR-168"
  const dateStr = getTodayDate();
  const filename = `${repoName}/${prFolder}/Questions ${dateStr}.md`;
  const content = generateMarkdown(prInfo, questions);

  console.log('Sending to local server:', { filename, contentLength: content.length });

  try {
    const response = await fetch('http://localhost:47382/writeFile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename, content })
    });

    const result = await response.json();
    console.log('Server response:', result);

    if (!result.success) {
      throw new Error(result.error || 'Failed to write file');
    }

    return result;
  } catch (error) {
    console.error('Server error:', error);
    throw new Error('Server not running. Please start the server by double-clicking "Start Server.command"');
  }
}

async function importFromMarkdown(prInfo) {
  console.log('[IMPORT] Starting import with prInfo:', prInfo);

  // Structure: {repo_name}/PR-{pr_number}/Questions {date}.md
  const repoName = prInfo.fullRepoName.split('/')[1];
  const prFolder = `PR-${prInfo.prNumber}`;
  const dateStr = getTodayDate();
  const filename = `${repoName}/${prFolder}/Questions ${dateStr}.md`;

  console.log('[IMPORT] Constructed filename:', filename);
  console.log('[IMPORT] Repo name:', repoName);
  console.log('[IMPORT] PR folder:', prFolder);

  const requestPayload = { filename };
  console.log('[IMPORT] Request payload:', JSON.stringify(requestPayload, null, 2));

  const response = await fetch('http://localhost:47382/readFile', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestPayload)
  });

  console.log('[IMPORT] Response status:', response.status);
  const result = await response.json();
  console.log('[IMPORT] Response body:', result);

  if (result.success) {
    const parsed = parseMarkdown(result.content);
    const storageKey = `pr_${prInfo.fullRepoName}_${prInfo.prNumber}`;
    await chrome.storage.local.set({ [storageKey]: parsed });
    return parsed;
  }

  throw new Error(result.error || 'Failed to read file');
}

function generateMarkdown(prInfo, questions) {
  let md = `# Claude PR Review: ${prInfo.fullRepoName} - ${prInfo.prTitle}\n\n`;
  md += `**PR Number:** #${prInfo.prNumber}\n`;
  md += `**Base Branch:** \`${prInfo.baseBranch || 'unknown'}\`\n`;
  md += `**Head Branch:** \`${prInfo.headBranch || 'unknown'}\`\n`;
  md += `**Generated:** ${new Date().toISOString()}\n\n`;
  md += `---\n\n`;
  const repoName = prInfo.fullRepoName.split('/')[1];
  const prFolder = `PR-${prInfo.prNumber}`;
  const dateStr = getTodayDate();
  const questionFileName = `Questions ${dateStr}.md`;

  md += `Hi Claude! I'm reviewing PR #${prInfo.prNumber} which merges \`${prInfo.headBranch}\` into \`${prInfo.baseBranch}\`.\n\n`;
  md += `**CRITICAL INSTRUCTION:** Work through these questions COMPLETELY AUTONOMOUSLY. Do NOT stop to ask for assistance, clarification, or confirmation at any point. It is ABSOLUTELY ESSENTIAL that you complete ALL questions entirely self-directed without pausing or requesting help. You MUST proceed through every question without interruption. If you encounter any uncertainty, make your best technical judgment and continue. DO NOT STOP until all questions are answered.\n\n`;
  md += `**Repository Status:**\n`;
  md += `- You are already in the repository directory: \`${prInfo.fullRepoName}\`\n`;
  md += `- The branch \`${prInfo.headBranch}\` is already checked out and up-to-date\n`;
  md += `- DO NOT clone or checkout - everything is ready\n\n`;
  md += `**Your task:**\n`;
  md += `1. Verify you're in the repository with \`pwd\` and \`git branch\`\n`;
  md += `2. Perform a diff between \`${prInfo.baseBranch}\` and \`${prInfo.headBranch}\` to see all changes\n`;
  md += `3. Review each code snippet below with full file context from the checked-out branch\n`;
  md += `4. Consider surrounding code, imports, function definitions, and patterns across the codebase\n`;
  md += `5. **IMPORTANT:** Some questions below may already have answers - ONLY answer questions with placeholder text like "_[Claude, please fill in your answer here]_"\n`;
  md += `6. SKIP any questions that already have complete answers - do NOT re-answer them\n`;
  md += `7. For EACH UNANSWERED question, use the Edit tool to replace the placeholder text with your actual answer\n`;
  md += `8. You MUST use Edit tool on THIS markdown file to fill in all answers - do not just output text\n`;
  md += `9. Keep answers concise but thorough\n`;
  md += `10. Do NOT start your answer with a heading that repeats the question\n\n`;
  md += `---\n\n`;

  questions.forEach((q, index) => {
    const isAnswered = q.answer && q.answer.trim().length > 0;
    md += `## Question ${index + 1}`;
    md += isAnswered ? ` ✅ ALREADY ANSWERED - SKIP THIS\n\n` : ` ⚠️ NEEDS ANSWER\n\n`;
    md += `**File:** \`${q.file}\`\n`;
    md += `**Lines:** ${q.lines}\n`;
    md += `**Timestamp:** ${q.timestamp}\n\n`;
    md += `**Code:**\n\`\`\`\n${q.code}\n\`\`\`\n\n`;
    md += `**QUESTION:**\n${q.question}\n\n`;
    md += `**ANSWER:**\n`;
    md += q.answer || '_[Claude, please fill in your answer here]_';
    md += `\n\n---\n\n`;
  });

  return md;
}

function parseMarkdown(content) {
  const questions = [];
  const questionBlocks = content.split(/##\s+Question\s+\d+/);

  questionBlocks.slice(1).forEach(block => {
    const fileMatch = block.match(/\*\*File:\*\*\s*`([^`]+)`/);
    const linesMatch = block.match(/\*\*Lines:\*\*\s*([^\n]+)/);
    const timestampMatch = block.match(/\*\*Timestamp:\*\*\s*([^\n]+)/);
    const codeMatch = block.match(/\*\*Code:\*\*\s*```([^`]+)```/s);
    const questionMatch = block.match(/\*\*QUESTION:\*\*\s*([^*]+?)\s*\*\*ANSWER:\*\*/s);
    const answerMatch = block.match(/\*\*ANSWER:\*\*\s*(.+?)(?=---|$)/s);

    if (fileMatch && questionMatch) {
      const answer = answerMatch ? answerMatch[1].trim() : '';
      questions.push({
        file: fileMatch[1],
        lines: linesMatch ? linesMatch[1].trim() : 'unknown',
        timestamp: timestampMatch ? timestampMatch[1].trim() : new Date().toISOString(),
        code: codeMatch ? codeMatch[1].trim() : '',
        question: questionMatch[1].trim(),
        answer: answer && !answer.includes('[Claude, please fill') ? answer : undefined
      });
    }
  });

  return questions;
}

// ============ ACTIONS FUNCTIONS ============

async function exportToActions(prInfo, actions) {
  // Structure: {repo_name}/PR-{pr_number}/Actions {date}.md
  const repoName = prInfo.fullRepoName.split('/')[1];
  const prFolder = `PR-${prInfo.prNumber}`;
  const dateStr = getTodayDate();
  const filename = `${repoName}/${prFolder}/Actions ${dateStr}.md`;
  const content = generateActionsMarkdown(prInfo, actions);

  console.log('Sending actions to local server:', { filename, contentLength: content.length });

  try {
    const response = await fetch('http://localhost:47382/writeFile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename, content })
    });

    const result = await response.json();
    console.log('Server response:', result);

    if (!result.success) {
      throw new Error(result.error || 'Failed to write actions file');
    }

    return result;
  } catch (error) {
    console.error('Server error:', error);
    throw new Error('Server not running. Please start the server by double-clicking "Start Server.command"');
  }
}

async function importFromActions(prInfo) {
  console.log('[IMPORT ACTIONS] Starting import with prInfo:', prInfo);

  const repoName = prInfo.fullRepoName.split('/')[1];
  const prFolder = `PR-${prInfo.prNumber}`;
  const dateStr = getTodayDate();
  const filename = `${repoName}/${prFolder}/Actions ${dateStr}.md`;

  console.log('[IMPORT ACTIONS] Constructed filename:', filename);

  const response = await fetch('http://localhost:47382/readFile', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filename })
  });

  const result = await response.json();

  if (result.success) {
    const parsed = parseActionsMarkdown(result.content);
    const storageKey = `actions_${prInfo.fullRepoName}_${prInfo.prNumber}`;
    await chrome.storage.local.set({ [storageKey]: parsed });
    return parsed;
  }

  throw new Error(result.error || 'Failed to read actions file');
}

function generateActionsMarkdown(prInfo, actions) {
  const repoName = prInfo.fullRepoName.split('/')[1];
  const prFolder = `PR-${prInfo.prNumber}`;
  const dateStr = getTodayDate();
  const actionsFileName = `Actions ${dateStr}.md`;

  let md = `# Claude Actions: ${prInfo.fullRepoName} - ${prInfo.prTitle}\n\n`;
  md += `**PR Number:** #${prInfo.prNumber}\n`;
  md += `**Base Branch:** \`${prInfo.baseBranch || 'unknown'}\`\n`;
  md += `**Head Branch:** \`${prInfo.headBranch || 'unknown'}\`\n`;
  md += `**Generated:** ${new Date().toISOString()}\n\n`;
  md += `---\n\n`;
  md += `Hi Claude! I've reviewed PR #${prInfo.prNumber} and marked some code sections for action.\n\n`;
  md += `**CRITICAL INSTRUCTION:** Work through these actions COMPLETELY AUTONOMOUSLY. Do NOT stop to ask for assistance, clarification, or confirmation at any point. It is ABSOLUTELY ESSENTIAL that you complete ALL actions entirely self-directed without pausing or requesting help. You MUST proceed through every action without interruption. If you encounter any uncertainty, make your best technical judgment and continue. DO NOT STOP until all actions are completed.\n\n`;
  md += `**Repository Status:**\n`;
  md += `- You are already in the repository directory: \`${prInfo.fullRepoName}\`\n`;
  md += `- The branch \`${prInfo.headBranch}\` is already checked out and up-to-date\n`;
  md += `- DO NOT clone or checkout - everything is ready\n\n`;
  md += `**Your task:**\n`;
  md += `1. Verify you're in the repository with \`pwd\` and \`git branch\`\n`;
  md += `2. Perform a diff between \`${prInfo.baseBranch}\` and \`${prInfo.headBranch}\` to see all changes\n`;
  md += `3. Review each code snippet below with full file context from the checked-out branch\n`;
  md += `4. Consider surrounding code, imports, function definitions, and patterns across the codebase\n`;
  md += `5. **IMPORTANT:** Some actions below may already be completed - ONLY complete actions with placeholder text like "_[Claude, please fill in your action summary here]_"\n`;
  md += `6. SKIP any actions that already have complete summaries - do NOT re-do them\n`;
  md += `7. For EACH INCOMPLETE action, complete the requested work and use the Edit tool to replace the placeholder in the SUMMARY section\n`;
  md += `8. You MUST use Edit tool on THIS markdown file to fill in all summaries - do not just output text\n`;
  md += `9. In each SUMMARY, describe: what files you changed, what modifications you made, what tests you ran, and the results\n`;
  md += `10. Before committing: Assess whether your changes impact runtime behavior\n`;
  md += `11. If changes are non-functional (comments, documentation, formatting only), skip tests/linting\n`;
  md += `12. If changes impact code logic, data flow, or functionality: Run all tests (unit, blackbox), linting, and checks (check Makefile if present)\n`;
  md += `13. Ensure all tests and checks pass before committing any functional changes\n`;
  md += `14. Keep summaries concise but thorough - include enough detail for the reviewer to understand what was done\n`;
  md += `15. Do NOT leave summaries blank or with placeholder text\n`;
  md += `16. Do NOT start your summary with a heading that repeats the action\n`;
  md += `17. FINAL STEP: Before finishing, use Read tool to verify THIS file has all SUMMARY sections filled in\n`;
  md += `18. If any summaries are missing or incomplete, edit them NOW before finishing\n`;
  md += `19. DO NOT say "ready to wrap up" or "all done" until you have verified ALL summaries are complete\n\n`;
  md += `---\n\n`;

  actions.forEach((a, index) => {
    const isCompleted = a.summary && a.summary.trim().length > 0;
    md += `## Action ${index + 1}`;
    md += isCompleted ? ` ✅ ALREADY COMPLETED - SKIP THIS\n\n` : ` ⚠️ NEEDS COMPLETION\n\n`;
    md += `**File:** \`${a.file}\`\n`;
    md += `**Lines:** ${a.lines}\n`;
    md += `**Timestamp:** ${a.timestamp}\n`;
    md += `**Type:** ${a.questionIndex !== undefined ? 'Question-linked' : 'Ad-hoc'}\n\n`;
    md += `**Code:**\n\`\`\`\n${a.code}\n\`\`\`\n\n`;

    // Include question/answer if this is a question-linked action
    if (a.question && a.answer) {
      md += `**ORIGINAL QUESTION:**\n${a.question}\n\n`;
      md += `**ORIGINAL ANSWER:**\n${a.answer}\n\n`;
    }

    md += `**ACTION:**\n${a.action}\n\n`;
    md += `**SUMMARY:**\n`;
    md += a.summary || '_[Claude, please fill in your action summary here]_';
    md += `\n\n---\n\n`;
  });

  return md;
}

function parseActionsMarkdown(content) {
  const actions = [];
  const actionBlocks = content.split(/##\s+Action\s+\d+/);

  actionBlocks.slice(1).forEach(block => {
    const fileMatch = block.match(/\*\*File:\*\*\s*`([^`]+)`/);
    const linesMatch = block.match(/\*\*Lines:\*\*\s*([^\n]+)/);
    const timestampMatch = block.match(/\*\*Timestamp:\*\*\s*([^\n]+)/);
    const typeMatch = block.match(/\*\*Type:\*\*\s*([^\n]+)/);
    const codeMatch = block.match(/\*\*Code:\*\*\s*```([^`]+)```/s);
    const questionMatch = block.match(/\*\*ORIGINAL QUESTION:\*\*\s*([^*]+?)(?=\*\*ORIGINAL ANSWER:|\*\*ACTION:)/s);
    const answerMatch = block.match(/\*\*ORIGINAL ANSWER:\*\*\s*([^*]+?)(?=\*\*ACTION:)/s);
    const actionMatch = block.match(/\*\*ACTION:\*\*\s*([^*]+?)\s*\*\*SUMMARY:\*\*/s);
    const summaryMatch = block.match(/\*\*SUMMARY:\*\*\s*(.+?)(?=---|$)/s);

    if (fileMatch && actionMatch) {
      const summary = summaryMatch ? summaryMatch[1].trim() : '';
      const action = {
        file: fileMatch[1],
        lines: linesMatch ? linesMatch[1].trim() : 'unknown',
        timestamp: timestampMatch ? timestampMatch[1].trim() : new Date().toISOString(),
        code: codeMatch ? codeMatch[1].trim() : '',
        action: actionMatch[1].trim(),
        summary: summary && !summary.includes('[Claude, please fill') ? summary : undefined
      };

      // Add question/answer if present (question-linked action)
      if (questionMatch && answerMatch) {
        action.question = questionMatch[1].trim();
        action.answer = answerMatch[1].trim();
      }

      actions.push(action);
    }
  });

  return actions;
}

// ============ ARCHIVE FUNCTION ============

async function archiveFile(filename) {
  console.log('Archiving file to server:', filename);

  try {
    const response = await fetch('http://localhost:47382/archiveFile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename })
    });

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Failed to archive file');
    }

    console.log('File archived successfully:', result.archivePath);
    return result;
  } catch (error) {
    console.error('Error archiving file:', error);
    throw new Error('Server not running. Please start the server by double-clicking "Start Server.command"');
  }
}
