# Developer Setup Guide - Linguistic Lens

## Configuration Overview

**Important**: The Gemini API key is configured by **you (the developer)**, not by end users. Users will be able to use the extension immediately after installation without needing to provide their own API key.

## Quick Setup (3 Steps)

### Step 1: Get Your Gemini API Key

1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key" or "Get API Key"
4. Copy the generated key (starts with `AIza...`)

### Step 2: Configure the Extension

Open `config.js` and replace the placeholder with your actual API key:

```javascript
const CONFIG = {
  // Replace this with your actual Gemini API key
  GEMINI_API_KEY: 'YOUR_ACTUAL_API_KEY_HERE',  // <-- CHANGE THIS!

  // ... rest of config stays the same
};
```

**Example:**
```javascript
const CONFIG = {
  GEMINI_API_KEY: 'AIzaSyD1234567890abcdefGHIJKLMNOPQRSTUVWXYZ',  // ✅ Configured

  MODELS: {
    QUICK: 'gemini-2.0-flash-exp',
    DEEP: 'gemini-2.0-flash-thinking-exp'
  },
  // ...
};
```

### Step 3: Load and Test

1. Generate icons (open `icons/GENERATE_ICONS.html` in browser)
2. Load extension in Chrome (`chrome://extensions/` → Load unpacked)
3. Test on `TEST_ARTICLE.html` or any English article

That's it! Users can now install and use your extension without any configuration.

## ⚠️ Security Warnings

### API Key Visibility

**CRITICAL**: The API key in `config.js` will be **visible to anyone** who installs your extension. Chrome extensions cannot truly hide secrets from users because all files are accessible.

### What This Means

1. **All users share the same API key** and rate limits
2. **Free tier limits** (per day, shared across all users):
   - 15 requests per minute
   - 1,500 requests per day
3. **Users can extract the key** by inspecting extension files
4. **No usage attribution** - you can't tell which user made which request

### Rate Limit Impact

If you have 100 users and each analyzes 5 articles per day:
- **500 total requests/day** (well within free 1,500 limit)
- But if users exceed 15 requests/minute collectively, API calls will fail

## Production Recommendations

For a production extension with many users, consider these alternatives:

### Option 1: Backend Proxy Server (Recommended)

Create a backend that holds the API key:

```
User → Your Backend Server → Gemini API
      (API key hidden)
```

**Pros:**
- API key stays secret
- You control rate limiting
- Can track usage per user
- Can implement authentication

**Cons:**
- Requires server infrastructure
- Additional cost and complexity

**Implementation:**
```javascript
// In service worker (calls your server instead of Gemini directly)
async function callGeminiAPI(text, mode) {
  const response = await fetch('https://yourserver.com/api/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, mode })
  });
  return await response.json();
}
```

### Option 2: User Authentication + Individual Keys

Require users to create an account, then assign each a unique API key:

**Pros:**
- Per-user rate limiting
- Usage tracking
- Can monetize

**Cons:**
- Complex implementation
- Users need to sign up
- Still requires backend

### Option 3: API Key Restrictions (Partial Protection)

