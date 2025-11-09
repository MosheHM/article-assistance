// coordinate-overlay.js - Coordinate-based overlay rendering (replaces visual-overlay.js)

class CoordinateOverlay {
  constructor() {
    this.overlayContainer = null;
    this.learnedWordsManager = null;
    this.mode = 'quick';
    this.viewport = null;
    this.renderedWords = new Map();
    this.posColors = {
      noun: { bg: 'rgba(74, 144, 226, 0.15)', border: '#4A90E2' },     // Blue
      verb: { bg: 'rgba(231, 76, 60, 0.15)', border: '#E74C3C' },      // Red
      adj: { bg: 'rgba(46, 204, 113, 0.15)', border: '#2ECC71' },      // Green
      adv: { bg: 'rgba(230, 126, 34, 0.15)', border: '#E67E22' },      // Orange
      prep: { bg: 'rgba(155, 89, 182, 0.15)', border: '#9B59B6' },     // Purple
      conj: { bg: 'rgba(26, 188, 156, 0.15)', border: '#1ABC9C' },     // Turquoise
      pron: { bg: 'rgba(231, 76, 181, 0.15)', border: '#E74CB5' },     // Pink
      det: { bg: 'rgba(149, 165, 166, 0.15)', border: '#95A5A6' },     // Gray
      num: { bg: 'rgba(241, 196, 15, 0.15)', border: '#F1C40F' },      // Yellow
      intj: { bg: 'rgba(192, 57, 43, 0.15)', border: '#C0392B' }       // Dark Red
    };
  }

  async initialize(learnedWordsManager) {
    this.learnedWordsManager = learnedWordsManager;
    console.log('CoordinateOverlay initialized');
  }

  /**
   * Render word overlays from vision API analysis
   * @param {object} analysis - Vision API response with words and bboxes
   * @param {object} viewport - Viewport dimensions
   * @param {string} mode - 'quick' or 'deep'
   */
  render(analysis, viewport, mode = 'quick') {
    if (!analysis || !analysis.words) {
      console.error('Invalid analysis object for coordinate overlay');
      return;
    }

    this.mode = mode;
    this.viewport = viewport;
    console.log(`Rendering ${analysis.words.length} words in ${mode} mode`);

    // Clear any existing overlay
    this.clear();

    // Create transparent overlay container
    this.overlayContainer = this.createOverlayContainer();
    document.body.appendChild(this.overlayContainer);

    // Render each word as a positioned box
    analysis.words.forEach((word, index) => {
      this.renderWordBox(word, index);
    });

    console.log('Coordinate overlay rendering complete');
  }

