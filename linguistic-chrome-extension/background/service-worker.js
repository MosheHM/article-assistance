// service-worker.js - Background service worker for Gemini API integration

// Import configuration and vision prompts
try {
  importScripts('../config.js');
  importScripts('./vision-prompts.js');
  console.log('✓ Config loaded successfully');
  console.log('✓ Vision prompts loaded');
  console.log('✓ API Key configured:', self.LINGUISTIC_LENS_CONFIG?.GEMINI_API_KEY ? 'Yes' : 'No');
} catch (error) {
  console.error('✗ Failed to load dependencies:', error);
}

// Quick mode prompt template
const QUICK_MODE_PROMPT = (text) => `
Analyze the following English text for Hebrew-speaking language learners.
Return a valid JSON object with the structure defined below.

Text to analyze:
"""
${text}
"""

Return a JSON object with this structure:
{
  "sentences": [
    {
      "id": "s1",
      "text": "The complete original sentence",
      "tokens": [
        {
          "word": "actual word as it appears",
          "lemma": "base dictionary form",
          "pos": "NOUN|VERB|ADJ|ADV|PREP|CONJ|PRON|DET|NUM|INTJ",
          "translation_he": "תרגום עברי",
          "inflection": "grammatical details"
        }
      ]
    }
  ]
}

CRITICAL REQUIREMENTS:
1. Analyze EVERY word including articles and prepositions
2. POS tags: NOUN, VERB, ADJ, ADV, PREP, CONJ, PRON, DET, NUM, or INTJ only
3. Hebrew translations must be contextually appropriate
4. Lemma field: required for NOUN, VERB, ADJ; empty string "" for others
5. Ensure ALL strings are properly escaped (no unescaped quotes)
6. Keep the exact original sentence text in the "text" field
7. Return ONLY valid JSON - no markdown, no explanations
`;

// Deep mode prompt template
const DEEP_MODE_PROMPT = (text) => `
Perform advanced linguistic analysis with dependency parsing for English language learners (Hebrew speakers).
Return a valid JSON object with the structure defined below.

Text to analyze:
"""
${text}
"""

Return a JSON object with this structure:
{
  "sentences": [
    {
      "id": "s1",
      "text": "original sentence",
      "tokens": [
        {
          "index": 0,
          "word": "word",
          "lemma": "base form",
          "pos": "POS_TAG",
          "translation_he": "תרגום",
          "inflection": "details"
        }
      ],
      "dependencies": [
        {
          "from_index": 2,
          "to_index": 4,
          "relation": "nsubj|dobj|amod|advmod|nmod|etc",
          "relation_he": "נושא|מושא|מתאר|תואר פועל"
        }
      ],
      "clause_structure": {
        "main_clause": {"start": 0, "end": 5},
        "subordinate_clauses": [
          {"start": 6, "end": 10, "type": "relative|adverbial|nominal"}
        ]
      },
      "grammatical_notes_he": "הסברים נוספים בעברית"
    }
  ]
}

Dependency relations: nsubj, dobj, iobj, amod, advmod, nmod, prep, det, aux, conj

CRITICAL REQUIREMENTS:
1. Ensure ALL strings are properly escaped (no unescaped quotes)
2. Return ONLY valid JSON - no markdown, no explanations
3. Keep the exact original sentence text
`;

// Listen for messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('📨 Received message:', request.action);

  if (request.action === 'captureScreenshot') {
    // Capture screenshot of the sender's tab
    captureScreenshot(sender.tab.id)
      .then(result => {
        console.log('✓ Screenshot captured');
        sendResponse(result);
      })
      .catch(error => {
        console.error('✗ Screenshot capture error:', error);
        sendResponse({ error: error.message });
      });

    return true; // Keep message channel open for async response
  }

  if (request.action === 'analyzeScreenshot') {
    // Handle screenshot-based vision analysis
    handleScreenshotAnalysis(request.screenshot, request.viewport, request.mode)
      .then(analysis => {
        console.log('✓ Screenshot analysis complete');
        sendResponse({ analysis });
      })
      .catch(error => {
        console.error('✗ Screenshot analysis error:', error);
        sendResponse({ error: error.message });
      });

    return true; // Keep message channel open for async response
  }

  if (request.action === 'analyze') {
    // Handle async response (legacy text-based analysis - will be removed)
    handleAnalysis(request.text, request.mode)
      .then(analysis => {
        console.log('✓ Analysis complete, sending response');
        sendResponse({ analysis });
      })
      .catch(error => {
        console.error('✗ Analysis error:', error);
        sendResponse({ error: error.message });
      });

    return true; // CRITICAL: Keep message channel open for async response
  }

  // If not a recognized request, return false
  return false;
});

