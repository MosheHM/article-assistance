// config.js - Configuration file for Linguistic Lens
// IMPORTANT: This file contains your Gemini API key

/**
 * ⚠️ SECURITY WARNING ⚠️
 *
 * The API key in this file will be visible to anyone who installs your extension.
 * Chrome extensions are not suitable for hiding API keys from end users.
 *
 * For production use, consider:
 * 1. Using a backend proxy server that holds the API key
 * 2. Implementing user authentication with individual API keys
 * 3. Using Google Cloud's API key restrictions (HTTP referrer, IP address)
 *
 * Current limitations with this approach:
 * - All users share the same API key and rate limits
 * - Free tier: 15 requests/minute, 1,500 requests/day (shared across all users)
 * - Users can extract the API key from extension files
 */

const CONFIG = {
  // Replace this with your actual Gemini API key
  // Get one free at: https://makersuite.google.com/app/apikey
  GEMINI_API_KEY: 'YOUR_GEMINI_API_KEY_HERE',

  // Model configurations
  MODELS: {
    QUICK: 'gemini-2.0-flash-exp',
    DEEP: 'gemini-2.0-flash-thinking-exp'
  },

  // API endpoint
  API_ENDPOINT: 'https://generativelanguage.googleapis.com/v1beta/models',

  // Cache settings
  CACHE_DURATION_DAYS: 7,

  // Text processing settings
  MAX_WORDS_PER_CHUNK: 3000,

  // Generation config
  GENERATION_CONFIG: {
    temperature: 0.1,
    topP: 0.95,
    topK: 40,
    maxOutputTokens: 8192
  }
};

// Validate API key on load
if (CONFIG.GEMINI_API_KEY === 'YOUR_GEMINI_API_KEY_HERE') {
  console.error('⚠️ Gemini API key not configured! Please edit config.js and add your API key.');
}

// Make config available globally
if (typeof window !== 'undefined') {
  window.LINGUISTIC_LENS_CONFIG = CONFIG;
}

// For service worker
if (typeof self !== 'undefined' && self.constructor.name === 'ServiceWorkerGlobalScope') {
  self.LINGUISTIC_LENS_CONFIG = CONFIG;
}
