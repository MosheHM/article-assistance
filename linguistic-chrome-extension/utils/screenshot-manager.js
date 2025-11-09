// screenshot-manager.js - Screenshot capture and viewport change detection

class ScreenshotManager {
  constructor() {
    this.currentViewport = null;
    this.scrollThreshold = 100; // pixels scrolled before showing re-analyze button
    this.reAnalyzeButton = null;
    this.onViewportChangeCallback = null;
  }

  /**
   * Capture current viewport screenshot via service worker
   * @returns {Promise<{dataUrl: string, base64: string, viewport: object}>}
   */
  async captureViewport() {
    return new Promise((resolve, reject) => {
      // Send message to service worker to capture screenshot
      chrome.runtime.sendMessage(
        { action: 'captureScreenshot' },
        (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(`Screenshot capture failed: ${chrome.runtime.lastError.message}`));
            return;
          }

          if (response.error) {
            reject(new Error(response.error));
            return;
          }

          // Store current viewport dimensions and scroll position
          this.currentViewport = this.getViewportInfo();

          resolve({
            dataUrl: response.dataUrl,
            base64: response.base64,
            viewport: this.currentViewport
          });
        }
      );
    });
  }

  /**
   * Get current viewport information
   * @returns {object} Viewport dimensions and scroll position
   */
  getViewportInfo() {
    return {
      width: window.innerWidth,
      height: window.innerHeight,
      scrollX: window.scrollX || window.pageXOffset,
      scrollY: window.scrollY || window.pageYOffset,
      devicePixelRatio: window.devicePixelRatio || 1,
      timestamp: Date.now()
    };
  }

  /**
   * Calculate SHA-256 hash of screenshot for caching
   * @param {string} base64Data - Base64 encoded screenshot data
   * @returns {Promise<string>} SHA-256 hash as hex string
   */
  async hashScreenshot(base64Data) {
    // Convert base64 to ArrayBuffer
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Hash the data
    const hashBuffer = await crypto.subtle.digest('SHA-256', bytes);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Check if viewport has changed significantly from when screenshot was taken
   * @returns {boolean} True if viewport has changed
   */
  hasViewportChanged() {
    if (!this.currentViewport) {
      return false;
    }

    const current = this.getViewportInfo();

    // Check for resize
    if (
      current.width !== this.currentViewport.width ||
      current.height !== this.currentViewport.height
    ) {
      return true;
    }

    // Check for significant scroll
    const scrollDeltaY = Math.abs(current.scrollY - this.currentViewport.scrollY);
    const scrollDeltaX = Math.abs(current.scrollX - this.currentViewport.scrollX);

    return scrollDeltaY > this.scrollThreshold || scrollDeltaX > this.scrollThreshold;
  }

  /**
   * Start monitoring for viewport changes
   * @param {Function} onChangeCallback - Called when viewport changes
   */
  startMonitoring(onChangeCallback) {
    this.onViewportChangeCallback = onChangeCallback;

    // Debounced scroll handler
    let scrollTimeout;
    const scrollHandler = () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        if (this.hasViewportChanged()) {
          this.showReAnalyzeButton();
        }
      }, 200);
    };

    // Immediate resize handler (clear overlay)
    const resizeHandler = () => {
      if (this.hasViewportChanged()) {
        if (this.onViewportChangeCallback) {
          this.onViewportChangeCallback('resize');
        }
      }
    };

    window.addEventListener('scroll', scrollHandler, { passive: true });
    window.addEventListener('resize', resizeHandler);

    // Store handlers for cleanup
    this._scrollHandler = scrollHandler;
    this._resizeHandler = resizeHandler;
  }

  /**
   * Stop monitoring viewport changes
   */
  stopMonitoring() {
    if (this._scrollHandler) {
      window.removeEventListener('scroll', this._scrollHandler);
    }
    if (this._resizeHandler) {
      window.removeEventListener('resize', this._resizeHandler);
    }
    this.hideReAnalyzeButton();
  }

  /**
   * Show floating re-analyze button
   */
  showReAnalyzeButton() {
    // Don't show if already visible
    if (this.reAnalyzeButton && document.body.contains(this.reAnalyzeButton)) {
      return;
    }

    this.hideReAnalyzeButton(); // Remove old button if exists

    const button = document.createElement('button');
    button.id = 'linguistic-reanalyze-btn';
    button.className = 'linguistic-reanalyze-button';
    button.innerHTML = `
      <span class="reanalyze-icon">📸</span>
      <span class="reanalyze-text">Re-analyze visible area</span>
    `;

    button.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 9999998;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      border-radius: 12px;
      padding: 12px 20px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      box-shadow: 0 4px 20px rgba(102, 126, 234, 0.4);
      display: flex;
      align-items: center;
      gap: 8px;
      transition: all 0.3s ease;
      animation: slideInUp 0.3s ease;
    `;

    button.addEventListener('mouseenter', () => {
      button.style.transform = 'translateY(-2px)';
      button.style.boxShadow = '0 6px 24px rgba(102, 126, 234, 0.5)';
    });

    button.addEventListener('mouseleave', () => {
      button.style.transform = 'translateY(0)';
      button.style.boxShadow = '0 4px 20px rgba(102, 126, 234, 0.4)';
    });

    button.addEventListener('click', () => {
      if (this.onViewportChangeCallback) {
        this.onViewportChangeCallback('reanalyze');
      }
    });

    this.reAnalyzeButton = button;
    document.body.appendChild(button);

    // Add animation keyframes if not already added
    if (!document.getElementById('linguistic-reanalyze-animations')) {
      const style = document.createElement('style');
      style.id = 'linguistic-reanalyze-animations';
      style.textContent = `
        @keyframes slideInUp {
          from {
            transform: translateY(100px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
      `;
      document.head.appendChild(style);
    }
  }

  /**
   * Hide re-analyze button
   */
  hideReAnalyzeButton() {
    if (this.reAnalyzeButton && document.body.contains(this.reAnalyzeButton)) {
      this.reAnalyzeButton.remove();
    }
    this.reAnalyzeButton = null;
  }

  /**
   * Reset viewport tracking
   */
  reset() {
    this.currentViewport = null;
    this.hideReAnalyzeButton();
  }

  /**
   * Check if page is a PDF
   * @returns {boolean}
   */
  isPDFPage() {
    return (
      document.contentType === 'application/pdf' ||
      window.location.href.toLowerCase().endsWith('.pdf') ||
      document.querySelector('embed[type="application/pdf"]') !== null
    );
  }
}

// Make available globally for content scripts
if (typeof window !== 'undefined') {
  window.ScreenshotManager = ScreenshotManager;
}
