/**
 * Claude GitHub Buddy - Permission Dialog
 * Shows permission request dialog when Claude wants to use a tool
 */

/**
 * Show permission dialog and return user's decision
 */
async function showPermissionDialog(request) {
  return new Promise((resolve) => {
    const dialog = document.createElement('div');
    dialog.className = 'claude-permission-dialog-overlay';
    dialog.innerHTML = `
      <div class="claude-permission-dialog">
        <div class="permission-header">
          <h3>Claude wants to use a tool</h3>
        </div>
        <div class="permission-body">
          <div class="permission-tool-info">
            <label>Tool:</label>
            <span class="permission-tool-name">${escapeHtml(request.toolName)}</span>
          </div>
          <div class="permission-tool-input">
            <label>Action:</label>
            <pre>${escapeHtml(formatToolInput(request.toolName, request.input))}</pre>
          </div>
          ${request.decisionReason ? `
            <div class="permission-reason">
              <label>Why:</label>
              <span>${escapeHtml(request.decisionReason)}</span>
            </div>
          ` : ''}
        </div>
        <div class="permission-buttons">
          <button class="permission-btn permission-deny">Deny</button>
          <button class="permission-btn permission-approve">Approve Once</button>
          <button class="permission-btn permission-always">Always Allow</button>
        </div>
      </div>
    `;

    document.body.appendChild(dialog);

    // Handle Deny
    dialog.querySelector('.permission-deny').onclick = () => {
      dialog.remove();
      resolve({
        behavior: 'deny',
        message: 'User denied permission'
      });
    };

    // Handle Approve Once
    dialog.querySelector('.permission-approve').onclick = () => {
      dialog.remove();
      resolve({
        behavior: 'allow',
        updatedInput: request.input
      });
    };

    // Handle Always Allow
    dialog.querySelector('.permission-always').onclick = async () => {
      dialog.remove();

      // Save to settings
      await savePermissionSetting(request.toolName, true);

      // Update server immediately with new settings
      if (window.agentClient && window.agentClient.connected) {
        await window.agentClient.sendSettings();
      }

      resolve({
        behavior: 'allow',
        updatedInput: request.input
      });
    };

    // Close on background click
    dialog.addEventListener('click', (e) => {
      if (e.target === dialog) {
        dialog.remove();
        resolve({
          behavior: 'deny',
          message: 'User closed dialog'
        });
      }
    });
  });
}

/**
 * Format tool input for display
 */
function formatToolInput(toolName, input) {
  switch (toolName) {
    case 'Bash':
      return input.command || JSON.stringify(input, null, 2);

    case 'Read':
      return `Read file: ${input.file_path || input.path || JSON.stringify(input)}`;

    case 'Write':
      const content = input.content || '';
      const preview = content.length > 200 ? content.substring(0, 200) + '...' : content;
      return `Write to: ${input.file_path || input.path}\n\nContent:\n${preview}`;

    case 'Edit':
      const oldStr = input.old_string || '';
      const newStr = input.new_string || '';
      return `Edit file: ${input.file_path || input.path}\n\nReplace:\n${oldStr.substring(0, 100)}${oldStr.length > 100 ? '...' : ''}\n\nWith:\n${newStr.substring(0, 100)}${newStr.length > 100 ? '...' : ''}`;

    case 'Grep':
      return `Search for: "${input.pattern || input.regex}"\nIn: ${input.path || 'current directory'}`;

    case 'Glob':
      return `Find files: ${input.pattern || JSON.stringify(input)}`;

    case 'WebSearch':
      return `Search: "${input.query || JSON.stringify(input)}"`;

    case 'WebFetch':
      return `Fetch: ${input.url || JSON.stringify(input)}`;

    default:
      return JSON.stringify(input, null, 2);
  }
}

/**
 * Save permission setting to Chrome storage
 */
async function savePermissionSetting(toolName, autoApprove) {
  return new Promise((resolve) => {
    chrome.storage.local.get('agent_permissions', (result) => {
      const permissions = result.agent_permissions || {};
      permissions[toolName] = autoApprove;

      chrome.storage.local.set({ agent_permissions: permissions }, () => {
        console.log(`[PERMISSIONS] Saved: ${toolName} = ${autoApprove}`);

        // Show notification
        showNotification(`✅ ${toolName} will be auto-approved from now on`);

        resolve();
      });
    });
  });
}

/**
 * HTML escape helper
 */
function escapeHtml(text) {
  if (typeof text !== 'string') {
    text = String(text);
  }
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