// Handle analysis request
async function handleAnalysis(text, mode) {
  try {
    // Get API key from config (provided by developer)
    const apiKey = self.LINGUISTIC_LENS_CONFIG.GEMINI_API_KEY;

    if (!apiKey || apiKey === 'YOUR_GEMINI_API_KEY_HERE') {
      throw new Error('API key not configured. Please edit config.js and add your Gemini API key.');
    }

    // Split text into chunks if too long (max ~3000 words per chunk)
    const chunks = splitTextIntoChunks(text, self.LINGUISTIC_LENS_CONFIG.MAX_WORDS_PER_CHUNK);
    const allSentences = [];

    // Process each chunk
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const analysis = await callGeminiAPI(chunk, mode, apiKey);

      if (analysis && analysis.sentences) {
        // Add chunk offset to sentence IDs
        analysis.sentences.forEach((sentence, idx) => {
          sentence.id = `s${i}_${idx}`;
        });
        allSentences.push(...analysis.sentences);
      }
    }

    return { sentences: allSentences };
  } catch (error) {
    console.error('Error in handleAnalysis:', error);
    throw error;
  }
}

// Call Gemini API
async function callGeminiAPI(text, mode, apiKey) {
  const config = self.LINGUISTIC_LENS_CONFIG;
  const modelName = mode === 'quick' ? config.MODELS.QUICK : config.MODELS.DEEP;

  const prompt = mode === 'quick'
    ? QUICK_MODE_PROMPT(text)
    : DEEP_MODE_PROMPT(text);

  const url = `${config.API_ENDPOINT}/${modelName}:generateContent?key=${apiKey}`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }],
        generationConfig: config.GENERATION_CONFIG
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Gemini API error: ${response.status} - ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();

    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
      throw new Error('Invalid response from Gemini API');
    }

    const rawText = data.candidates[0].content.parts[0].text;

    // Log first 500 chars of raw response for debugging
    console.log('📄 Raw API response (first 500 chars):', rawText.substring(0, 500));
    console.log('📏 Total response length:', rawText.length);

    // Clean markdown code blocks and common formatting issues
    let cleanedText = rawText
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    // Try to parse JSON
    try {
      const parsed = JSON.parse(cleanedText);
      console.log('✓ JSON parsed successfully');
      return parsed;
    } catch (parseError) {
      console.error('❌ JSON parse error:', parseError.message);
      console.error('🔍 Problematic JSON (last 200 chars):', cleanedText.slice(-200));

      // Try to fix common issues
      console.log('🔧 Attempting to fix JSON...');

      // 1. Find the last complete "sentences" array
      const sentencesMatch = cleanedText.match(/\{"sentences":\s*\[(.*)\]\s*\}/s);
      if (sentencesMatch) {
        // Try to find the last complete sentence object
        const correctedJson = attemptJsonRepair(cleanedText);
        if (correctedJson) {
          console.log('✓ JSON repaired successfully');
          return correctedJson;
        }
      }

      // If repair fails, throw detailed error
      throw new Error(`JSON parsing failed: ${parseError.message}. Response length: ${rawText.length} chars. Check service worker console for raw response.`);
    }
  } catch (error) {
    console.error('Gemini API call failed:', error);
    throw new Error(`Failed to analyze text: ${error.message}`);
  }
}

// Attempt to repair malformed JSON from Gemini
function attemptJsonRepair(jsonString) {
  try {
    // Strategy 1: Remove everything after the last complete sentence object
    const lastCompleteSentence = jsonString.lastIndexOf('}');
    if (lastCompleteSentence > -1) {
      let truncated = jsonString.substring(0, lastCompleteSentence + 1);

      // Ensure proper closing brackets
      const openBraces = (truncated.match(/\{/g) || []).length;
      const closeBraces = (truncated.match(/\}/g) || []).length;
      const openBrackets = (truncated.match(/\[/g) || []).length;
      const closeBrackets = (truncated.match(/\]/g) || []).length;

      // Add missing closing brackets
      if (openBrackets > closeBrackets) {
        truncated += ']'.repeat(openBrackets - closeBrackets);
      }
      if (openBraces > closeBraces) {
        truncated += '}'.repeat(openBraces - closeBraces);
      }

      return JSON.parse(truncated);
    }
  } catch (e) {
    console.log('🔧 Repair attempt failed:', e.message);
  }
  return null;
}

