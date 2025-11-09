// content-script.js - Main orchestrator for Linguistic Lens (Screenshot-based)

class LinguisticLens {
  constructor() {
    this.mode = 'quick';
    this.db = new DBManager();
    this.screenshotManager = new ScreenshotManager();
    this.overlay = new CoordinateOverlay();
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
      console.log(`📸 Initializing Linguistic Lens in ${mode} mode (screenshot-based)`);

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

      // Capture screenshot
      console.log('📸 Capturing screenshot...');
      updateCosmicBlurText('מצלם מסך...');

      const screenshot = await this.screenshotManager.captureViewport();
      console.log(`📸 Screenshot captured: ${screenshot.viewport.width}x${screenshot.viewport.height}`);

      // Hash screenshot for caching
      console.log('🔍 Hashing screenshot for cache lookup...');
      const screenshotHash = await this.screenshotManager.hashScreenshot(screenshot.base64);
      console.log(`🔍 Screenshot hash: ${screenshotHash.substring(0, 16)}...`);

      // Check cache
      console.log('📦 Checking cache...');
      const cached = await this.db.getCachedScreenshotAnalysis(screenshotHash);

      if (cached) {
        console.log('✓ Using cached screenshot analysis');
        this.overlay.render(cached, screenshot.viewport, this.mode);
        hideCosmicBlur();
        this.showSuccessMessage('Analysis loaded from cache!');
        this.isProcessing = false;
        this.isInitialized = true;

        // Start monitoring for viewport changes
        this.startViewportMonitoring();
        return;
      }

      // Analyze screenshot with Gemini Vision API
      console.log('🤖 Analyzing screenshot with Gemini Vision API...');
      updateCosmicBlurText('שולח ל-Gemini Vision AI...');

      const analysis = await this.analyzeScreenshotWithGemini(screenshot.base64, screenshot.viewport, this.mode);

      if (!analysis || !analysis.words || analysis.words.length === 0) {
        throw new Error('Failed to get valid analysis from Gemini Vision API');
      }

      console.log(`✓ Received analysis for ${analysis.words.length} words`);

      // Cache result
      console.log('💾 Caching screenshot analysis...');
      await this.db.saveScreenshotAnalysis(screenshotHash, screenshot.viewport, analysis, this.mode);

      // Render coordinate overlay
      console.log('🎨 Rendering coordinate overlay...');
      updateCosmicBlurText('מציג ניתוח...');
      this.overlay.render(analysis, screenshot.viewport, this.mode);

      hideCosmicBlur();
      this.showSuccessMessage(`Analysis complete! ${analysis.words.length} words analyzed.`);

      this.isProcessing = false;
      this.isInitialized = true;

      // Start monitoring for viewport changes
      this.startViewportMonitoring();

      // Log stats
      const stats = this.overlay.getStats();
      console.log('📊 Rendering stats:', stats);

    } catch (error) {
      console.error('❌ Linguistic Lens error:', error);
      hideCosmicBlur();
      this.showError(error.message);
      this.isProcessing = false;
    }
  }

  async analyzeScreenshotWithGemini(screenshotBase64, viewport, mode) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({
        action: 'analyzeScreenshot',
        screenshot: screenshotBase64,
        viewport: viewport,
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

  /**
   * Start monitoring for viewport changes (scroll/resize)
   */
  startViewportMonitoring() {
    this.screenshotManager.startMonitoring((changeType) => {
      if (changeType === 'resize') {
        // Clear overlay on resize
        console.log('📐 Viewport resized, clearing overlay');
        this.overlay.clear();
        this.screenshotManager.hideReAnalyzeButton();
        this.showSuccessMessage('Viewport changed - please re-activate extension');
        this.isInitialized = false;
      } else if (changeType === 'reanalyze') {
        // User clicked re-analyze button
        console.log('🔄 Re-analyzing new viewport');
        this.overlay.clear();
        this.screenshotManager.reset();
        this.initialize(this.mode);
      }
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
