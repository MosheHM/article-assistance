// popup.js - Extension popup controller
// API key is now configured by the developer in config.js

document.addEventListener('DOMContentLoaded', async () => {
  const quickModeBtn = document.getElementById('quickModeBtn');
  const deepModeBtn = document.getElementById('deepModeBtn');
  const statusMessage = document.getElementById('statusMessage');
  const settingsLink = document.getElementById('settingsLink');

  // Quick mode button
  quickModeBtn.addEventListener('click', async () => {
    activateExtension('quick');
  });

  // Deep mode button
  deepModeBtn.addEventListener('click', async () => {
    activateExtension('deep');
  });

  // Settings link
  settingsLink.addEventListener('click', (e) => {
    e.preventDefault();
    chrome.tabs.create({ url: chrome.runtime.getURL('ui/settings.html') });
  });

  // Activate extension on current tab
  async function activateExtension(mode) {
    try {
      showStatus(`מפעיל מצב ${mode === 'quick' ? 'מהיר' : 'מתקדם'}...`, 'success');

      // Get active tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      if (!tab) {
        showStatus('לא נמצא טאב פעיל', 'error');
        return;
      }

      // Send message to content script
      chrome.tabs.sendMessage(tab.id, {
        action: 'activate',
        mode: mode
      }, (response) => {
        if (chrome.runtime.lastError) {
          showStatus('שגיאה: נא לרענן את הדף ולנסות שוב', 'error');
          console.error(chrome.runtime.lastError);
        } else {
          showStatus('מנתח את הדף...', 'success');
          setTimeout(() => window.close(), 1500);
        }
      });

    } catch (error) {
      showStatus('שגיאה בהפעלת התוסף', 'error');
      console.error(error);
    }
  }

  // Show status message
  function showStatus(message, type = 'success') {
    statusMessage.textContent = message;
    statusMessage.className = `status-message visible ${type}`;

    setTimeout(() => {
      statusMessage.classList.remove('visible');
    }, 3000);
  }
});
