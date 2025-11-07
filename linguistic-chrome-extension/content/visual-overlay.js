// visual-overlay.js - Visual rendering of linguistic analysis

class VisualOverlay {
  constructor() {
    this.container = null;
    this.learnedWordsManager = null;
    this.mode = 'quick';
    this.renderedSentences = new Map();
  }

  async initialize(learnedWordsManager) {
    this.learnedWordsManager = learnedWordsManager;
    console.log('VisualOverlay initialized');
  }

  render(analysis, contentElement, mode = 'quick') {
    if (!analysis || !analysis.sentences) {
      console.error('Invalid analysis object');
      return;
    }

    this.mode = mode;
    console.log(`Rendering ${analysis.sentences.length} sentences in ${mode} mode`);

    // Process each sentence
    analysis.sentences.forEach(sentence => {
      this.renderSentence(sentence, contentElement);
    });

    console.log('Rendering complete');
  }

  renderSentence(sentence, contentElement) {
    // Find the sentence in the DOM
    const sentenceElement = this.findSentenceInDOM(sentence.text, contentElement);

    if (!sentenceElement) {
      console.warn('Could not find sentence in DOM:', sentence.text.substring(0, 50));
      return;
    }

    // Create wrapper for the sentence
    const wrapper = document.createElement('span');
    wrapper.className = 'linguistic-sentence';
    wrapper.dataset.sentenceId = sentence.id;

    // Render each token
    sentence.tokens.forEach((token, index) => {
      const tokenElement = this.createTokenElement(token, index);
      wrapper.appendChild(tokenElement);

      // Add space after token (if not punctuation)
      if (index < sentence.tokens.length - 1 && !this.isPunctuation(token.word)) {
        wrapper.appendChild(document.createTextNode(' '));
      }
    });

    // Replace text node with wrapper
    this.replaceTextContent(sentenceElement, sentence.text, wrapper);

    // Add dependency arcs for deep mode
    if (this.mode === 'deep' && sentence.dependencies) {
      this.renderDependencies(wrapper, sentence.dependencies);
    }

    this.renderedSentences.set(sentence.id, wrapper);
  }

  createTokenElement(token, index) {
    const span = document.createElement('span');
    span.className = `linguistic-token ${(token.pos || 'UNKNOWN').toLowerCase()}`;
    span.textContent = token.word;
    span.dataset.word = token.word;
    span.dataset.lemma = token.lemma || token.word;
    span.dataset.translation = token.translation_he || '';
    span.dataset.pos = token.pos || 'UNKNOWN';
    span.dataset.inflection = token.inflection || '';
    span.dataset.tokenIndex = token.index !== undefined ? token.index : index;

    // Check if word is learned
    if (this.learnedWordsManager) {
      const lemma = token.lemma || token.word;
      const pos = token.pos || 'UNKNOWN';

      if (this.learnedWordsManager.isLearned(lemma, pos)) {
        span.classList.add('learned');
      }
    }

    // Add micro POS tag
    const posTag = document.createElement('span');
    posTag.className = 'pos-tag';
    posTag.textContent = token.pos || '?';
    span.appendChild(posTag);

    return span;
  }

