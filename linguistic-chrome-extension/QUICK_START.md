# Quick Start Guide - Linguistic Lens

## For End Users

### 1-Minute Setup

1. **Install extension** (one of):
   - Download from Chrome Web Store
   - Get package from your administrator
   - Or load unpacked for development

2. **Start using**:
   - Navigate to any English article
   - Click extension icon
   - Choose Quick or Deep mode
   - Done!

**No API key needed. No configuration. Just install and use!**

---

## For Developers

### 3-Minute Setup

#### Step 1: Get API Key (1 minute)

1. Visit: https://makersuite.google.com/app/apikey
2. Sign in with Google
3. Click "Create API Key"
4. Copy the key (starts with `AIza...`)

#### Step 2: Configure Extension (30 seconds)

1. Open `config.js` in the extension directory
2. Find this line:
   ```javascript
   GEMINI_API_KEY: 'YOUR_GEMINI_API_KEY_HERE',
   ```
3. Replace with your actual key:
   ```javascript
   GEMINI_API_KEY: 'AIzaSyD1234567890abcdefGHIJKL...', // Your real key
   ```
4. Save the file

#### Step 3: Generate Icons (30 seconds)

1. Open `icons/GENERATE_ICONS.html` in your browser
2. Icons will be automatically generated
3. Click the three download buttons:
   - Download 128x128
   - Download 48x48
   - Download 16x16
4. Move the downloaded PNG files to the `icons/` folder

**Alternative**: Use any 128x128 PNG image as `icon128.png`, then resize for other sizes.

#### Step 4: Load Extension (1 minute)

1. Open Chrome
2. Navigate to: `chrome://extensions/`
3. Enable "Developer mode" (toggle in top-right)
4. Click "Load unpacked"
5. Select the `linguistic-chrome-extension` folder

#### Step 5: Test (30 seconds)

1. Navigate to `TEST_ARTICLE.html` or any English article
2. Click the extension icon
3. Click "מצב מהיר" (Quick Mode)
4. Wait for analysis
5. Hover over color-coded words!

## That's it! 🎉

**For end users**: Ready to use immediately after installation.

**For developers**: Extension is configured and ready to distribute once you add your API key.

---

## Important Notes

### For Developers

⚠️ **Security**: Your API key will be visible to anyone who installs the extension. For production use with many users, consider a backend proxy server. See [SETUP_FOR_DEVELOPERS.md](SETUP_FOR_DEVELOPERS.md) for details.

⚠️ **Rate Limits**: Free tier has 15 requests/minute and 1,500 requests/day (shared across all users).

⚠️ **Git**: Never commit `config.js` with your API key to public repositories. Add it to `.gitignore`.

### For End Users

✅ **Privacy**: No data collection. Only article text sent to Gemini API for analysis.

✅ **Offline**: Cached analyses work offline. New analyses require internet.

✅ **Learned Words**: Saved locally, synced across your Chrome profile.

---

## Troubleshooting

### "API key not configured" error

**Developer**: Edit `config.js` and add your Gemini API key.

### Extension doesn't load

1. Check that `config.js` exists and has valid syntax
2. Check that icons exist in `icons/` folder
3. Reload extension in `chrome://extensions/`
4. Check browser console for errors (F12)

### Analysis fails

1. Check internet connection
2. Verify API key is correct
3. Check if you hit rate limits (wait a minute)
4. Try with a different article

### No color-coded words appear

1. Refresh the page
2. Check if the page has English text
3. Check browser console for errors
4. Try with `TEST_ARTICLE.html`

---

## Next Steps

- **For end users**: Start reading articles! Mark words as learned.
- **For developers**: See [SETUP_FOR_DEVELOPERS.md](SETUP_FOR_DEVELOPERS.md) for production deployment strategies.

---

Happy reading! 📖✨

**Zero configuration for users. One-time setup for developers.**
