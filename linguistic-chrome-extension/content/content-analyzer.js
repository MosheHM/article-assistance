// content-analyzer.js - Content extraction using Readability.js

class ContentAnalyzer {
  constructor() {
    this.article = null;
    this.contentElement = null;
  }

  extractMainContent() {
    try {
      // Clone the document for Readability to parse
      const documentClone = document.cloneNode(true);

      // Check if Readability is available
      if (typeof Readability === 'undefined') {
        console.error('Readability library not loaded');
        return this.fallbackExtraction();
      }

      const reader = new Readability(documentClone);
      const article = reader.parse();

      if (!article) {
        console.warn('Readability could not extract article content');
        return this.fallbackExtraction();
      }

      this.article = article;

      console.log('Article extracted successfully:', {
        title: article.title,
        byline: article.byline,
        length: article.textContent.length,
        excerpt: article.excerpt
      });

      // Try to find the main content element in the actual DOM
      this.contentElement = this.findContentElement();

      return {
        title: article.title,
        content: article.textContent,
        html: article.content,
        byline: article.byline,
        excerpt: article.excerpt,
        element: this.contentElement
      };

    } catch (error) {
      console.error('Error extracting content:', error);
      return this.fallbackExtraction();
    }
  }

  findContentElement() {
    // Try to find the main content container in the DOM
    const candidates = [
      document.querySelector('article'),
      document.querySelector('main'),
      document.querySelector('[role="main"]'),
      document.querySelector('.article'),
      document.querySelector('.post'),
      document.querySelector('.content'),
      document.getElementById('content'),
      document.querySelector('.markdown-body'), // GitHub
      document.querySelector('.wiki-content'), // Wikis
    ];

    for (const candidate of candidates) {
      if (candidate && candidate.textContent.length > 100) {
        console.log('Found content element:', candidate.tagName, candidate.className);
        return candidate;
      }
    }

    // If no candidate found, use body
    console.warn('Using document.body as content element');
    return document.body;
  }

  fallbackExtraction() {
    // Fallback: try to extract visible text from the page
    console.log('Using fallback extraction method');

    const body = document.body;
    const textContent = body.innerText || body.textContent;

    return {
      title: document.title,
      content: textContent,
      html: body.innerHTML,
      byline: null,
      excerpt: textContent.substring(0, 200),
      element: body
    };
  }

  isArticlePage() {
    // Heuristics to determine if this looks like an article page
    const indicators = [
      document.querySelector('article'),
      document.querySelector('main'),
      document.querySelector('.article'),
      document.querySelector('.post'),
      document.querySelector('.markdown-body'),
      document.querySelector('meta[property="og:type"][content="article"]'),
      document.querySelector('meta[name="article:published_time"]')
    ];

    return indicators.some(indicator => indicator !== null);
  }

  getArticleMetadata() {
    return {
      url: window.location.href,
      title: document.title,
      description: document.querySelector('meta[name="description"]')?.content || '',
      author: document.querySelector('meta[name="author"]')?.content || this.article?.byline || '',
      publishedTime: document.querySelector('meta[property="article:published_time"]')?.content || '',
      siteName: document.querySelector('meta[property="og:site_name"]')?.content || '',
    };
  }

  // Check if page contains mostly images or PDFs
  isPDFOrImagePage() {
    // Check if it's a PDF
    if (document.contentType === 'application/pdf') {
      return true;
    }

    // Check if URL ends with .pdf
    if (window.location.href.toLowerCase().endsWith('.pdf')) {
      return true;
    }

    // Check if page is mostly images
    const images = document.querySelectorAll('img');
    const text = document.body.innerText || '';

    if (images.length > 5 && text.length < 500) {
      return true;
    }

    return false;
  }

  // Get readable text length
  getTextLength() {
    if (this.article) {
      return this.article.textContent.length;
    }

    const body = document.body;
    return (body.innerText || body.textContent || '').length;
  }

  // Check if content is in English
  isEnglishContent() {
    const content = this.article?.textContent || document.body.innerText || '';
    const sample = content.substring(0, 500);

    // Simple heuristic: check for English words
    const englishWords = ['the', 'is', 'are', 'was', 'were', 'and', 'or', 'but', 'for', 'to', 'of', 'in'];
    const wordCount = englishWords.filter(word =>
      new RegExp(`\\b${word}\\b`, 'i').test(sample)
    ).length;

    return wordCount >= 3; // At least 3 common English words in sample
  }
}

// Make available globally
if (typeof window !== 'undefined') {
  window.ContentAnalyzer = ContentAnalyzer;
}
