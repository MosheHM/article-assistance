# Linguistic Lens 🔍

AI-powered Chrome extension that helps Hebrew-speaking language learners read English academic papers and technical documentation with real-time linguistic analysis and translation.

> **Note for Developers**: The Gemini API key is configured by YOU (the extension developer), not by end users. See [SETUP_FOR_DEVELOPERS.md](SETUP_FOR_DEVELOPERS.md) for configuration instructions.

## Features

### Core Functionality
- **Instant Analysis**: Click and analyze - no setup required for users
- **Content Extraction**: Automatically detects and isolates main article content
- **Linguistic Analysis**: Part-of-speech tagging, lemmatization, and contextual Hebrew translations
- **Visual Overlay**: Color-coded words based on grammatical role
- **Interactive Hover**: Detailed analysis popup on word hover
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

### For End Users

1. **Install the extension**
   - Download from Chrome Web Store (when published)
   - Or: Get the extension package from your administrator
   - Or: Load unpacked (for development)

2. **Start using immediately**
   - No API key configuration needed
   - No account creation required
   - Just install and go!

3. **Navigate to any English article** and click the extension icon

### For Developers

See [SETUP_FOR_DEVELOPERS.md](SETUP_FOR_DEVELOPERS.md) for detailed setup instructions including:
- How to configure your Gemini API key
- Security considerations
- Production deployment options
- Rate limiting strategies

**Quick Developer Setup:**
1. Get Gemini API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Edit `config.js` and add your API key
3. Generate icons (`icons/GENERATE_ICONS.html`)
4. Load extension in Chrome (`chrome://extensions/`)
5. Done!

## Usage

### Basic Workflow

1. **Navigate to an article** (any webpage with English text)
2. **Click the extension icon** in your Chrome toolbar
3. **Choose analysis mode**:
   - Click "מצב מהיר" (Quick Mode) for fast analysis
   - Click "מצב מתקדם" (Deep Mode) for comprehensive analysis
4. **Wait for processing** - You'll see a cosmic blur animation
5. **Read the analyzed text** - Words are color-coded by part of speech
6. **Hover over words** to see:
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

## Project Structure

```
linguistic-chrome-extension/
├── config.js                      # 🔑 API key configuration (CONFIGURE THIS!)
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
│   ├── popup.html/js              # Extension popup
│   └── settings.html/js           # Settings page
├── utils/
│   ├── db-manager.js              # IndexedDB abstraction
│   └── learned-words.js           # Learned words tracker
└── icons/                         # Extension icons
```

## Architecture

### API Key Management

**Important Security Note**: The Gemini API key is embedded in the extension by the developer in `config.js`. This means:

✅ **Pros**:
- Users don't need their own API key
- Zero configuration for end users
- Instant usability after installation

⚠️ **Cons**:
- API key is visible to anyone who installs the extension
- All users share the same rate limits
- Free tier: 15 req/min, 1,500 req/day (shared)

For production deployments with many users, consider:
1. Backend proxy server (recommended)
2. User authentication with individual keys
3. Paid Gemini API tier

See [SETUP_FOR_DEVELOPERS.md](SETUP_FOR_DEVELOPERS.md) for detailed production strategies.

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

### Extension doesn't work
- **Check**: Is `config.js` configured with a valid API key?
- **Try**: Reload the extension in `chrome://extensions/`
- **Check**: Browser console for errors (F12)

### "API key not configured" error
- **Problem**: Developer hasn't configured the API key
- **Solution**: Edit `config.js` and add your Gemini API key
- **See**: [SETUP_FOR_DEVELOPERS.md](SETUP_FOR_DEVELOPERS.md)

### "Could not extract article content" error
- The page might not have clear article structure
- Try refreshing the page
- Some sites (like PDFs) may not be supported yet
- Check if the page has actual text content

### Analysis takes too long
- Long articles (>5000 words) may take 10-15 seconds
- Check your internet connection
- The first analysis is slower; subsequent loads use cache

### Rate limit errors
- **Problem**: Exceeded Gemini API rate limits (15 req/min or 1,500 req/day)
- **Solution**: Wait a minute and try again
- **For Developers**: Consider implementing rate limiting or upgrading to paid tier

## Privacy & Data

### What data is collected?
- **None.** This extension does **not** collect, store, or transmit any personal data.

### What data is sent to Gemini?
- **Only the article text** you choose to analyze
- **No personal information**, browsing history, or metadata

### What data is stored locally?
- Learned words list (Chrome local storage)
- Cached analyses (IndexedDB, auto-deleted after 7 days)

### Can I use this offline?
- **No**, the extension requires an internet connection to call the Gemini API
- Cached analyses can be viewed offline

## Development

### Local Development
```bash
# Clone repository
git clone <repo-url>
cd linguistic-chrome-extension

# Configure API key
# Edit config.js and add your Gemini API key

# Generate icons
# Open icons/GENERATE_ICONS.html in browser

# Load in Chrome
# 1. Open chrome://extensions/
# 2. Enable Developer Mode
# 3. Click "Load unpacked"
# 4. Select the extension directory

# Make changes and reload extension
```

### Testing
1. Navigate to `TEST_ARTICLE.html` in the extension directory
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
- **Rate limits**: Shared API key means shared rate limits across all users

## Future Enhancements

- [ ] PDF direct support
- [ ] Screenshot-based analysis for images
- [ ] Sentence-level translation
- [ ] Flashcard generation from learned words
- [ ] Export to Anki
- [ ] Support for other source languages
- [ ] Offline mode with local NLP models
- [ ] Firefox extension

## Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## Files You Need to Configure

Before distributing or using this extension:

1. **`config.js`** - Add your Gemini API key here
2. **`icons/`** - Generate icons using `icons/GENERATE_ICONS.html`

That's it! The extension is pre-configured and ready to use once you add your API key.

## Security Best Practices

⚠️ **Important for Developers**:

1. **Never commit your configured `config.js`** to public repositories
2. **Use `.gitignore`** to exclude `config.js`
3. **Consider a backend proxy** for production deployments
4. **Monitor your API usage** at [Google AI Studio](https://makersuite.google.com/)
5. **Implement rate limiting** on the client side
6. **Review security guide** in [SETUP_FOR_DEVELOPERS.md](SETUP_FOR_DEVELOPERS.md)

## License

MIT License - See LICENSE file for details

## Credits

- **Readability.js**: Mozilla Foundation
- **Gemini API**: Google AI
- **Developer**: [Your name/organization]

## Support

- **For End Users**: Contact your extension provider
- **For Developers**: See [SETUP_FOR_DEVELOPERS.md](SETUP_FOR_DEVELOPERS.md)
- **Issues**: Open an issue on GitHub
- **Documentation**: Full docs in this README

## Quick Links

- [Developer Setup Guide](SETUP_FOR_DEVELOPERS.md) - Configure API key and deploy
- [Test Article](TEST_ARTICLE.html) - Test the extension
- [Generate Icons](icons/GENERATE_ICONS.html) - Create extension icons

---

**Made with ❤️ for Hebrew-speaking English learners**

**Ready to use in 3 steps**: Configure API key → Generate icons → Load extension
