# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Linguistic Lens is a Chrome extension (Manifest V3) that helps Hebrew-speaking language learners read English text with AI-powered linguistic analysis. It uses **Google's Gemini Vision API** with screenshot-based analysis to provide word-level annotations with bounding box coordinates. This approach works on all content types: HTML pages, PDFs, and images.

## Development Setup

### Initial Configuration

1. **Configure API Key**: Edit `config.js` and add your Gemini API key from https://makersuite.google.com/app/apikey
2. **Generate Icons**: Open `icons/GENERATE_ICONS.html` in a browser to create icon files
3. **Load Extension**: Navigate to `chrome://extensions/`, enable Developer Mode, and click "Load unpacked"
4. **Test**: Use `TEST_ARTICLE.html` or any English article page

### Testing the Extension

```bash
# Load extension in Chrome
# 1. Open chrome://extensions/
# 2. Enable Developer Mode (toggle top right)
# 3. Click "Load unpacked"
# 4. Select the extension root directory

# After making changes, reload the extension:
# Click the refresh icon on the extension card in chrome://extensions/
```

**Important**: After editing content scripts or service workers, you must reload the extension in `chrome://extensions/` AND refresh any open tabs.

## Architecture

### Component Overview - Screenshot-Based Approach

The extension uses a **screenshot-based vision analysis** architecture:

```
┌─────────────────┐     activate message      ┌──────────────────┐
│  popup.html/js  │ ─────────────────────────> │ content-script.js│
└─────────────────┘                            └────────┬─────────┘
                                                        │ orchestrates
        ┌───────────────────────────────────────────────┴───────────────┐
        │                                                                 │
        v                                                                 v
┌────────────────────────┐                                  ┌──────────────────────┐
│ screenshot-manager.js  │                                  │coordinate-overlay.js │
│ (capture viewport,     │                                  │ (positioned boxes)   │
│  hash, detect changes) │                                  └──────────────────────┘
└────────┬───────────────┘                                               │
         │                                                                │
         v                                                                v
┌──────────────────┐      captureScreenshot      ┌──────────────────────────┐
│service-worker.js │<──── analyzeScreenshot ─────│  hover-controller.js     │
│ (Vision API)     │                              │  (word popups)           │
└────────┬─────────┘                              └──────────────────────────┘
         │                                                       │
         v                                                       v
┌───────────────────┐                                  ┌──────────────────┐
│vision-prompts.js  │                                  │learned-words.js  │
│ (bbox requests)   │                                  │(Chrome Storage)  │
└───────────────────┘                                  └──────────────────┘
         │                                                       │
         v                                                       v
┌─────────────────┐                                    ┌──────────────────┐
│   config.js     │                                    │  db-manager.js   │
│ (API key/models)│                                    │(screenshot cache)│
└─────────────────┘                                    └──────────────────┘
```

### Message Flow (Screenshot-Based)

1. **User clicks extension icon** → `popup.html` shows Quick/Deep mode buttons
2. **User selects mode** → `popup.js` sends `{action: 'activate', mode: 'quick'|'deep'}` to content script
3. **Content script initializes** → `LinguisticLens.initialize()`:
   - Shows cosmic blur animation
   - Calls `ScreenshotManager.captureViewport()` which sends `{action: 'captureScreenshot'}` to service worker
   - Service worker uses `chrome.tabs.captureVisibleTab()` and returns base64 PNG
   - Hashes screenshot with SHA-256 for cache lookup
   - Checks `DBManager.getCachedScreenshotAnalysis(hash)` for cached results
   - If cache miss, sends `{action: 'analyzeScreenshot', screenshot, viewport, mode}` to service worker
4. **Service worker processes** → `handleScreenshotAnalysis()`:
   - Calls Gemini Vision API with screenshot + vision prompt (from `vision-prompts.js`)
   - Vision prompt requests bounding boxes in 0-1000 normalized coordinates
   - Returns JSON with `{words: [{text, bbox, pos, translation_he, lemma, inflection}]}`
5. **Content script renders** → `CoordinateOverlay.render()`:
   - Creates transparent fixed-position overlay container
   - For each word, scales normalized bbox (0-1000) to viewport pixels
   - Creates positioned `<div class="linguistic-word-box">` at calculated coordinates
   - Applies POS-based background colors
   - Filters out learned words (tracked in `LearnedWordsManager`)
   - Attaches hover listeners via `HoverController`
6. **Viewport monitoring** → `ScreenshotManager.startMonitoring()`:
   - Detects scroll >100px → shows "Re-analyze visible area" button
   - Detects resize → clears overlay, shows re-activation message

### Key Classes and Responsibilities

