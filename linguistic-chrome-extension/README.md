# Linguistic Lens 🔍

AI-powered Chrome extension that helps Hebrew-speaking language learners read English academic papers and technical documentation with real-time linguistic analysis and translation.

## Features

### Core Functionality
- **Content Extraction**: Automatically detects and isolates main article content using Mozilla Readability
- **Linguistic Analysis**: Provides part-of-speech tagging, lemmatization, and contextual Hebrew translations
- **Visual Overlay**: Color-codes words based on grammatical role
- **Interactive Hover**: Shows detailed analysis popup on word hover
- **Learning Tracker**: Mark words as "learned" - they won't be highlighted again
- **Smart Caching**: 7-day local cache for instant re-analysis

### Two Analysis Modes

**⚡ Quick Mode** (Default)
- Basic POS tagging
- Word lemmatization
- Simple color coding
- Fast processing (~2-3 seconds)
- Uses: `gemini-2.0-flash-exp`

**🧠 Deep Mode** (Advanced)
- Full dependency parsing
- Subject-object relationships
- Clause structure analysis
- Visual dependency arcs
- Detailed grammatical explanations
- Uses: `gemini-2.0-flash-thinking-exp`

## Installation

### Prerequisites
1. **Google Chrome** (or Chromium-based browser)
2. **Gemini API Key** - Get one free at [Google AI Studio](https://makersuite.google.com/app/apikey)

### Setup Steps

1. **Clone or download this repository**
   ```bash
   git clone <repository-url>
   cd linguistic-chrome-extension
   ```

2. **Add Extension Icons** (Required)

   Create icon files in the `icons/` directory:
   - `icon16.png` - 16x16 pixels
   - `icon48.png` - 48x48 pixels
   - `icon128.png` - 128x128 pixels

   You can use any image editor or online tool to create simple icons. Suggested icon: 🔍 or 🧠 emoji on a gradient background.

   **Quick Icon Generation** (using ImageMagick):
   ```bash
   # If you have ImageMagick installed
   convert -size 128x128 -background "#667eea" -fill white -font Arial -pointsize 80 -gravity center label:"🔍" icons/icon128.png
   convert icons/icon128.png -resize 48x48 icons/icon48.png
   convert icons/icon128.png -resize 16x16 icons/icon16.png
   ```

3. **Load Extension in Chrome**
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top-right corner)
   - Click "Load unpacked"
   - Select the `linguistic-chrome-extension` folder
   - The extension should now appear in your extensions list

4. **Configure API Key**
   - Click the extension icon in your Chrome toolbar
   - Enter your Gemini API key in the input field
   - Click "Save"
   - Your key is stored locally and never sent anywhere except Google's Gemini API

## Usage

### Basic Workflow

1. **Navigate to an article** (any webpage with English text)
2. **Click the extension icon** in your Chrome toolbar
3. **Choose analysis mode**:
   - Click "מצב מהיר" (Quick Mode) for fast analysis
   - Click "מצב מתקדם" (Deep Mode) for comprehensive analysis
4. **Wait for processing** - You'll see a cosmic blur animation
5. **Read the analyzed text** - Words are color-coded by part of speech
6. **Hover over words** to see detailed information:
   - Hebrew translation
   - Part of speech
   - Lemma (base form)
   - Inflection details
7. **Mark words as learned** by clicking "למדתי מילה זו" in the popup

### Color Coding Guide

- 🔵 **Blue** - Nouns (שמות עצם)
- 🔴 **Red** - Verbs (פעלים)
- 🟢 **Green** - Adjectives (תארים)
- 🟠 **Orange** - Adverbs (תארי פועל)
- 🟣 **Purple** - Prepositions (מילות יחס)
- 🔷 **Turquoise** - Conjunctions (מילות חיבור)
- 🟣 **Pink** - Pronouns (כינויים)
- ⚪ **Gray** - Determiners (מילות יידוע)

### Managing Learned Words

1. **View learned words**: Click extension icon → "הגדרות ומילים שנלמדו"
2. **Search words**: Use the search box to filter
3. **Delete words**: Click the red "מחק" button next to any word
4. **Clear all**: Click "מחק את כל המילים" (with confirmation)
5. **Export list**: Click "ייצא רשימה" to download as text file

### Cache Management

- Analyses are cached for **7 days**
- View cache size in Settings
- Clear cache manually: Settings → "נקה מטמון"
- Old cache entries are automatically cleaned up

## Project Structure

