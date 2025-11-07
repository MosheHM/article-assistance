// popup.js - Extension popup controller

document.addEventListener('DOMContentLoaded', async () => {
  const apiKeySection = document.getElementById('apiKeySection');
  const apiKeyInput = document.getElementById('apiKeyInput');
  const saveApiKeyBtn = document.getElementById('saveApiKeyBtn');
  const apiKeyStatus = document.getElementById('apiKeyStatus');
  const modeSection = document.getElementById('modeSection');
  const quickModeBtn = document.getElementById('quickModeBtn');
  const deepModeBtn = document.getElementById('deepModeBtn');
  const statusMessage = document.getElementById('statusMessage');
  const settingsLink = document.getElementById('settingsLink');

  // Check if API key exists
  const stored = await chrome.storage.local.get('geminiApiKey');
  const hasApiKey = stored.geminiApiKey && stored.geminiApiKey.length > 0;

  if (hasApiKey) {
    apiKeySection.classList.add('hidden');
    apiKeyStatus.textContent = '✓ מפתח API נשמר';
    apiKeyStatus.classList.add('success');
  } else {
    modeSection.style.opacity = '0.5';
    modeSection.style.pointerEvents = 'none';
  }

  // Save API key
  saveApiKeyBtn.addEventListener('click', async () => {
    const apiKey = apiKeyInput.value.trim();

    if (!apiKey) {
      showStatus('נא להזין מפתח API', 'error');
      return;
    }

    // Basic validation
    if (!apiKey.startsWith('AIza')) {
      showStatus('מפתח API לא תקין (צריך להתחיל ב-AIza)', 'error');
      return;
    }

    try {
      await chrome.storage.local.set({ geminiApiKey: apiKey });
      apiKeySection.classList.add('hidden');
      modeSection.style.opacity = '1';
      modeSection.style.pointerEvents = 'auto';
      showStatus('מפתח API נשמר בהצלחה!', 'success');
    } catch (error) {
      showStatus('שגיאה בשמירת המפתח', 'error');
      console.error(error);
    }
  });

  // Quick mode button
  quickModeBtn.addEventListener('click', async () => {
    if (!hasApiKey && !apiKeyInput.value.trim()) {
      showStatus('נא להזין מפתח API תחילה', 'error');
      return;
    }

    activateExtension('quick');
  });

  // Deep mode button
  deepModeBtn.addEventListener('click', async () => {
    if (!hasApiKey && !apiKeyInput.value.trim()) {
      showStatus('נא להזין מפתח API תחילה', 'error');
      return;
    }

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

  // Show/hide API key input
  apiKeyInput.addEventListener('focus', () => {
    apiKeyInput.type = 'text';
  });

  apiKeyInput.addEventListener('blur', () => {
    apiKeyInput.type = 'password';
  });
});
