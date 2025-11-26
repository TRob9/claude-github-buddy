/**
 * Claude GitHub Buddy - Actions Confirmation Dialog
 * Shows warning dialog before starting actions in browser
 */

/**
 * Show actions confirmation dialog and return user's decision
 */
async function showActionsConfirmationDialog(prInfo) {
  return new Promise((resolve) => {
    const dialog = document.createElement('div');
    dialog.className = 'claude-permission-dialog-overlay';
    dialog.innerHTML = `
      <div class="claude-permission-dialog" style="max-width: 600px;">
        <div class="permission-header">
          <h3>⚠️ Start Actions in Browser?</h3>
        </div>
        <div class="permission-body">
          <div style="margin-bottom: 16px; line-height: 1.6;">
            <p style="margin-bottom: 12px;">
              <strong>Important:</strong> The browser-based Claude UI has limited visibility of instances where Claude gets stuck or stops early.
            </p>
            <p style="margin-bottom: 0;">
              For more complex tasks, or when there are a large number of actions required, it is recommended that you copy and paste the prompt directly into a terminal-based Claude Code instance for improved visibility.
            </p>
          </div>
        </div>
        <div class="permission-buttons">
          <button class="permission-btn permission-deny" style="height: 28px;">Cancel</button>
          <button class="permission-btn permission-approve" style="background: #ffb3ba; color: #d6336c; border-color: #ffb3ba; height: 28px;">Continue in Browser</button>
          <button class="permission-btn permission-copy-prompt" id="copy-prompt-instead-btn" style="background: #ffb3ba; color: #d6336c; border-color: #ffb3ba; height: 28px;">Copy Prompt Instead</button>
        </div>
      </div>
    `;

    document.body.appendChild(dialog);

    // Handle Cancel
    dialog.querySelector('.permission-deny').onclick = () => {
      dialog.remove();
      resolve({ proceed: false });
    };

    // Handle Copy Prompt Instead
    dialog.querySelector('.permission-copy-prompt').onclick = async () => {
      const btn = dialog.querySelector('.permission-copy-prompt');
      const originalText = btn.innerHTML;

      try {
        btn.disabled = true;
        btn.innerHTML = 'Copying...';

        // Check ultrathink checkbox state from main UI
        const ultrathinkCheckbox = document.getElementById('claude-ultrathink-checkbox');
        const useUltrathink = ultrathinkCheckbox?.checked || false;

        const result = await copyActionPromptToClipboard(prInfo, useUltrathink);
        showNotification(`✅ Action prompt copied to clipboard!\nFile: ${result.filePath.split('/').slice(-3).join('/')}`);

        dialog.remove();
        resolve({ proceed: false, copied: true });
      } catch (error) {
        console.error('[COPY-PROMPT] Error:', error);
        showNotification(`❌ Failed to copy prompt: ${error.message}`);
        btn.disabled = false;
        btn.innerHTML = originalText;
      }
    };

    // Handle Continue in Browser
    dialog.querySelector('.permission-approve').onclick = () => {
      dialog.remove();
      resolve({ proceed: true });
    };

    // Close on background click
    dialog.addEventListener('click', (e) => {
      if (e.target === dialog) {
        dialog.remove();
        resolve({ proceed: false });
      }
    });

    // Close on Escape key
    const escapeHandler = (e) => {
      if (e.key === 'Escape') {
        dialog.remove();
        document.removeEventListener('keydown', escapeHandler);
        resolve({ proceed: false });
      }
    };
    document.addEventListener('keydown', escapeHandler);
  });
}

/**
 * Generate action prompt for local Claude Code
 */
async function generateActionPrompt(prInfo, useUltrathink = false) {
  // Get the actions file path from the server config
  let questionsDir;
  try {
    const configResponse = await fetch('http://localhost:47382/getConfig');
    const data = await configResponse.json();
    questionsDir = data.config?.prReviewsDir;
  } catch (error) {
    console.warn('[GENERATE-PROMPT] Failed to fetch config, using default:', error);
  }

  // Fallback to default if config fetch failed or questionsDir is undefined
  if (!questionsDir) {
    // Default path - adjust based on your setup
    questionsDir = '~/questions and actions';
  }

  const repoName = prInfo.fullRepoName.split('/')[1];
  const prFolder = `PR-${prInfo.prNumber}`;
  const dateStr = new Date().toISOString().split('T')[0];
  const actionsFileName = `Actions ${dateStr}.md`;
  const actionsFilePath = `${questionsDir}/${repoName}/${prFolder}/${actionsFileName}`;

  let prompt = '';

  if (useUltrathink) {
    prompt = `IMPORTANT: <extended_thinking> for this task.\n\n`;
  }

  prompt += `Read the file at: ${actionsFilePath}

Follow the instructions in the **ACTION:** sections for each action item.
After completing each action, fill in the **SUMMARY:** section with what you did.

Repository: ${prInfo.fullRepoName}
Branch: ${prInfo.headBranch}
PR: #${prInfo.prNumber}
PR Title: ${prInfo.prTitle}

IMPORTANT: The Actions file is separate from the repository. Do not commit it to git.`;

  return { prompt, filePath: actionsFilePath };
}

/**
 * Copy action prompt to clipboard
 */
async function copyActionPromptToClipboard(prInfo, useUltrathink = false) {
  const { prompt, filePath } = await generateActionPrompt(prInfo, useUltrathink);
  await navigator.clipboard.writeText(prompt);
  return { success: true, prompt, filePath };
}