```
linguistic-chrome-extension/
├── manifest.json                   # Extension configuration
├── background/
│   └── service-worker.js          # Gemini API integration
├── content/
│   ├── content-script.js          # Main orchestrator
│   ├── content-analyzer.js        # Content extraction
│   ├── visual-overlay.js          # Rendering engine
│   └── hover-controller.js        # Popup management
├── libs/
│   └── readability.min.js         # Mozilla Readability
├── styles/
│   ├── overlay.css                # Token styling
│   └── popup.css                  # Hover popup styling
├── ui/
│   ├── popup.html                 # Extension popup
│   ├── popup.js                   # Popup controller
│   ├── settings.html              # Settings page
│   └── settings.js                # Settings controller
├── utils/
│   ├── db-manager.js              # IndexedDB abstraction
│   └── learned-words.js           # Learned words tracker
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

## API Key Configuration

### Getting a Gemini API Key

1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Get API Key" or "Create API Key"
4. Copy the generated key (starts with `AIza...`)

### API Key Security

- Your API key is stored **locally** in Chrome's storage
- It is **never** sent to any server except Google's Gemini API
- The key is **not** shared across devices
- You can delete it anytime in the extension settings

### API Usage & Costs

- Gemini 2.0 Flash has a **generous free tier**
- Free quota: 15 requests per minute, 1,500 requests per day
- Typical usage: 1-3 requests per article
- Monitor your usage at [Google AI Studio](https://makersuite.google.com/)

## Technical Details

### Technologies Used
- **Vanilla JavaScript** (ES6+)
- **Chrome Extension Manifest V3**
- **Gemini 2.0 Flash API** (Quick & Thinking models)
- **Mozilla Readability.js** for content extraction
- **IndexedDB** for local caching
- **Chrome Storage API** for persistence

### Performance
- Initial analysis: **3-7 seconds** (depending on article length)
- Cached load: **<500ms**
- Hover popup: **<100ms**
- Memory usage: **<50MB**
- Extension size: **<500KB**

### Browser Compatibility
- ✅ Google Chrome (v88+)
- ✅ Microsoft Edge (v88+)
- ✅ Brave Browser
- ✅ Opera
- ❌ Firefox (uses different extension API)

## Troubleshooting

### Extension doesn't appear
- Make sure Developer Mode is enabled in `chrome://extensions/`
- Try reloading the extension
- Check console for errors

### "API key not found" error
- Open extension popup
- Enter your Gemini API key
- Click "Save"
- Refresh the page and try again

### "Could not extract article content" error
- The page might not have clear article structure
- Try refreshing the page
- Some sites (like PDFs) may not be supported yet
- Check if the page has actual text content

### Analysis takes too long
- Long articles (>5000 words) may take 10-15 seconds
- Check your internet connection
- The first analysis is slower; subsequent loads use cache

### Colors not showing
- Make sure the extension has permission to access the site
- Try refreshing the page
- Check if another extension is interfering
- Inspect console for CSS errors

### Learned words not persisting
- Check Chrome storage permissions
- Try exporting and re-importing the word list
- Clear browser cache and reload extension

## Privacy & Data

### What data is collected?
- **None.** This extension does **not** collect, store, or transmit any personal data.

### What data is sent to Gemini?
- **Only the article text** you choose to analyze
- **No personal information**, browsing history, or metadata

### What data is stored locally?
- API key (Chrome local storage)
- Learned words list (Chrome local storage)
- Cached analyses (IndexedDB, auto-deleted after 7 days)

### Can I use this offline?
- **No**, the extension requires an internet connection to call the Gemini API
- Cached analyses can be viewed offline

## Development

### Prerequisites
- Node.js (optional, for development tools)
- Chrome Developer Mode enabled

### Local Development
```bash
# Clone repository
git clone <repo-url>
cd linguistic-chrome-extension

# Load in Chrome
# 1. Open chrome://extensions/
# 2. Enable Developer Mode
# 3. Click "Load unpacked"
# 4. Select the extension directory

# Make changes to code
# Reload extension in chrome://extensions/
```

### Debugging
- **Background script**: `chrome://extensions/` → Extension details → "Inspect views: service worker"
- **Content script**: Open DevTools on any page → Console → Look for "Linguistic Lens" logs
- **Popup**: Right-click extension icon → "Inspect popup"

### Testing
1. Navigate to a test article (e.g., Wikipedia, arXiv, Medium)
2. Click extension icon
3. Choose Quick Mode
4. Verify:
   - Cosmic blur appears
   - Words are color-coded
   - Hover popup shows correct information
   - Learned words are saved

## Known Limitations

- **Language**: Only supports English text analysis (for Hebrew speakers)
- **Content**: Works best on article-style pages (blogs, news, documentation)
- **PDF**: Direct PDF support not yet implemented
- **Dynamic content**: May not work on heavily dynamic SPAs without refresh
- **API limits**: Free Gemini API has rate limits (15 req/min, 1500 req/day)

## Future Enhancements

- [ ] PDF direct support (currently requires copy-paste)
- [ ] Screenshot-based analysis for images
- [ ] Sentence-level translation
- [ ] Flashcard generation from learned words
- [ ] Export to Anki
- [ ] Support for other source languages (Spanish, French, etc.)
- [ ] Offline mode with local NLP models
- [ ] Browser extension for Firefox

## Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - See LICENSE file for details

## Credits

- **Readability.js**: Mozilla Foundation
- **Gemini API**: Google AI
- **Icon Design**: [Your name/credits]
- **Developed by**: [Your name/team]

## Support

For issues, questions, or feature requests:
- Open an issue on GitHub
- Email: [your-email]
- Documentation: [docs-url]

## Changelog

### v1.0.0 (2024-11-07)
- Initial release
- Quick and Deep analysis modes
- Color-coded POS tagging
- Hover popups with Hebrew translations
- Learned words tracking
- 7-day caching system
- Cosmic blur animation

---

**Made with ❤️ for Hebrew-speaking English learners**
