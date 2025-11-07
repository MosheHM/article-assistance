// settings.js - Settings page controller

document.addEventListener('DOMContentLoaded', async () => {
  const backBtn = document.getElementById('backBtn');
  const totalWordsEl = document.getElementById('totalWords');
  const cacheSizeEl = document.getElementById('cacheSize');
  const learnedWordsList = document.getElementById('learnedWordsList');
  const searchInput = document.getElementById('searchInput');
  const clearAllBtn = document.getElementById('clearAllBtn');
  const exportBtn = document.getElementById('exportBtn');
  const clearCacheBtn = document.getElementById('clearCacheBtn');

  let learnedWords = [];
  let filteredWords = [];

  // Load data
  await loadData();

  // Back button
  backBtn.addEventListener('click', (e) => {
    e.preventDefault();
    window.close();
  });

  // Search functionality
  searchInput.addEventListener('input', (e) => {
    const query = e.target.value.trim().toLowerCase();
    if (query) {
      filteredWords = learnedWords.filter(word =>
        word.lemma.toLowerCase().includes(query) ||
        word.translation.toLowerCase().includes(query)
      );
    } else {
      filteredWords = [...learnedWords];
    }
    renderWords();
  });

  // Clear all words
  clearAllBtn.addEventListener('click', async () => {
    if (!confirm('האם אתה בטוח שברצונך למחוק את כל המילים שנלמדו?')) {
      return;
    }

    try {
      await chrome.storage.local.set({ learnedWords: [] });
      learnedWords = [];
      filteredWords = [];
      await loadData();
      alert('כל המילים נמחקו בהצלחה');
    } catch (error) {
      alert('שגיאה במחיקת המילים');
      console.error(error);
    }
  });

  // Export words
  exportBtn.addEventListener('click', () => {
    if (learnedWords.length === 0) {
      alert('אין מילים לייצא');
      return;
    }

    const data = learnedWords.map(w => `${w.lemma}\t${w.pos}\t${w.translation}`).join('\n');
    const blob = new Blob([data], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `linguistic-lens-words-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  });

  // Clear cache
  clearCacheBtn.addEventListener('click', async () => {
    if (!confirm('האם אתה בטוח שברצונך לנקות את המטמון?')) {
      return;
    }

    try {
      // Open IndexedDB and clear analyses
      const request = indexedDB.open('LinguisticLensDB', 1);

      request.onsuccess = (event) => {
        const db = event.target.result;
        const transaction = db.transaction(['analyses'], 'readwrite');
        const store = transaction.objectStore('analyses');
        const clearRequest = store.clear();

        clearRequest.onsuccess = () => {
          alert('המטמון נוקה בהצלחה');
          loadData();
        };

        clearRequest.onerror = () => {
          alert('שגיאה בניקוי המטמון');
        };
      };

      request.onerror = () => {
        alert('שגיאה בפתיחת מסד הנתונים');
      };
    } catch (error) {
      alert('שגיאה בניקוי המטמון');
      console.error(error);
    }
  });

  // Load data from storage and IndexedDB
  async function loadData() {
    try {
      // Load learned words
      const stored = await chrome.storage.local.get('learnedWords');
      const wordKeys = stored.learnedWords || [];

      learnedWords = wordKeys.map(key => {
        const [lemma, pos] = key.split(':');
        return { lemma, pos, translation: '', key };
      });

      filteredWords = [...learnedWords];
      totalWordsEl.textContent = learnedWords.length;

      // Get cache size
      const cacheCount = await getCacheCount();
      cacheSizeEl.textContent = cacheCount;

      renderWords();
    } catch (error) {
      console.error('Error loading data:', error);
    }
  }

  // Get cache count from IndexedDB
  function getCacheCount() {
    return new Promise((resolve) => {
      const request = indexedDB.open('LinguisticLensDB', 1);

      request.onsuccess = (event) => {
        const db = event.target.result;

        if (!db.objectStoreNames.contains('analyses')) {
          resolve(0);
          return;
        }

        const transaction = db.transaction(['analyses'], 'readonly');
        const store = transaction.objectStore('analyses');
        const countRequest = store.count();

        countRequest.onsuccess = () => {
          resolve(countRequest.result);
        };

        countRequest.onerror = () => {
          resolve(0);
        };
      };

      request.onerror = () => {
        resolve(0);
      };
    });
  }

  // Render words list
  function renderWords() {
    if (filteredWords.length === 0) {
      learnedWordsList.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📖</div>
          <div class="empty-text">${searchInput.value ? 'לא נמצאו תוצאות' : 'עדיין לא למדת מילים. התחל לקרוא וסמן מילים שלמדת!'}</div>
        </div>
      `;
      return;
    }

    learnedWordsList.innerHTML = filteredWords.map(word => `
      <div class="word-item" data-key="${word.key}">
        <div class="word-info">
          <span class="word-text">${word.lemma}</span>
          <span class="word-pos">${word.pos}</span>
        </div>
        <button class="delete-btn" data-key="${word.key}">מחק</button>
      </div>
    `).join('');

    // Add delete listeners
    document.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const key = btn.dataset.key;
        await deleteWord(key);
      });
    });
  }

  // Delete single word
  async function deleteWord(key) {
    try {
      const stored = await chrome.storage.local.get('learnedWords');
      const wordKeys = stored.learnedWords || [];
      const updatedKeys = wordKeys.filter(k => k !== key);

      await chrome.storage.local.set({ learnedWords: updatedKeys });

      learnedWords = learnedWords.filter(w => w.key !== key);
      filteredWords = filteredWords.filter(w => w.key !== key);

      totalWordsEl.textContent = learnedWords.length;
      renderWords();
    } catch (error) {
      alert('שגיאה במחיקת המילה');
      console.error(error);
    }
  }
});