**background/service-worker.js**
- Imports `config.js` and `vision-prompts.js`
- Handles three message types:
  - `{action: 'captureScreenshot'}` → uses `chrome.tabs.captureVisibleTab()`
  - `{action: 'analyzeScreenshot', screenshot, viewport, mode}` → calls Gemini Vision API
  - `{action: 'analyze', text, mode}` → legacy text-based (deprecated)
- Calls `callGeminiVisionAPI()` with base64 image + vision prompt
- Parses coordinate-based JSON response
- Handles JSON repair for malformed responses

**background/vision-prompts.js**
- Contains vision prompt templates
- `QUICK_VISION_PROMPT()` - Basic POS + bounding boxes
- `DEEP_VISION_PROMPT()` - Advanced with dependencies and clause structure
- `FALLBACK_VISION_PROMPT()` - Simplified for error recovery
- All prompts request bounding boxes in 0-1000 normalized format: `[ymin, xmin, ymax, xmax]`

**content/content-script.js** (`LinguisticLens`)
- Main orchestrator using screenshot-based flow
- Captures screenshot → hashes → checks cache → analyzes → renders
- Starts viewport monitoring after initialization
- Handles re-analyze on scroll and clear on resize

**utils/screenshot-manager.js** (`ScreenshotManager`)
- `captureViewport()` - Sends message to service worker for screenshot
- `hashScreenshot(base64)` - SHA-256 hash for caching
- `getViewportInfo()` - Current width, height, scroll position
- `hasViewportChanged()` - Detects scroll >100px or resize
- `startMonitoring()` - Watches for viewport changes
- `showReAnalyzeButton()` / `hideReAnalyzeButton()` - UI for re-analysis
- `isPDFPage()` - Detects PDF documents

**content/coordinate-overlay.js** (`CoordinateOverlay`)
- Creates transparent fixed-position overlay (`#linguistic-coordinate-overlay`)
- `render(analysis, viewport, mode)` - Renders word boxes
- `scaleCoordinates(bbox, viewport)` - Converts 0-1000 normalized coords to pixels
- `renderWordBox(word, index)` - Creates positioned `<div>` for each word
- `getPOSColors(pos)` - Returns background/border colors by POS
- Filters out learned words automatically
- No DOM manipulation - original content untouched

**content/hover-controller.js** (`HoverController`)
- Works with both `.linguistic-token` (legacy) and `.linguistic-word-box` (new)
- Event delegation for hover events
- Shows translation, POS, lemma, inflection in popup
- "Mark as learned" button functionality
- Popup positioning

**utils/db-manager.js** (`DBManager`)
- IndexedDB wrapper for caching
- `getCachedScreenshotAnalysis(hash)` - Retrieve by screenshot hash
- `saveScreenshotAnalysis(hash, viewport, analysis, mode)` - Store with viewport info
- Keys: screenshot SHA-256 hash
- Stores: `{id, url, timestamp, mode, viewport, type: 'screenshot', analysis}`
- Auto-expires after 7 days
- Backward compatible with old text-based cache

**utils/learned-words.js** (`LearnedWordsManager`)
- Tracks learned words in Chrome Storage
- Keys by `${lemma}_${pos}` (e.g., "run_VERB")
- Syncs between tabs
- Export/import functionality

**config.js**
- Central configuration for API key, models, settings
- `MODELS.QUICK: 'gemini-2.5-flash'` - Fast vision model
- `MODELS.DEEP: 'gemini-2.5-pro'` - Advanced vision model
- `MAX_WORDS_PER_CHUNK: 2000` - Not used in screenshot mode
- `GENERATION_CONFIG.responseMimeType: "application/json"` - Forces JSON output
- **CRITICAL**: Contains Gemini API key, should be in `.gitignore`

### Data Flow: Vision API Response Structure

**Quick Mode** (`gemini-2.5-flash` with vision):
```javascript
{
  "words": [
    {
      "text": "The",
      "bbox": [100, 50, 120, 90],  // [ymin, xmin, ymax, xmax] on 0-1000 scale
      "lemma": "",  // not required for DET
      "pos": "DET",
      "translation_he": "ה",
      "inflection": "definite"
    },
    {
      "text": "cat",
      "bbox": [100, 95, 120, 140],
      "lemma": "cat",
      "pos": "NOUN",
      "translation_he": "חתול",
      "inflection": "singular"
    },
    {
      "text": "sleeps",
      "bbox": [100, 145, 120, 210],
      "lemma": "sleep",
      "pos": "VERB",
      "translation_he": "ישן",
      "inflection": "present, 3rd person singular"
    }
  ]
}
```

**Bounding Box Format**:
- Normalized to 0-1000 coordinate system
- Format: `[ymin, xmin, ymax, xmax]`
- `ymin/xmin`: top-left corner (0,0 = top-left of image)
- `ymax/xmax`: bottom-right corner (1000,1000 = bottom-right of image)
- Scaled to viewport pixels: `x = (xmin/1000) * viewport.width`