Use Google Cloud Console to restrict your API key:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Navigate to: APIs & Services → Credentials
4. Edit your API key
5. Add restrictions:
   - **HTTP referrers**: Limit to specific domains (won't work for extensions)
   - **IP addresses**: Limit to specific IPs (only for backend)
   - **API restrictions**: Only allow Gemini API

**Note**: This provides minimal protection for Chrome extensions.

### Option 4: Hybrid Approach

Free tier with shared key, paid tier with individual keys:

```javascript
const CONFIG = {
  // Free tier: shared key (limited features)
  FREE_TIER_KEY: 'AIza...',

  // Pro tier: users provide their own key
  USE_USER_KEY: false  // Toggle in settings
};
```

## API Usage Monitoring

Monitor your API usage at:
- [Google AI Studio - API Usage](https://makersuite.google.com/)
- Set up alerts for approaching quota limits

### Free Tier Quotas

| Limit | Value |
|-------|-------|
| Requests per minute | 15 |
| Requests per day | 1,500 |
| Requests per month | ~45,000 |

### Estimating Usage

- **Average article**: 500-1000 words
- **Analysis time**: ~3-5 seconds
- **API calls per article**: 1-2 (depending on length/chunking)

**Example**: 100 active users analyzing 5 articles/day each = 500-1,000 requests/day

## Development Best Practices

### 1. Use Environment Variables (If Building)

If you're building/packaging the extension:

```bash
# .env (DON'T commit this!)
GEMINI_API_KEY=AIzaSy...

# build script replaces placeholder
sed "s/YOUR_GEMINI_API_KEY_HERE/${GEMINI_API_KEY}/g" config.template.js > config.js
```

### 2. Separate Production/Development Keys

```javascript
const CONFIG = {
  GEMINI_API_KEY: process.env.NODE_ENV === 'production'
    ? 'PRODUCTION_KEY_HERE'
    : 'DEVELOPMENT_KEY_HERE',
  // ...
};
```

### 3. Add Usage Logging

Track API usage in your service worker:

```javascript
async function callGeminiAPI(text, mode, apiKey) {
  const startTime = Date.now();
  try {
    const response = await fetch(url, {...});
    const duration = Date.now() - startTime;

    // Log usage
    console.log(`API call: ${mode}, duration: ${duration}ms, chars: ${text.length}`);

    return await response.json();
  } catch (error) {
    console.error(`API error: ${error.message}`);
    throw error;
  }
}
```

### 4. Implement Client-Side Rate Limiting

Prevent users from accidentally hitting rate limits:

```javascript
// In service worker
let requestCount = 0;
let requestWindow = Date.now();

async function handleAnalysis(text, mode) {
  // Reset counter every minute
  if (Date.now() - requestWindow > 60000) {
    requestCount = 0;
    requestWindow = Date.now();
  }

  // Check limit (leave buffer for other users)
  if (requestCount >= 10) {  // 10 per minute per user
    throw new Error('Rate limit: Please wait a minute before analyzing again');
  }

  requestCount++;
  // ... proceed with analysis
}
```

## Testing Your Configuration

### 1. Check Configuration

```javascript
// Open browser console on any page
// Inspect extension service worker
console.log(self.LINGUISTIC_LENS_CONFIG.GEMINI_API_KEY);
// Should NOT be 'YOUR_GEMINI_API_KEY_HERE'
```

### 2. Test API Connection

```bash
# Test your API key directly
curl -X POST \
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"contents":[{"parts":[{"text":"Hello"}]}]}'
```

### 3. Monitor Errors

Check for configuration errors:
```javascript
// In service worker console
// Look for this error on startup:
// "⚠️ Gemini API key not configured! Please edit config.js..."
```

## Distribution

### Publishing to Chrome Web Store

1. **Remove** any development/test files
2. **Verify** API key is configured
3. **Test** thoroughly with configured key
4. **Package** the extension as ZIP
5. **Upload** to Chrome Web Store
6. **Monitor** usage after launch

### Private Distribution

For internal/private use:
1. Configure API key
2. Package as ZIP or CRX
3. Share via direct download
4. Users install via "Load unpacked" or drag-and-drop

## Troubleshooting

### "API key not configured" error

**Problem**: API key still has placeholder value
**Solution**: Edit `config.js` and replace `'YOUR_GEMINI_API_KEY_HERE'` with actual key

### API calls failing with 403/401

**Problem**: Invalid API key
**Solution**: Double-check key from Google AI Studio, ensure no extra spaces

### Rate limit errors (429)

**Problem**: Too many requests
**Solution**: Wait a minute, or upgrade to paid tier

### Extension not loading config

**Problem**: `importScripts` failed
**Solution**: Check `config.js` is in root directory, verify syntax (no errors)

## FAQ

**Q: Can users see my API key?**
A: Yes, anyone who installs the extension can view `config.js` in the extension files.

**Q: How many users can I support with the free tier?**
A: Depends on usage. ~100-300 light users, or 10-50 heavy users per day.

**Q: Can I use multiple API keys to increase limits?**
A: Technically yes, but violates Google's terms of service. Use paid tier instead.

**Q: Should I commit config.js to Git?**
A: NO! Add it to `.gitignore` and use a template file instead.

**Q: What happens if I hit the rate limit?**
A: API returns 429 error, users see error message, must wait before trying again.

**Q: Can I charge users for the extension?**
A: Yes, but you're responsible for API costs. Consider backend proxy with user authentication.

---

## Next Steps

1. ✅ Configure your API key in `config.js`
2. ✅ Generate icons (`icons/GENERATE_ICONS.html`)
3. ✅ Load extension in Chrome
4. ✅ Test with `TEST_ARTICLE.html`
5. ✅ Consider production architecture if scaling
6. ✅ Monitor usage and costs

**Need help?** Check the main README.md for full documentation.
