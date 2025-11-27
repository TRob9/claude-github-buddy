/**
 * Agent Monitor Panel - Interactive Claude Agent Monitoring
 * Shows real-time logs, allows interrupts, and provides stop functionality
 */

class AgentMonitorPanel {
  constructor() {
    this.panel = null;
    this.logContainer = null;
    this.interruptInput = null;
    this.isOpen = false;
    this.autoScroll = true;
    this.logs = [];
  }

  /**
   * Open the monitor panel
   */
  open() {
    if (this.panel) {
      this.panel.style.display = 'flex';
      this.isOpen = true;
      return;
    }

    this.createPanel();
    this.isOpen = true;
  }

  /**
   * Close the monitor panel (hide, don't destroy)
   */
  close() {
    if (this.panel) {
      this.panel.style.display = 'none';
      this.isOpen = false;

      // Update button state if agent is still running
      const btn = document.getElementById('claude-complete-actions-btn');
      if (btn && btn.getAttribute('data-state') === 'running') {
        btn.innerHTML = 'View Progress';
      }
    }
  }

  /**
   * Destroy the panel completely
   */
  destroy() {
    if (this.panel) {
      this.panel.remove();
      this.panel = null;
      this.logContainer = null;
      this.interruptInput = null;
      this.isOpen = false;
      this.logs = [];
    }
  }