  findSentenceInDOM(sentenceText, container) {
    // Create a tree walker to find text nodes
    const walker = document.createTreeWalker(
      container,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: (node) => {
          // Skip script and style tags
          if (node.parentElement.tagName === 'SCRIPT' ||
              node.parentElement.tagName === 'STYLE') {
            return NodeFilter.FILTER_REJECT;
          }
          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );

    // Clean sentence text for comparison
    const cleanSentence = sentenceText.trim().replace(/\s+/g, ' ');

    let node;
    while (node = walker.nextNode()) {
      const nodeText = node.textContent.trim().replace(/\s+/g, ' ');

      if (nodeText.includes(cleanSentence)) {
        return node.parentElement;
      }
    }

    return null;
  }

  replaceTextContent(element, originalText, newElement) {
    // Walk through child nodes and replace text
    const walker = document.createTreeWalker(
      element,
      NodeFilter.SHOW_TEXT,
      null
    );

    const textNodes = [];
    let node;
    while (node = walker.nextNode()) {
      textNodes.push(node);
    }

    // Find text node containing our sentence
    const cleanOriginal = originalText.trim().replace(/\s+/g, ' ');

    for (const textNode of textNodes) {
      const nodeText = textNode.textContent.trim().replace(/\s+/g, ' ');

      if (nodeText.includes(cleanOriginal)) {
        // Replace this text node with our wrapper
        textNode.parentNode.replaceChild(newElement, textNode);
        return true;
      }
    }

    // Fallback: append to element
    element.appendChild(newElement);
    return false;
  }

  renderDependencies(sentenceElement, dependencies) {
    if (!dependencies || dependencies.length === 0) {
      return;
    }

    // Create SVG container for arcs
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.classList.add('dependency-arcs');
    svg.style.position = 'absolute';
    svg.style.top = '-60px';
    svg.style.left = '0';
    svg.style.width = '100%';
    svg.style.height = '60px';
    svg.style.pointerEvents = 'none';
    svg.style.zIndex = '10';

    dependencies.forEach(dep => {
      const fromToken = sentenceElement.querySelector(`[data-token-index="${dep.from_index}"]`);
      const toToken = sentenceElement.querySelector(`[data-token-index="${dep.to_index}"]`);

      if (!fromToken || !toToken) {
        return;
      }

      const fromRect = fromToken.getBoundingClientRect();
      const toRect = toToken.getBoundingClientRect();
      const containerRect = sentenceElement.getBoundingClientRect();

      const startX = fromRect.left - containerRect.left + fromRect.width / 2;
      const endX = toRect.left - containerRect.left + toRect.width / 2;
      const controlY = -40;

      // Create path
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      const midX = (startX + endX) / 2;
      path.setAttribute('d', `M ${startX} 0 Q ${midX} ${controlY}, ${endX} 0`);
      path.setAttribute('stroke', '#4A90E2');
      path.setAttribute('fill', 'none');
      path.setAttribute('stroke-width', '2');

      svg.appendChild(path);

      // Add label
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', midX);
      text.setAttribute('y', controlY - 5);
      text.setAttribute('font-size', '10');
      text.setAttribute('fill', '#666');
      text.setAttribute('text-anchor', 'middle');
      text.textContent = dep.relation || '';

      svg.appendChild(text);
    });

    // Make sentence element relative for absolute positioning
    sentenceElement.style.position = 'relative';
    sentenceElement.style.marginTop = '70px';
    sentenceElement.appendChild(svg);
  }

  isPunctuation(word) {
    return /^[.,!?;:'"()[\]{}]$/.test(word);
  }

  clear() {
    // Remove all linguistic elements
    document.querySelectorAll('.linguistic-token').forEach(el => {
      const parent = el.parentNode;
      const textNode = document.createTextNode(el.textContent);
      parent.replaceChild(textNode, el);
    });

    document.querySelectorAll('.linguistic-sentence').forEach(el => {
      el.remove();
    });

    document.querySelectorAll('.dependency-arcs').forEach(el => {
      el.remove();
    });

    this.renderedSentences.clear();
    console.log('Overlay cleared');
  }

  // Update learned word styling
  updateLearnedWordStyling(lemma, pos) {
    const selector = `[data-lemma="${lemma}"][data-pos="${pos}"]`;
    document.querySelectorAll(selector).forEach(el => {
      el.classList.add('learned');
    });
  }

  // Remove learned word styling
  removeLearnedWordStyling(lemma, pos) {
    const selector = `[data-lemma="${lemma}"][data-pos="${pos}"]`;
    document.querySelectorAll(selector).forEach(el => {
      el.classList.remove('learned');
    });
  }

  // Get statistics
  getStats() {
    return {
      sentencesRendered: this.renderedSentences.size,
      tokensRendered: document.querySelectorAll('.linguistic-token').length,
      learnedTokens: document.querySelectorAll('.linguistic-token.learned').length
    };
  }
}

// Make available globally
if (typeof window !== 'undefined') {
  window.VisualOverlay = VisualOverlay;
}
