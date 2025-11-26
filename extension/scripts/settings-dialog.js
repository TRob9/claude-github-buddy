/**
 * Settings dialog for Claude Agent permissions and directories
 */

async function showSettingsDialog() {
  const dialog = document.createElement('div');
  dialog.id = 'claude-settings-dialog';
  dialog.className = 'claude-dialog';

  // Load current permissions
  const permissionsResult = await chrome.storage.local.get('agent_permissions');
  const defaultPermissions = {
    Read: true,
    Grep: true,
    Glob: true,
    Bash: false,
    Write: false,
    Edit: false,
    WebSearch: false,
    WebFetch: false
  };
  const permissions = permissionsResult.agent_permissions || defaultPermissions;

  // Load default button action preference
  const buttonActionResult = await chrome.storage.local.get('default_button_action');
  const defaultButtonAction = buttonActionResult.default_button_action || 'question';

  // Load current directory config from server
  let currentConfig = {
    prReviewsDir: '~/claude-review/questions-and-actions',
    projectsDir: '~/Projects'
  };

  try {
    const response = await fetch('http://localhost:47382/getConfig');
    const result = await response.json();
    if (result.success) {
      currentConfig = result.config;
    }
  } catch (error) {
    console.error('Failed to load current config:', error);
  }

  const toolsHtml = Object.keys(defaultPermissions).map(tool => `
    <label class="permission-checkbox-label">
      <input type="checkbox"
             class="permission-checkbox"
             data-tool="${tool}"
             ${permissions[tool] ? 'checked' : ''}>
      <span class="permission-tool-name-label">${tool}</span>
      <span class="permission-tool-description">${getToolDescription(tool)}</span>
    </label>
  `).join('');

  dialog.innerHTML = `
    <div class="claude-dialog-content" style="max-width: 600px; max-height: 80vh; overflow-y: auto;">
      <h3>Settings</h3>

      <div style="margin-bottom: 24px;">
        <h4 style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600;">Default 'Claude' Button Action</h4>
        <p style="margin: 0 0 12px 0; color: #656d76; font-size: 13px;">
          Choose what happens when you click the main Claude button
        </p>
        <select id="claude-default-button-action" style="width: 100%; padding: 6px 8px; border: 1px solid #d0d7de; border-radius: 6px; font-size: 13px;">
          <option value="question" ${defaultButtonAction === 'question' ? 'selected' : ''}>Ask a Question</option>
          <option value="action" ${defaultButtonAction === 'action' ? 'selected' : ''}>Mark for Action</option>
        </select>
      </div>

      <div style="margin-bottom: 24px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <h4 style="margin: 0; font-size: 14px; font-weight: 600;">Directories</h4>
          <button type="button" id="claude-restore-defaults-btn" class="btn btn-sm" style="padding: 4px 8px; font-size: 12px;">Restore Defaults</button>
        </div>
        <p style="margin: 0 0 12px 0; color: #656d76; font-size: 13px;">
          Configure where repositories and review files are stored.
        </p>

        <div style="margin-bottom: 12px;">
          <label style="display: block; margin-bottom: 4px; font-weight: 500; font-size: 13px;">
            Projects Directory
          </label>
          <p style="margin: 0 0 6px 0; color: #656d76; font-size: 12px;">
            Where your git repositories are cloned and stored
          </p>
          <input type="text" id="claude-settings-projects-dir" value="${escapeHtml(currentConfig.projectsDir)}" style="width: 100%; padding: 6px 8px; border: 1px solid #d0d7de; border-radius: 6px; font-family: monospace; font-size: 12px;" placeholder="/Users/yourname/Projects">
        </div>

        <div style="margin-bottom: 12px;">
          <label style="display: block; margin-bottom: 4px; font-weight: 500; font-size: 13px;">
            Questions & Actions Directory
          </label>
          <p style="margin: 0 0 6px 0; color: #656d76; font-size: 12px;">
            Where Questions and Actions markdown files are saved
          </p>
          <input type="text" id="claude-settings-reviews-dir" value="${escapeHtml(currentConfig.prReviewsDir)}" style="width: 100%; padding: 6px 8px; border: 1px solid #d0d7de; border-radius: 6px; font-family: monospace; font-size: 12px;" placeholder="/Users/yourname/Documents/PR Reviews">
        </div>
      </div>

      <div style="margin-bottom: 16px;">
        <h4 style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600;">Agent Permissions</h4>
        <p style="margin: 0 0 12px 0; color: #656d76; font-size: 13px;">
          Configure which tools Claude can use automatically without asking for permission.
        </p>
        <div class="settings-permissions-list">
          ${toolsHtml}
        </div>
      </div>

      <div class="dialog-buttons" style="margin-top: 24px;">
        <button id="claude-save-settings">Save Settings</button>
        <button id="claude-cancel-settings">Cancel</button>
      </div>
    </div>
  `;

  document.body.appendChild(dialog);

  // Handle pasted paths - strip quotes if present (macOS copies paths with quotes)
  const projectsDirInput = document.getElementById('claude-settings-projects-dir');
  const reviewsDirInput = document.getElementById('claude-settings-reviews-dir');

  projectsDirInput.addEventListener('paste', (e) => {
    e.preventDefault();
    const pastedText = (e.clipboardData || window.clipboardData).getData('text');
    // Strip leading/trailing quotes and whitespace
    const cleanedPath = pastedText.trim().replace(/^['"]|['"]$/g, '');
    projectsDirInput.value = cleanedPath;
  });

  reviewsDirInput.addEventListener('paste', (e) => {
    e.preventDefault();
    const pastedText = (e.clipboardData || window.clipboardData).getData('text');
    // Strip leading/trailing quotes and whitespace
    const cleanedPath = pastedText.trim().replace(/^['"]|['"]$/g, '');
    reviewsDirInput.value = cleanedPath;
  });

  // Restore Defaults button
  document.getElementById('claude-restore-defaults-btn').addEventListener('click', async () => {
    try {
      const response = await fetch('http://localhost:47382/getDefaultConfig');
      const result = await response.json();

      if (result.success) {
        projectsDirInput.value = result.defaults.projectsDir;
        reviewsDirInput.value = result.defaults.prReviewsDir;
        showNotification('✅ Restored default directories');
      } else {
        alert('Failed to load default configuration');
      }
    } catch (error) {
      console.error('Error loading defaults:', error);
      alert('Failed to load default configuration. Make sure the server is running.');
    }
  });

  // Save button
  document.getElementById('claude-save-settings').addEventListener('click', async () => {
    // Save default button action
    const buttonAction = document.getElementById('claude-default-button-action').value;
    await chrome.storage.local.set({ default_button_action: buttonAction });
    console.log('[SETTINGS] Saved default button action:', buttonAction);

    // Save permissions
    const newPermissions = {};
    dialog.querySelectorAll('.permission-checkbox').forEach(checkbox => {
      const tool = checkbox.getAttribute('data-tool');
      newPermissions[tool] = checkbox.checked;
    });

    await chrome.storage.local.set({ agent_permissions: newPermissions });
    console.log('[SETTINGS] Saved permissions:', newPermissions);

    // Save directories
    const projectsDir = document.getElementById('claude-settings-projects-dir').value.trim();
    const reviewsDir = document.getElementById('claude-settings-reviews-dir').value.trim();

    if (!projectsDir || !reviewsDir) {
      alert('Both directories are required.');
      return;
    }

    try {
      const response = await fetch('http://localhost:47382/updateConfig', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectsDir: projectsDir,
          prReviewsDir: reviewsDir
        })
      });

      const result = await response.json();

      if (result.success) {
        showNotification('✅ Settings saved! Configuration reloaded.');
        dialog.remove();
      } else {
        alert('Failed to save directory settings: ' + result.error);
      }
    } catch (error) {
      console.error('Error saving directory settings:', error);
      alert('Failed to save directory settings. Make sure the server is running.');
    }
  });

  // Cancel button
  document.getElementById('claude-cancel-settings').addEventListener('click', () => {
    dialog.remove();
  });

  // Close on background click
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) {
      dialog.remove();
    }
  });
}

function getToolDescription(tool) {
  const descriptions = {
    Read: 'Read files from the repository (safe)',
    Grep: 'Search for text in files (safe)',
    Glob: 'Find files by pattern (safe)',
    Bash: 'Execute shell commands (requires approval)',
    Write: 'Create new files (requires approval)',
    Edit: 'Modify existing files (requires approval)',
    WebSearch: 'Search the web (requires approval)',
    WebFetch: 'Fetch web pages (requires approval)'
  };
  return descriptions[tool] || '';
}