  /**
   * Create the panel UI
   */
  createPanel() {
    this.panel = document.createElement('div');
    this.panel.className = 'claude-agent-monitor-overlay';
    this.panel.innerHTML = `
      <div class="claude-agent-monitor-panel">
        <div class="monitor-header">
          <div class="monitor-title">
            <svg aria-hidden="true" focusable="false" viewBox="0 0 8 8" width="20" height="20" fill="currentColor">
              <g fill="currentColor">
                <rect x="1.5" y="1" width="5" height="3.5"/>
                <rect x="0" y="2.25" width="1.5" height="1.25"/>
                <rect x="6.5" y="2.25" width="1.5" height="1.25"/>
                <rect x="1.5" y="4.5" width="1" height="1.5"/>
                <rect x="2.75" y="4.5" width="1" height="1.5"/>
                <rect x="4.25" y="4.5" width="1" height="1.5"/>
                <rect x="5.5" y="4.5" width="1" height="1.5"/>
              </g>
              <g fill="none" stroke="none">
                <rect x="2.5" y="2" width="0.75" height="1.25" fill="#f6f8fa"/>
                <rect x="4.75" y="2" width="0.75" height="1.25" fill="#f6f8fa"/>
              </g>
            </svg>
            <span>Claude Agent Monitor</span>
            <span class="monitor-pulse-indicator" id="monitor-pulse-indicator" style="display: none;">
              <span class="pulse-dot"></span>
              <span class="pulse-text">Working...</span>
            </span>
          </div>
          <div class="monitor-controls">
            <button class="monitor-close-btn" title="Close">×</button>
          </div>
        </div>

        <div class="monitor-log-container" id="monitor-log-container">
          <div class="monitor-log" id="monitor-log"></div>
        </div>

        <div class="monitor-interrupt">
          <textarea
            id="monitor-interrupt-input"
            placeholder="Type a correction or instruction to interrupt Claude..."
            rows="2"
          ></textarea>
          <div class="monitor-actions">
            <button class="monitor-send-btn" id="monitor-send-interrupt">Send Interrupt</button>
            <button class="monitor-stop-btn" id="monitor-stop-agent">Stop Agent</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(this.panel);

    // Get references
    this.logContainer = document.getElementById('monitor-log-container');
    this.log = document.getElementById('monitor-log');
    this.interruptInput = document.getElementById('monitor-interrupt-input');

    // Add event listeners
    this.panel.querySelector('.monitor-close-btn').addEventListener('click', () => this.close());

    document.getElementById('monitor-send-interrupt').addEventListener('click', () => this.sendInterrupt());
    document.getElementById('monitor-stop-agent').addEventListener('click', () => this.stopAgent());

    // Auto-scroll toggle on manual scroll
    this.logContainer.addEventListener('scroll', () => {
      const isAtBottom = this.logContainer.scrollHeight - this.logContainer.scrollTop === this.logContainer.clientHeight;
      this.autoScroll = isAtBottom;
    });
  }

  /**
   * Add log entry
   */
  addLog(message, type = 'info') {
    const timestamp = new Date().toLocaleTimeString();
    const entry = { timestamp, message, type };
    this.logs.push(entry);

    if (!this.log) return;

    const logEntry = document.createElement('div');
    logEntry.className = `log-entry log-${type}`;

    logEntry.innerHTML = `
      <span class="log-timestamp">[${timestamp}]</span>
      <span class="log-message">${this.escapeHtml(message)}</span>
    `;

    this.log.appendChild(logEntry);

    // Auto-scroll if enabled
    if (this.autoScroll) {
      this.logContainer.scrollTop = this.logContainer.scrollHeight;
    }
  }

  /**
   * Update status (no-op - status bar removed)
   */
  updateStatus(status, turnCount = null, currentTool = null) {
    // Status bar removed - do nothing
  }

  /**
   * Clear all logs
   */
  clearLogs() {
    this.logs = [];
    if (this.log) {
      this.log.innerHTML = '';
    }
  }

  /**
   * Send interrupt message to Claude
   */
  sendInterrupt() {
    const message = this.interruptInput.value.trim();
    if (!message) {
      alert('Please enter a correction or instruction');
      return;
    }

    this.addLog(`USER INTERRUPT: ${message}`, 'interrupt');

    // Send interrupt to agent via WebSocket
    if (window.agentClient) {
      window.agentClient.sendInterrupt(message);
    }

    // Clear input
    this.interruptInput.value = '';
  }

  /**
   * Stop the agent
   */
  stopAgent() {
    if (!confirm('Stop Claude agent? This will abort the current task.')) {
      return;
    }

    this.addLog('User requested stop', 'error');
    this.updateStatus('Stopping...', null, 'Aborting...');

    // Send stop signal via WebSocket
    if (window.agentClient) {
      window.agentClient.stopAgent();
    }
  }

  /**
   * Start pulse indicator (agent is working)
   */
  startPulse() {
    const pulseIndicator = document.getElementById('monitor-pulse-indicator');
    if (pulseIndicator) {
      pulseIndicator.style.display = 'inline-flex';
    }
  }

  /**
   * Stop pulse indicator (agent is idle/complete)
   */
  stopPulse() {
    const pulseIndicator = document.getElementById('monitor-pulse-indicator');
    if (pulseIndicator) {
      pulseIndicator.style.display = 'none';
    }
  }

  /**
   * Escape HTML for safe display
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Format tool input for display
   */
  formatToolInput(toolName, input) {
    if (typeof input === 'string') {
      // Truncate long strings
      if (input.length > 200) {
        return input.substring(0, 200) + '...';
      }
      return input;
    }

    if (typeof input === 'object') {
      // Format as JSON
      return JSON.stringify(input, null, 2);
    }

    return String(input);
  }

  /**
   * Handle tool use
   */
  onToolUse(toolName, input) {
    const formatted = this.formatToolInput(toolName, input);
    this.addLog(`${toolName}: ${formatted}`, 'tool');
    this.updateStatus('Running', null, `${toolName}...`);
  }

  /**
   * Handle tool result
   */
  onToolResult(toolName, result, success = true) {
    if (success) {
      this.addLog(`✓ ${toolName} completed`, 'success');
    } else {
      this.addLog(`✗ ${toolName} failed: ${result}`, 'error');
    }
  }

  /**
   * Handle thinking/assistant message
   */
  onThinking(message) {
    this.addLog(message, 'thinking');
  }

  /**
   * Handle completion
   */
  onComplete() {
    this.updateStatus('Complete', null, 'Finished');
    this.addLog('Task completed successfully!', 'success');
  }

  /**
   * Handle error
   */
  onError(error) {
    this.updateStatus('Error', null, 'Failed');
    this.addLog(`Error: ${error}`, 'error');
  }
}

// Global instance
window.agentMonitorPanel = new AgentMonitorPanel();
