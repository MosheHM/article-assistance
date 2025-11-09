// service-worker.js - Background service worker for Gemini API integration

// Import configuration
importScripts('../config.js');

// Quick mode prompt template
const QUICK_MODE_PROMPT = (text) => `
Analyze the following English text for Hebrew-speaking language learners.
Return ONLY valid JSON with no markdown formatting or explanations.

Text to analyze:
"""
${text}
"""

Required JSON structure:
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
          "translation_he": "תרגום עברי מותאם להקשר",
          "inflection": "present|past|future|plural|singular|comparative|etc"
        }
      ]
    }
  ]
}

Critical Requirements:
1. Analyze EVERY word including articles and prepositions
2. POS tags must be one of: NOUN, VERB, ADJ, ADV, PREP, CONJ, PRON, DET, NUM, INTJ
3. Hebrew translations must be contextually appropriate
4. Lemma field required only for: NOUN, VERB, ADJ
5. Return ONLY the JSON object - no additional text or markdown
6. Ensure valid JSON syntax
7. Keep the exact original sentence text in the "text" field
`;

// Deep mode prompt template
const DEEP_MODE_PROMPT = (text) => `
Perform advanced linguistic analysis with dependency parsing for English language learners (Hebrew speakers).
Return ONLY valid JSON with no markdown code blocks.

Text to analyze:
"""
${text}
"""

Required JSON structure:
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
      "grammatical_notes_he": "הסברים נוספים בעברית על מבנה המשפט"
    }
  ]
}

Dependency relations to use:
- nsubj (nominal subject - נושא)
- dobj (direct object - מושא ישיר)
- iobj (indirect object - מושא עקיף)
- amod (adjectival modifier - מתאר)
- advmod (adverbial modifier - תואר פועל)
- nmod (nominal modifier - מאפיין שמני)
- prep (prepositional modifier - מילת יחס)
- det (determiner - מילת יידוע)
- aux (auxiliary - פועל עזר)
- conj (conjunction - חיבור)

Return ONLY the JSON - no markdown code blocks or explanations.
`;

// Listen for messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'analyze') {
    handleAnalysis(request.text, request.mode)
      .then(analysis => {
        sendResponse({ analysis });
      })
      .catch(error => {
        console.error('Analysis error:', error);
        sendResponse({ error: error.message });
      });

    return true; // Will respond asynchronously
  }
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

    // Clean markdown code blocks if present
    const cleanedText = rawText
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    // Parse JSON
    const parsed = JSON.parse(cleanedText);

    return parsed;
  } catch (error) {
    console.error('Gemini API call failed:', error);
    throw new Error(`Failed to analyze text: ${error.message}`);
  }
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
