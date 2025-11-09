// learned-words.js - Manage learned words tracking

class LearnedWordsManager {
  constructor() {
    this.learnedWords = new Set();
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) {
      return;
    }

    try {
      const stored = await chrome.storage.local.get('learnedWords');
      this.learnedWords = new Set(stored.learnedWords || []);
      this.initialized = true;
      console.log(`Loaded ${this.learnedWords.size} learned words`);
    } catch (error) {
      console.error('Error loading learned words:', error);
      this.learnedWords = new Set();
      this.initialized = true;
    }
  }

  async addWord(lemma, pos, translation = '') {
    const wordKey = this.createKey(lemma, pos);

    if (this.learnedWords.has(wordKey)) {
      console.log(`Word already learned: ${lemma} (${pos})`);
      return false;
    }

    this.learnedWords.add(wordKey);

    try {
      await chrome.storage.local.set({
        learnedWords: Array.from(this.learnedWords)
      });
      console.log(`Added learned word: ${lemma} (${pos})`);
      return true;
    } catch (error) {
      console.error('Error saving learned word:', error);
      this.learnedWords.delete(wordKey);
      return false;
    }
  }

  async removeWord(lemma, pos) {
    const wordKey = this.createKey(lemma, pos);

    if (!this.learnedWords.has(wordKey)) {
      console.log(`Word not in learned list: ${lemma} (${pos})`);
      return false;
    }

    this.learnedWords.delete(wordKey);

    try {
      await chrome.storage.local.set({
        learnedWords: Array.from(this.learnedWords)
      });
      console.log(`Removed learned word: ${lemma} (${pos})`);
      return true;
    } catch (error) {
      console.error('Error removing learned word:', error);
      this.learnedWords.add(wordKey);
      return false;
    }
  }

  isLearned(lemma, pos) {
    const wordKey = this.createKey(lemma, pos);
    return this.learnedWords.has(wordKey);
  }

  createKey(lemma, pos) {
    return `${lemma.toLowerCase()}:${pos.toUpperCase()}`;
  }

  async clearAll() {
    this.learnedWords.clear();

    try {
      await chrome.storage.local.set({
        learnedWords: []
      });
      console.log('All learned words cleared');
      return true;
    } catch (error) {
      console.error('Error clearing learned words:', error);
      return false;
    }
  }

  getCount() {
    return this.learnedWords.size;
  }

  getAll() {
    return Array.from(this.learnedWords).map(key => {
      const [lemma, pos] = key.split(':');
      return { lemma, pos, key };
    });
  }

  async exportToJSON() {
    const words = this.getAll();
    return JSON.stringify(words, null, 2);
  }

  async importFromJSON(jsonString) {
    try {
      const words = JSON.parse(jsonString);

      if (!Array.isArray(words)) {
        throw new Error('Invalid format: expected array');
      }

      const validWords = words.filter(w => w.lemma && w.pos);
      const wordKeys = validWords.map(w => this.createKey(w.lemma, w.pos));

      this.learnedWords = new Set(wordKeys);

      await chrome.storage.local.set({
        learnedWords: Array.from(this.learnedWords)
      });

      console.log(`Imported ${this.learnedWords.size} learned words`);
      return true;
    } catch (error) {
      console.error('Error importing learned words:', error);
      return false;
    }
  }

  // Listen for storage changes from other tabs
  setupSyncListener() {
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName === 'local' && changes.learnedWords) {
        const newWords = changes.learnedWords.newValue || [];
        this.learnedWords = new Set(newWords);
        console.log('Learned words synced from storage');

        // Trigger UI update event
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('learnedWordsUpdated', {
            detail: { count: this.learnedWords.size }
          }));
        }
      }
    });
  }
}

// Make available globally for content scripts
if (typeof window !== 'undefined') {
  window.LearnedWordsManager = LearnedWordsManager;
}
