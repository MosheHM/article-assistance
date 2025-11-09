// content-script.js - Main orchestrator for Linguistic Lens

class LinguisticLens {
  constructor() {
    this.mode = 'quick';
    this.db = new DBManager();
    this.contentAnalyzer = new ContentAnalyzer();
    this.overlay = new VisualOverlay();
    this.learnedWords = new LearnedWordsManager();
    this.hoverController = null;
    this.isProcessing = false;
    this.isInitialized = false;
  }

  async initialize(mode = 'quick') {
    if (this.isProcessing) {
      console.log('Already processing, ignoring duplicate request');
      return;
    }

    this.isProcessing = true;
    this.mode = mode;

    try {
      console.log(`Initializing Linguistic Lens in ${mode} mode`);

      // Show cosmic blur animation
      showCosmicBlur();

      // Initialize components
      await this.db.initialize();
      await this.learnedWords.initialize();
      await this.overlay.initialize(this.learnedWords);

      // Initialize hover controller
      if (!this.hoverController) {
        this.hoverController = new HoverController(this.learnedWords, this.overlay);
        this.hoverController.initialize();
      }

      // Clean up old cache
      this.db.clearOldCache().catch(err => console.warn('Failed to clear old cache:', err));

      // Extract content
      console.log('Extracting article content...');
      const article = this.contentAnalyzer.extractMainContent();

      if (!article || !article.content || article.content.trim().length < 50) {
        throw new Error('Could not extract meaningful article content. Try selecting text manually or refreshing the page.');
      }

      console.log(`Extracted ${article.content.length} characters`);

      // Check if content is English
      if (!this.contentAnalyzer.isEnglishContent()) {
        throw new Error('This page does not appear to contain English text.');
      }

      // Check cache
      console.log('Checking cache...');
      const cached = await this.db.getCachedAnalysis(article.content);

      if (cached) {
        console.log('Using cached analysis');
        this.overlay.render(cached, article.element, this.mode);
        hideCosmicBlur();
        this.showSuccessMessage('Analysis loaded from cache!');
        this.isProcessing = false;
        this.isInitialized = true;
        return;
      }

      // Analyze with Gemini
      console.log('Analyzing with Gemini API...');
      updateCosmicBlurText('Sending to Gemini AI...');

      const analysis = await this.analyzeWithGemini(article.content, this.mode);

      if (!analysis || !analysis.sentences || analysis.sentences.length === 0) {
        throw new Error('Failed to get valid analysis from Gemini API');
      }

      console.log(`Received analysis for ${analysis.sentences.length} sentences`);

      // Cache result
      console.log('Caching analysis...');
      await this.db.saveAnalysis(article.content, analysis, this.mode);

      // Render
      console.log('Rendering overlay...');
      updateCosmicBlurText('Rendering analysis...');
      this.overlay.render(analysis, article.element, this.mode);

      hideCosmicBlur();
      this.showSuccessMessage(`Analysis complete! ${analysis.sentences.length} sentences analyzed.`);

      this.isProcessing = false;
      this.isInitialized = true;

      // Log stats
      const stats = this.overlay.getStats();
      console.log('Rendering stats:', stats);

    } catch (error) {
      console.error('Linguistic Lens error:', error);
      hideCosmicBlur();
      this.showError(error.message);
      this.isProcessing = false;
    }
  }

  async analyzeWithGemini(text, mode) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({
        action: 'analyze',
        text: text,
        mode: mode
      }, response => {
        if (chrome.runtime.lastError) {
          reject(new Error(`Communication error: ${chrome.runtime.lastError.message}`));
          return;
        }

        if (response.error) {
          reject(new Error(response.error));
        } else {
          resolve(response.analysis);
        }
      });
    });
  }

  showSuccessMessage(message) {
    const notification = this.createNotification(message, 'success');
    document.body.appendChild(notification);

    setTimeout(() => {
      notification.style.opacity = '0';
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }

  showError(message) {
    const notification = this.createNotification(`שגיאה: ${message}`, 'error');
    document.body.appendChild(notification);

    setTimeout(() => {
      notification.style.opacity = '0';
      setTimeout(() => notification.remove(), 300);
    }, 5000);
  }

  createNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `linguistic-notification linguistic-notification-${type}`;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${type === 'success' ? '#7ED321' : '#E24A4A'};
      color: white;
      padding: 16px 24px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      z-index: 9999999;
      max-width: 400px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
      font-size: 14px;
      font-weight: 600;
      transition: opacity 0.3s ease;
      direction: rtl;
    `;
    notification.textContent = message;
    return notification;
  }

  destroy() {
    if (this.hoverController) {
      this.hoverController.destroy();
    }
    if (this.overlay) {
      this.overlay.clear();
    }
    this.isInitialized = false;
    console.log('Linguistic Lens destroyed');
  }
}

// Cosmic blur animation functions
function showCosmicBlur() {
  // Remove existing overlay if present
  const existing = document.getElementById('linguistic-cosmic-blur');
  if (existing) {
    existing.remove();
  }

  const overlay = document.createElement('div');
  overlay.id = 'linguistic-cosmic-blur';
  overlay.className = 'cosmic-blur-overlay';
  overlay.innerHTML = `
    <div class="cosmic-content">
      <div class="cosmic-icon">🧠</div>
      <div class="cosmic-text">מנתח את המסמך...</div>
      <div class="cosmic-subtext">מזהה מבנה תחבירי ומילים</div>
      <div class="cosmic-progress">
        <div class="cosmic-progress-bar"></div>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
}

function updateCosmicBlurText(text) {
  const textEl = document.querySelector('.cosmic-text');
  if (textEl) {
    textEl.textContent = text;
  }
}

function hideCosmicBlur() {
  const overlay = document.getElementById('linguistic-cosmic-blur');
  if (overlay) {
    overlay.style.opacity = '0';
    overlay.style.transition = 'opacity 0.5s ease';
    setTimeout(() => overlay.remove(), 500);
  }
}

// Initialize global instance
let linguisticLensInstance = null;

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'activate') {
    console.log('Received activation message:', request.mode);

    // Destroy previous instance if exists
    if (linguisticLensInstance) {
      linguisticLensInstance.destroy();
    }

    // Create and initialize new instance
    linguisticLensInstance = new LinguisticLens();
    linguisticLensInstance.initialize(request.mode);

    sendResponse({ status: 'activated' });
  }

  return true; // Keep message channel open
});

// Log that content script is loaded
console.log('Linguistic Lens content script loaded');
