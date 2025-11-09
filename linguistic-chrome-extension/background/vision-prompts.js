// vision-prompts.js - Vision API prompt templates with bounding box requests

/**
 * Quick Mode Vision Prompt
 * Requests basic POS tagging and translations with bounding boxes
 */
const QUICK_VISION_PROMPT = () => `
Analyze this screenshot of an English article for Hebrew-speaking language learners.

Extract EVERY visible word from the image and provide linguistic analysis.

Return a JSON object with this exact structure:
{
  "words": [
    {
      "text": "actual word as it appears",
      "bbox": [ymin, xmin, ymax, xmax],
      "lemma": "base dictionary form",
      "pos": "NOUN|VERB|ADJ|ADV|PREP|CONJ|PRON|DET|NUM|INTJ",
      "translation_he": "תרגום עברי מותאם להקשר",
      "inflection": "present|past|future|plural|singular|comparative|etc"
    }
  ]
}

BOUNDING BOX FORMAT:
- Coordinates are normalized to 0-1000 scale
- Format: [ymin, xmin, ymax, xmax]
- ymin: top edge (0 = top of image, 1000 = bottom)
- xmin: left edge (0 = left of image, 1000 = right)
- ymax: bottom edge
- xmax: right edge
- Example: [100, 200, 150, 350] means a word that:
  - starts 10% from top
  - starts 20% from left
  - ends 15% from top
  - ends 35% from left

CRITICAL REQUIREMENTS:
1. Analyze EVERY visible word in the screenshot (articles, prepositions, everything)
2. Bounding boxes MUST use normalized 0-1000 coordinates
3. POS tags must be exactly one of: NOUN, VERB, ADJ, ADV, PREP, CONJ, PRON, DET, NUM, INTJ
4. Hebrew translations must be contextually appropriate to the sentence meaning
5. Lemma field: required for NOUN, VERB, ADJ; empty string "" for others
6. Read text in natural reading order (left-to-right, top-to-bottom)
7. Ensure ALL strings are properly JSON-escaped (no unescaped quotes)
8. Return ONLY the JSON object - no markdown code blocks, no explanations

TEXT DETECTION TIPS:
- Include punctuation as separate words if visible (periods, commas, etc.)
- Preserve exact capitalization as shown in image
- Handle hyphenated words as single words
- Detect text even if partially obscured or small
`;

/**
 * Deep Mode Vision Prompt
 * Requests advanced dependency parsing and clause structure analysis
 */
const DEEP_VISION_PROMPT = () => `
Perform advanced linguistic analysis with dependency parsing on this English text screenshot.
This is for Hebrew-speaking language learners.

Extract EVERY visible word and provide comprehensive grammatical analysis.

Return a JSON object with this exact structure:
{
  "words": [
    {
      "text": "word",
      "bbox": [ymin, xmin, ymax, xmax],
      "index": 0,
      "lemma": "base form",
      "pos": "POS_TAG",
      "translation_he": "תרגום עברי",
      "inflection": "grammatical details",
      "dependencies": [
        {
          "to_index": 3,
          "relation": "nsubj|dobj|amod|advmod|nmod|prep|det|aux|conj",
          "relation_he": "נושא|מושא|מתאר|תואר פועל|מילת יחס|מילת יידוע|פועל עזר|חיבור"
        }
      ]
    }
  ],
  "sentences": [
    {
      "start_index": 0,
      "end_index": 10,
      "text": "The complete sentence text",
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

BOUNDING BOX FORMAT:
- Normalized 0-1000 scale: [ymin, xmin, ymax, xmax]
- ymin/xmin: top-left corner, ymax/xmax: bottom-right corner

DEPENDENCY RELATIONS:
- nsubj: nominal subject (נושא)
- dobj: direct object (מושא ישיר)
- iobj: indirect object (מושא עקיף)
- amod: adjectival modifier (מתאר)
- advmod: adverbial modifier (תואר פועל)
- nmod: nominal modifier (מאפיין שמני)
- prep: prepositional modifier (מילת יחס)
- det: determiner (מילת יידוע)
- aux: auxiliary (פועל עזר)
- conj: conjunction (חיבור)
- compound: compound word (מילה מורכבת)
- mark: subordinating conjunction (מילת קישור משנית)

CRITICAL REQUIREMENTS:
1. Analyze EVERY visible word with bounding boxes (0-1000 normalized coordinates)
2. Word index starts at 0 and increments in reading order
3. Dependencies reference word indices
4. Group words into sentences based on visual layout and punctuation
5. Identify clause boundaries within sentences
6. Hebrew translations must be contextually accurate
7. ALL strings must be properly JSON-escaped
8. Return ONLY the JSON object - no markdown, no explanations

SENTENCE DETECTION:
- Use periods, question marks, exclamation marks as sentence boundaries
- Consider line breaks and visual spacing for paragraph/sentence detection
- Each sentence should have coherent clause structure analysis
`;

/**
 * Fallback prompt for error recovery
 * Simpler structure for when complex analysis fails
 */
const FALLBACK_VISION_PROMPT = () => `
Analyze this screenshot and extract all visible English words with their positions.

Return a JSON object:
{
  "words": [
    {
      "text": "word",
      "bbox": [ymin, xmin, ymax, xmax],
      "pos": "NOUN|VERB|ADJ|ADV|PREP|CONJ|PRON|DET",
      "translation_he": "תרגום"
    }
  ]
}

Requirements:
- Bounding boxes: 0-1000 normalized coordinates [ymin, xmin, ymax, xmax]
- Extract ALL visible words
- Basic POS tagging and Hebrew translation
- Return ONLY valid JSON
`;

// Export prompts for service worker
if (typeof self !== 'undefined' && self.constructor.name === 'ServiceWorkerGlobalScope') {
  self.VISION_PROMPTS = {
    quick: QUICK_VISION_PROMPT,
    deep: DEEP_VISION_PROMPT,
    fallback: FALLBACK_VISION_PROMPT
  };
}