  /**
   * Create the main overlay container
   * @returns {HTMLElement}
   */
  createOverlayContainer() {
    const container = document.createElement('div');
    container.id = 'linguistic-coordinate-overlay';
    container.className = 'linguistic-coordinate-overlay';

    // Use absolute positioning relative to the document
    // This ensures coordinates align with the page content regardless of scroll position
    container.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 9999997;
      overflow: visible;
    `;

    return container;
  }

  /**
   * Render a single word as a positioned box
   * @param {object} word - Word data with bbox, text, pos, translation, etc.
   * @param {number} index - Word index
   */
  renderWordBox(word, index) {
    // Check if word is learned (hide if it is)
    if (this.learnedWordsManager && this.isWordLearned(word)) {
      return; // Don't render learned words
    }

    // Scale normalized bounding box (0-1000) to viewport pixels
    const coords = this.scaleCoordinates(word.bbox, this.viewport);

    if (!coords) {
      console.warn('Invalid bbox for word:', word.text);
      return;
    }

    // Create word box element
    const wordBox = document.createElement('div');
    wordBox.className = `linguistic-word-box linguistic-word-box-${(word.pos || 'unknown').toLowerCase()}`;
    wordBox.dataset.index = index;
    wordBox.dataset.word = word.text;
    wordBox.dataset.lemma = word.lemma || word.text;
    wordBox.dataset.pos = word.pos || 'UNKNOWN';
    wordBox.dataset.translation = word.translation_he || '';
    wordBox.dataset.inflection = word.inflection || '';

    // Get POS-based colors
    const colors = this.getPOSColors(word.pos);

    // Position and style the box
    wordBox.style.cssText = `
      position: absolute;
      left: ${coords.x}px;
      top: ${coords.y}px;
      width: ${coords.width}px;
      height: ${coords.height}px;
      pointer-events: auto;
      cursor: pointer;
      background-color: ${colors.bg};
      border: 2px solid transparent;
      border-radius: 3px;
      transition: all 0.2s ease;
      box-sizing: border-box;
    `;

    // Add hover effects
    wordBox.addEventListener('mouseenter', () => {
      wordBox.style.borderColor = colors.border;
      wordBox.style.backgroundColor = colors.bg.replace('0.15', '0.25');
      wordBox.style.transform = 'scale(1.05)';
      wordBox.style.zIndex = '9999999';
    });

    wordBox.addEventListener('mouseleave', () => {
      wordBox.style.borderColor = 'transparent';
      wordBox.style.backgroundColor = colors.bg;
      wordBox.style.transform = 'scale(1)';
      wordBox.style.zIndex = 'auto';
    });

    this.overlayContainer.appendChild(wordBox);
    this.renderedWords.set(index, wordBox);
  }

  /**
   * Scale normalized bounding box coordinates (0-1000) to viewport pixels
   * and adjust for scroll position when screenshot was captured
   * @param {number[]} bbox - [ymin, xmin, ymax, xmax] in 0-1000 scale
   * @param {object} viewport - {width, height, scrollX, scrollY}
   * @returns {object} {x, y, width, height} in pixels (document coordinates)
   */
  scaleCoordinates(bbox, viewport) {
    if (!bbox || bbox.length !== 4 || !viewport) {
      return null;
    }

    const [ymin, xmin, ymax, xmax] = bbox;

    // Convert 0-1000 normalized to 0-1 range
    const x1 = xmin / 1000;
    const y1 = ymin / 1000;
    const x2 = xmax / 1000;
    const y2 = ymax / 1000;

    // Scale to viewport dimensions
    const x = x1 * viewport.width;
    const y = y1 * viewport.height;
    const width = (x2 - x1) * viewport.width;
    const height = (y2 - y1) * viewport.height;

    // Add scroll offset to convert from viewport coordinates to document coordinates
    // The screenshot captured the visible viewport at a specific scroll position
    // We need to position the overlay at that same location in the document
    const scrollX = viewport.scrollX || 0;
    const scrollY = viewport.scrollY || 0;

    return { 
      x: x + scrollX, 
      y: y + scrollY, 
      width, 
      height 
    };
  }

  /**
   * Get POS-based colors
   * @param {string} pos - Part of speech tag
   * @returns {object} {bg, border}
   */
  getPOSColors(pos) {
    const posLower = (pos || 'unknown').toLowerCase();
    return this.posColors[posLower] || { bg: 'rgba(200, 200, 200, 0.15)', border: '#CCCCCC' };
  }

  /**
   * Check if word is learned
   * @param {object} word - Word data
   * @returns {boolean}
   */
  isWordLearned(word) {
    if (!this.learnedWordsManager) {
      return false;
    }

    const lemma = word.lemma || word.text;
    const pos = word.pos || 'UNKNOWN';
    return this.learnedWordsManager.isLearned(lemma, pos);
  }

  /**
   * Clear all overlays
   */
  clear() {
    if (this.overlayContainer && document.body.contains(this.overlayContainer)) {
      this.overlayContainer.remove();
    }
    this.overlayContainer = null;
    this.renderedWords.clear();
  }

  /**
   * Get rendering stats
   * @returns {object}
   */
  getStats() {
    return {
      totalWords: this.renderedWords.size,
      mode: this.mode,
      viewport: this.viewport
    };
  }

  /**
   * Update overlay for learned word changes
   */
  async refreshForLearnedWords() {
    // Remove boxes for newly learned words
    this.renderedWords.forEach((element, index) => {
      const word = {
        text: element.dataset.word,
        lemma: element.dataset.lemma,
        pos: element.dataset.pos
      };

      if (this.isWordLearned(word)) {
        element.remove();
        this.renderedWords.delete(index);
      }
    });
  }

  /**
   * Add a word box back after unlearning
   * @param {object} word - Word data
   * @param {number} index - Word index
   */
  showWordBox(word, index) {
    if (!this.renderedWords.has(index)) {
      this.renderWordBox(word, index);
    }
  }
}

// Make available globally for content scripts
if (typeof window !== 'undefined') {
  window.CoordinateOverlay = CoordinateOverlay;
}
