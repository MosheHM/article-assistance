// db-manager.js - IndexedDB management for caching analyses

class DBManager {
  constructor() {
    this.dbName = 'LinguisticLensDB';
    this.version = 1;
    this.db = null;
  }

  async initialize() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => {
        console.error('Failed to open IndexedDB:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('IndexedDB initialized successfully');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Store for analyses
        if (!db.objectStoreNames.contains('analyses')) {
          const analysisStore = db.createObjectStore('analyses', { keyPath: 'id' });
          analysisStore.createIndex('url', 'url', { unique: false });
          analysisStore.createIndex('timestamp', 'timestamp', { unique: false });
          console.log('Created "analyses" object store');
        }

        // Store for learned words (backup to chrome.storage)
        if (!db.objectStoreNames.contains('learnedWords')) {
          const wordsStore = db.createObjectStore('learnedWords', { keyPath: 'key' });
          wordsStore.createIndex('learnedAt', 'learnedAt', { unique: false });
          console.log('Created "learnedWords" object store');
        }
      };
    });
  }

  async getCachedAnalysis(content) {
    if (!this.db) {
      console.warn('Database not initialized');
      return null;
    }

    const hash = await this.hashContent(content);

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['analyses'], 'readonly');
      const store = transaction.objectStore('analyses');
      const request = store.get(hash);

      request.onsuccess = () => {
        const result = request.result;

        // Check if cache is still valid (7 days)
        if (result && Date.now() - result.timestamp < 7 * 24 * 60 * 60 * 1000) {
          console.log('Cache hit for content');
          resolve(result.analysis);
        } else {
          if (result) {
            console.log('Cache expired for content');
          } else {
            console.log('Cache miss for content');
          }
          resolve(null);
        }
      };

      request.onerror = () => {
        console.error('Error retrieving cached analysis:', request.error);
        reject(request.error);
      };
    });
  }

  async saveAnalysis(content, analysis, mode) {
    if (!this.db) {
      console.warn('Database not initialized');
      return;
    }

    const hash = await this.hashContent(content);

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['analyses'], 'readwrite');
      const store = transaction.objectStore('analyses');

      const data = {
        id: hash,
        url: window.location.href,
        timestamp: Date.now(),
        mode: mode,
        analysis: analysis
      };

      const request = store.put(data);

      request.onsuccess = () => {
        console.log('Analysis cached successfully');
        resolve();
      };

      request.onerror = () => {
        console.error('Error caching analysis:', request.error);
        reject(request.error);
      };
    });
  }

  async hashContent(content) {
    // Create SHA-256 hash of content for cache key
    const encoder = new TextEncoder();
    const data = encoder.encode(content);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  async clearOldCache() {
    if (!this.db) {
      console.warn('Database not initialized');
      return;
    }

    // Remove entries older than 7 days
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['analyses'], 'readwrite');
      const store = transaction.objectStore('analyses');
      const index = store.index('timestamp');
      const range = IDBKeyRange.upperBound(sevenDaysAgo);

      const request = index.openCursor(range);
      let deletedCount = 0;

      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          cursor.delete();
          deletedCount++;
          cursor.continue();
        } else {
          console.log(`Cleared ${deletedCount} old cache entries`);
          resolve(deletedCount);
        }
      };

      request.onerror = () => {
        console.error('Error clearing old cache:', request.error);
        reject(request.error);
      };
    });
  }

  async getAllAnalyses() {
    if (!this.db) {
      console.warn('Database not initialized');
      return [];
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['analyses'], 'readonly');
      const store = transaction.objectStore('analyses');
      const request = store.getAll();

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        console.error('Error getting all analyses:', request.error);
        reject(request.error);
      };
    });
  }

  async clearAllAnalyses() {
    if (!this.db) {
      console.warn('Database not initialized');
      return;
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['analyses'], 'readwrite');
      const store = transaction.objectStore('analyses');
      const request = store.clear();

      request.onsuccess = () => {
        console.log('All analyses cleared from cache');
        resolve();
      };

      request.onerror = () => {
        console.error('Error clearing analyses:', request.error);
        reject(request.error);
      };
    });
  }
}

// Make available globally for content scripts
if (typeof window !== 'undefined') {
  window.DBManager = DBManager;
}