**Deep Mode** (`gemini-2.5-pro` with vision) adds:
- `word.index` - Sequential index for dependency parsing
- `word.dependencies` - Array of `{to_index, relation, relation_he}`
- `sentences` - Groups words into sentences with clause structure
- `sentences[].clause_structure` - Main and subordinate clauses
- `sentences[].grammatical_notes_he` - Hebrew explanations

### Storage

**Chrome Storage** (`chrome.storage.local`):
- Learned words: `{word_VERB: {lemma, pos, learnedAt}}`
- Settings/preferences

**IndexedDB** (`LinguisticLensDB`):
- Object store: `analyses` (keyPath: `id` = SHA-256 hash)
  - Fields: `id`, `url`, `timestamp`, `mode`, `analysis`
  - Indexes: `url`, `timestamp`
- Object store: `learnedWords` (backup, primary is Chrome Storage)

## Common Development Tasks

### Adding a New POS Tag Color

1. Add color to `styles/overlay.css`:
```css
.linguistic-token.newpos {
  background-color: #HEX;
  border-bottom: 2px solid #HEX;
}
```

2. Update service worker prompts in `background/service-worker.js`:
```javascript
const QUICK_MODE_PROMPT = (text) => `
  // Add NEWPOS to the list:
  "pos": "NOUN|VERB|...|NEWPOS",
```

### Changing Gemini Models

Edit `config.js`:
```javascript
MODELS: {
  QUICK: 'gemini-2.5-flash',      // Fast, basic analysis
  DEEP: 'gemini-2.5-pro'          // Slower, advanced features
}
```

Available models: https://ai.google.dev/gemini-api/docs/models

### Adjusting Cache Duration

Edit `config.js`:
```javascript
CACHE_DURATION_DAYS: 7,  // Change to desired number of days
```

And update `db-manager.js` if logic changes are needed (currently checks 7-day expiry in `getCachedAnalysis()` and `clearOldCache()`).

### Modifying Text Chunk Size

Edit `config.js`:
```javascript
MAX_WORDS_PER_CHUNK: 3000,  // Max words per API call
```

Service worker automatically splits long articles using `splitTextIntoChunks()` in `background/service-worker.js`.

### Debugging Tips

**Service Worker Console**:
```javascript
// In Chrome DevTools, go to:
// chrome://extensions/ → Extension details → "service worker" link
// This opens the service worker console

// Check config loaded:
console.log(self.LINGUISTIC_LENS_CONFIG);

// Monitor API calls:
// Look for "Gemini API call failed" errors
```

**Content Script Console**:
```javascript
// F12 on any page where extension is active

// Check if content script loaded:
console.log('Linguistic Lens content script loaded');

// Inspect analysis cache:
const db = new DBManager();
await db.initialize();
const analyses = await db.getAllAnalyses();
console.log(analyses);

// Check learned words:
chrome.storage.local.get(null, (data) => console.log(data));
```

**Common Issues**:
- **"API key not configured"**: Edit `config.js`, replace `'YOUR_GEMINI_API_KEY_HERE'`
- **Extension doesn't activate**: Reload extension in `chrome://extensions/` after code changes
- **Analysis fails silently**: Check service worker console for API errors (rate limits, malformed JSON)
- **Words not highlighting**: Check if Mozilla Readability extracted the content correctly (content-analyzer.js)
- **Hover popup mispositioned**: Check `hover-controller.js` positioning logic

## Security Considerations

### API Key Management

**Current Implementation**: API key is embedded in `config.js` by the developer. This means:
- All users share the same API key and rate limits (15 req/min, 1,500 req/day on free tier)
- Users can extract the API key by inspecting extension files
- Suitable for small-scale personal use or internal distribution

**Production Recommendations**:
1. **Backend Proxy** (recommended): Move API calls to your own server, hide key server-side
2. **User Authentication**: Require users to provide their own Gemini API keys
3. **API Key Restrictions**: Use Google Cloud Console to restrict by IP/domain (limited effectiveness for extensions)

See `SETUP_FOR_DEVELOPERS.md` for detailed production strategies.

### Content Security

- Extension has `<all_urls>` host permissions to analyze any page
- Only extracts visible article text, no form data or credentials
- No data sent to servers other than Google's Gemini API
- All analysis cached locally in IndexedDB

## Important Files

### Must Configure Before Use
- `config.js` - Add Gemini API key here (CRITICAL)
- `icons/` - Generate using `icons/GENERATE_ICONS.html`

### Should Not Commit (Security)
- `config.js` with real API key (use template approach instead)
- Generated icon files (users generate locally)

