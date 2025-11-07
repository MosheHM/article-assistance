// hover-controller.js - Manages hover popup for word details

class HoverController {
  constructor(learnedWordsManager, visualOverlay) {
    this.learnedWordsManager = learnedWordsManager;
    this.visualOverlay = visualOverlay;
    this.popup = null;
    this.currentToken = null;
    this.hideTimeout = null;
    this.isMouseOverPopup = false;
  }

  initialize() {
    // Create popup element
    this.popup = document.createElement('div');
    this.popup.id = 'linguistic-popup';
    this.popup.className = 'linguistic-popup';
    document.body.appendChild(this.popup);

    // Add event listeners for popup
    this.popup.addEventListener('mouseenter', () => {
      this.isMouseOverPopup = true;
      clearTimeout(this.hideTimeout);
    });

    this.popup.addEventListener('mouseleave', () => {
      this.isMouseOverPopup = false;
      this.scheduleHide();
    });

    // Add event delegation for token hovers
    document.addEventListener('mouseover', (e) => {
      const token = e.target.closest('.linguistic-token');
      if (token) {
        this.handleTokenHover(e, token);
      }
    });

    document.addEventListener('mouseout', (e) => {
      const token = e.target.closest('.linguistic-token');
      if (token && !this.isMouseOverPopup) {
        this.scheduleHide();
      }
    });

    console.log('HoverController initialized');
  }

  handleTokenHover(event, tokenElement) {
    clearTimeout(this.hideTimeout);

    const token = {
      word: tokenElement.dataset.word,
      lemma: tokenElement.dataset.lemma,
      pos: tokenElement.dataset.pos,
      translation_he: tokenElement.dataset.translation,
      inflection: tokenElement.dataset.inflection
    };

    this.show(event, token, tokenElement);
  }

  show(event, token, tokenElement) {
    this.currentToken = token;

    // Check if word is learned
    const isLearned = this.learnedWordsManager.isLearned(
      token.lemma || token.word,
      token.pos
    );

    // Populate popup content
    this.popup.innerHTML = `
      <div class="popup-header">
        <span class="word-display">${this.escapeHtml(token.word)}</span>
        ${token.lemma && token.lemma !== token.word
          ? `<span class="lemma-display">${this.escapeHtml(token.lemma)}</span>`
          : ''}
      </div>
      <div class="popup-body">
        <div class="translation">
          <strong>תרגום:</strong> ${this.escapeHtml(token.translation_he || 'לא זמין')}
        </div>
        <div class="pos-info">
          <strong>סוג:</strong> ${this.getPOSHebrew(token.pos)}
        </div>
        ${token.inflection
          ? `<div class="inflection-info">
              <strong>הטיה:</strong> ${this.escapeHtml(token.inflection)}
            </div>`
          : ''}
      </div>
      <div class="popup-footer">
        ${isLearned
          ? `<button class="mark-learned-btn learned-btn" disabled>
              ✓ למדת מילה זו
            </button>`
          : `<button class="mark-learned-btn"
                data-lemma="${this.escapeHtml(token.lemma || token.word)}"
                data-pos="${this.escapeHtml(token.pos)}">
              ✓ למדתי מילה זו
            </button>`
        }
      </div>
    `;

    // Position popup
    this.positionPopup(tokenElement);

    // Show popup
    this.popup.classList.add('visible');

    // Attach learned button handler
    const learnedBtn = this.popup.querySelector('.mark-learned-btn');
    if (learnedBtn && !learnedBtn.disabled) {
      learnedBtn.onclick = () => this.markAsLearned(token);
    }
  }

  positionPopup(tokenElement) {
    const rect = tokenElement.getBoundingClientRect();
    const popupWidth = 300;
    const popupHeight = 200; // Approximate

    // Calculate position
    let left = rect.left + rect.width / 2 - popupWidth / 2;
    let top = rect.bottom + 10;

    // Boundary checks - horizontal
    if (left < 10) {
      left = 10;
    }
    if (left + popupWidth > window.innerWidth - 10) {
      left = window.innerWidth - popupWidth - 10;
    }

    // Boundary checks - vertical (show above if not enough space below)
    if (top + popupHeight > window.innerHeight - 10) {
      top = rect.top - popupHeight - 10;
    }

    this.popup.style.left = `${left}px`;
    this.popup.style.top = `${top}px`;
  }

  scheduleHide() {
    this.hideTimeout = setTimeout(() => {
      if (!this.isMouseOverPopup) {
        this.hide();
      }
    }, 300);
  }

  hide() {
    this.popup.classList.remove('visible');
    this.currentToken = null;
  }

  async markAsLearned(token) {
    const lemma = token.lemma || token.word;
    const pos = token.pos;

    try {
      const success = await this.learnedWordsManager.addWord(lemma, pos, token.translation_he);

      if (success) {
        // Update UI
        if (this.visualOverlay) {
          this.visualOverlay.updateLearnedWordStyling(lemma, pos);
        }

        // Show confirmation
        const btn = this.popup.querySelector('.mark-learned-btn');
        if (btn) {
          btn.textContent = '✓ נשמר!';
          btn.disabled = true;
          btn.classList.add('learned-btn');
        }

        // Auto-hide after short delay
        setTimeout(() => {
          this.hide();
        }, 1000);

        console.log(`Marked as learned: ${lemma} (${pos})`);
      }
    } catch (error) {
      console.error('Error marking word as learned:', error);

      // Show error in button
      const btn = this.popup.querySelector('.mark-learned-btn');
      if (btn) {
        btn.textContent = '✗ שגיאה';
        setTimeout(() => {
          btn.textContent = '✓ למדתי מילה זו';
        }, 2000);
      }
    }
  }

  getPOSHebrew(pos) {
    const mapping = {
      'NOUN': 'שם עצם',
      'VERB': 'פועל',
      'ADJ': 'תואר',
      'ADV': 'תואר פועל',
      'PREP': 'מילת יחס',
      'CONJ': 'מילת חיבור',
      'PRON': 'כינוי',
      'DET': 'מילת יידוע',
      'NUM': 'מספר',
      'INTJ': 'מילת קריאה',
      'UNKNOWN': 'לא ידוע'
    };
    return mapping[pos] || pos;
  }

  escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  destroy() {
    if (this.popup) {
      this.popup.remove();
      this.popup = null;
    }
    clearTimeout(this.hideTimeout);
    console.log('HoverController destroyed');
  }
}

// Make available globally
if (typeof window !== 'undefined') {
  window.HoverController = HoverController;
}