// Split text into manageable chunks
function splitTextIntoChunks(text, maxWords) {
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  const chunks = [];
  let currentChunk = '';
  let wordCount = 0;

  for (const sentence of sentences) {
    const sentenceWords = sentence.trim().split(/\s+/).length;

    if (wordCount + sentenceWords > maxWords && currentChunk) {
      chunks.push(currentChunk.trim());
      currentChunk = sentence;
      wordCount = sentenceWords;
    } else {
      currentChunk += ' ' + sentence;
      wordCount += sentenceWords;
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

// Capture screenshot of visible tab
async function captureScreenshot(tabId) {
  try {
    // Capture the visible portion of the tab
    const dataUrl = await chrome.tabs.captureVisibleTab(null, {
      format: 'png',
      quality: 100
    });

    // Extract base64 data (remove data:image/png;base64, prefix)
    const base64 = dataUrl.split(',')[1];

    console.log(`📸 Screenshot captured: ${base64.length} bytes`);

    return {
      dataUrl: dataUrl,
      base64: base64
    };
  } catch (error) {
    console.error('Screenshot capture failed:', error);
    throw new Error(`Failed to capture screenshot: ${error.message}`);
  }
}

// Handle screenshot-based vision analysis
async function handleScreenshotAnalysis(screenshotBase64, viewport, mode) {
  try {
    // Get API key from config
    const apiKey = self.LINGUISTIC_LENS_CONFIG.GEMINI_API_KEY;

    if (!apiKey || apiKey === 'YOUR_GEMINI_API_KEY_HERE') {
      throw new Error('API key not configured. Please edit config.js and add your Gemini API key.');
    }

    console.log('🔍 Analyzing screenshot with Gemini Vision API...');
    console.log('📐 Viewport:', viewport);

    // Call Gemini Vision API
    const analysis = await callGeminiVisionAPI(screenshotBase64, viewport, mode, apiKey);

    if (!analysis || !analysis.words || analysis.words.length === 0) {
      throw new Error('Failed to get valid analysis from Gemini Vision API');
    }

    console.log(`✓ Received analysis for ${analysis.words.length} words`);

    return analysis;
  } catch (error) {
    console.error('Error in handleScreenshotAnalysis:', error);
    throw error;
  }
}

// Call Gemini Vision API with screenshot
async function callGeminiVisionAPI(base64Image, viewport, mode, apiKey) {
  const config = self.LINGUISTIC_LENS_CONFIG;
  const modelName = mode === 'quick' ? config.MODELS.QUICK : config.MODELS.DEEP;

  // Import vision prompts (will be created in next phase)
  // For now, use a basic vision prompt
  const prompt = buildVisionPrompt(viewport, mode);

  const url = `${config.API_ENDPOINT}/${modelName}:generateContent?key=${apiKey}`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: prompt },
            {
              inline_data: {
                mime_type: 'image/png',
                data: base64Image
              }
            }
          ]
        }],
        generationConfig: config.GENERATION_CONFIG
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Gemini Vision API error: ${response.status} - ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();

    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
      throw new Error('Invalid response from Gemini Vision API');
    }

    const rawText = data.candidates[0].content.parts[0].text;

    // Log first 500 chars of raw response for debugging
    console.log('📄 Raw Vision API response (first 500 chars):', rawText.substring(0, 500));
    console.log('📏 Total response length:', rawText.length);

    // Clean markdown code blocks
    let cleanedText = rawText
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    // Try to parse JSON
    try {
      const parsed = JSON.parse(cleanedText);
      console.log('✓ Vision JSON parsed successfully');
      return parsed;
    } catch (parseError) {
      console.error('❌ Vision JSON parse error:', parseError.message);
      console.error('🔍 Problematic JSON (last 200 chars):', cleanedText.slice(-200));

      // Try to repair
      const correctedJson = attemptJsonRepair(cleanedText);
      if (correctedJson) {
        console.log('✓ Vision JSON repaired successfully');
        return correctedJson;
      }

      throw new Error(`Vision JSON parsing failed: ${parseError.message}`);
    }
  } catch (error) {
    console.error('Gemini Vision API call failed:', error);
    throw new Error(`Failed to analyze screenshot: ${error.message}`);
  }
}

// Build vision prompt using imported templates
function buildVisionPrompt(viewport, mode) {
  const promptFn = mode === 'quick' ? self.VISION_PROMPTS.quick : self.VISION_PROMPTS.deep;
  return promptFn();
}

// Installation handler
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('Linguistic Lens installed!');
    // Open welcome page or settings
    chrome.tabs.create({ url: chrome.runtime.getURL('ui/popup.html') });
  } else if (details.reason === 'update') {
    console.log('Linguistic Lens updated!');
  }
});

// Service worker startup log
console.log('🚀 Linguistic Lens service worker started');
console.log('📝 Config status:', {
  configLoaded: typeof self.LINGUISTIC_LENS_CONFIG !== 'undefined',
  hasApiKey: self.LINGUISTIC_LENS_CONFIG?.GEMINI_API_KEY !== 'YOUR_GEMINI_API_KEY_HERE',
  models: self.LINGUISTIC_LENS_CONFIG?.MODELS
});