### Entry Points
- `background/service-worker.js` - Background process, screenshot capture, vision API calls
- `background/vision-prompts.js` - Vision prompt templates
- `content/content-script.js` - Injected into all pages, orchestrates screenshot flow
- `ui/popup.html` - Extension popup UI

### External Dependencies
- None! Screenshot-based approach eliminates need for Readability.js or other DOM parsing libraries

## Git Workflow

The repository follows a standard feature branch workflow:

```bash
# Make changes, then reload extension in chrome://extensions/
# Test on TEST_ARTICLE.html or real article pages

# When committing:
git add .
git commit -m "description"
git push origin main

# For pull requests:
git checkout -b feature/your-feature-name
# Make changes
git push origin feature/your-feature-name
# Create PR to main branch
```

**IMPORTANT**: Never commit `config.js` with a real API key. The repository includes a template `config.js` with placeholder. Users/developers must configure their own key locally.

## API Rate Limits and Costs

**Gemini Free Tier**:
- 15 requests per minute (RPM)
- 1,500 requests per day (RPD)
- Shared across all users with the same API key

**Typical Usage**:
- Average article: 500-1000 words = 1 API call
- Long article: 3000+ words = 2-3 API calls (chunking)
- Cache hit: 0 API calls (instant)

**Scaling Considerations**:
- 100 users × 5 articles/day = 500-1000 requests/day (within free tier)
- But collective burst traffic can hit 15 RPM limit
- Consider client-side rate limiting if distributing widely

## Extension Distribution

### Chrome Web Store Publishing

1. Remove test files (`TEST_ARTICLE.html`)
2. Verify `config.js` has your API key configured
3. Generate icons
4. Package as ZIP (root directory contents)
5. Upload to Chrome Web Store Developer Dashboard
6. Set appropriate permissions description
7. Monitor API usage after launch

### Private Distribution

For internal use without Chrome Web Store:
1. Configure `config.js` with API key
2. Package as ZIP or use "Load unpacked"
3. Share via direct download or internal repository
4. Users install via drag-and-drop or Developer Mode

## Extension Lifecycle

**Installation**:
1. Service worker runs `chrome.runtime.onInstalled` listener
2. Opens welcome page (currently `ui/popup.html`)

**Activation** (Screenshot-Based):
1. User clicks extension icon → `ui/popup.html` opens
2. User chooses Quick/Deep mode → sends `{action: 'activate', mode}` to content script
3. Content script initializes `LinguisticLens` instance:
   - Captures screenshot via service worker
   - Hashes screenshot for cache lookup
   - If cache miss: analyzes with Gemini Vision API
   - Renders coordinate-based overlay
   - Starts viewport monitoring
4. Shows loading animation, progress indicators throughout

**Viewport Changes**:
- **Scroll >100px**: Shows "Re-analyze visible area" button (user control)
- **Resize/Zoom**: Automatically clears overlay, prompts user to re-activate
- **Re-analyze**: Captures new screenshot, repeats analysis flow

**Deactivation/Cleanup**:
- Overlay clears on viewport resize
- User can refresh page to clear
- Can call `linguisticLensInstance.overlay.clear()` programmatically
- Cache auto-expires after 7 days

## Performance Notes (Screenshot-Based)

- **Screenshot capture**: ~100-200ms
- **Screenshot hashing**: ~50-100ms
- **Vision API analysis**: 5-15 seconds (slower than text-only, but works on PDFs!)
- **Cached load**: <500ms (instant if screenshot unchanged)
- **Overlay rendering**: ~200-500ms (depends on word count)
- **Hover popup**: <100ms
- **Memory usage**: <80MB typical (includes screenshot data)
- **Extension bundle**: <200KB (no external libraries)

**Comparison to Text-Based Approach**:
- Slower initial analysis (vision processing)
- Works on PDFs and images (text-based didn't)
- No DOM manipulation (cleaner, more reliable)
- Viewport-specific (requires re-analysis on scroll)

## Browser Compatibility

- Chrome 88+ (Manifest V3 + `chrome.tabs.captureVisibleTab`)
- Edge 88+ (Chromium-based)
- Brave Browser
- Opera
- **NOT** Firefox (different extension API, no `tabs.captureVisibleTab` in Manifest V3)

## PDF Support

**How it works**:
- PDFs are rendered as static content by Chrome's PDF viewer
- Screenshot-based approach works perfectly on PDFs
- No special handling needed - PDFs treated like any other page
- `ScreenshotManager.isPDFPage()` detects PDFs for logging purposes

**Limitations**:
- Only analyzes visible viewport (can't analyze full multi-page PDF at once)
- User must scroll and re-analyze each viewport
- Works best with native PDFs (clear text), may struggle with scanned PDFs
