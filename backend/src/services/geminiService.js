/**
 * BACKEND - Gemini AI Service
 * This file contains AI question generation logic using Google's Gemini API
 * Used by backend API controllers
 * DO NOT use this in frontend - this should only run on the server
 */

// Core Node.js modules
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  logGeminiApiError,
  logGeminiParsingError,
  logGeminiValidationError,
  logGeminiRateLimitError
} from './geminiErrorService.js';
// Third-party imports
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

// Local imports
import { downloadAny } from './supabaseStorage.js';

// We'll use dynamic import for pdf-parse to avoid ESM/CommonJS issues

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

/**
 * Detect language from text content using Unicode ranges
 * @param {string} text - Text content to analyze
 * @returns {string} - Detected language: 'English', 'Sinhala', or 'Tamil'
 */
function detectLanguageFromText(text) {
  if (!text || typeof text !== 'string') return 'English';

  // Count characters in each Unicode range
  let sinhalaCount = 0;
  let tamilCount = 0;
  let englishCount = 0;

  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);

    // Sinhala Unicode range: 0D80-0DFF
    if (code >= 0x0D80 && code <= 0x0DFF) {
      sinhalaCount++;
    }
    // Tamil Unicode range: 0B80-0BFF
    else if (code >= 0x0B80 && code <= 0x0BFF) {
      tamilCount++;
    }
    // English/Latin: 0041-007A (A-Z, a-z)
    else if ((code >= 0x0041 && code <= 0x005A) || (code >= 0x0061 && code <= 0x007A)) {
      englishCount++;
    }
  }

  // Determine primary language based on character count
  if (sinhalaCount > tamilCount && sinhalaCount > englishCount) {
    return 'Sinhala';
  } else if (tamilCount > sinhalaCount && tamilCount > englishCount) {
    return 'Tamil';
  } else {
    return 'English';
  }
}

/**
 * Extract text from file data based on MIME type
 * @param {string} base64Data - Base64 encoded file data
 * @param {string} mimeType - MIME type of the file
 * @returns {Promise<string>} - Extracted text
 */
async function extractTextFromFile(base64Data, mimeType) {
  try {
    const buffer = Buffer.from(base64Data, 'base64');

    if (mimeType === 'application/pdf') {
      try {
        // Use dynamic import for pdf-parse
        const { default: pdfParse } = await import('pdf-parse');
        // Simple and fast text extraction with pdf-parse
        const data = await pdfParse(buffer, {
          // Limit to first 30 pages for better content coverage
          max: 30,
          // Disable worker threads for better compatibility
          worker: false
        });

        if (!data.text || !data.text.trim()) {
          throw new Error('No text content could be extracted from the PDF');
        }

        // Clean up the extracted text to remove garbage characters
        let cleanedText = data.text
          // Remove null bytes and control characters except newlines and tabs
          .replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F-\x9F]/g, '')
          // Normalize whitespace
          .replace(/\s+/g, ' ')
          .trim();

        // Check if we have meaningful content (not just garbage)
        const hasValidContent = /[a-zA-Z\u0D80-\u0DFF\u0B80-\u0BFF]{10,}/.test(cleanedText);

        if (!hasValidContent) {
          throw new Error('PDF text extraction produced invalid characters');
        }

        return cleanedText;
      } catch (error) {
        console.error('PDF text extraction error:', error);
        throw new Error(`Failed to extract text from PDF: ${error.message}`);
      }
    }

    // For images, use Gemini Vision to extract text
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const result = await model.generateContent({
      contents: [{
        parts: [
          { text: 'Extract all text from this image. Return only the raw text, no formatting or additional text.' },
          {
            inlineData: {
              mimeType,
              data: base64Data
            }
          }
        ]
      }]
    });

    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('[Backend Gemini] Error extracting text from file:', error);
    throw new Error(`Failed to extract text from file: ${error.message}`);
  }
}

// Enhanced retry helper with exponential backoff and jitter
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const withRetry = async (fn, options = {}) => {
  const {
    maxAttempts = 5,
    baseDelay = 1000, // 1 second base delay
    maxDelay = 30000, // 30 seconds max delay
  } = options;

  let attempt = 0;
  let lastError;

  while (attempt < maxAttempts) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      attempt++;

      // Don't retry on client errors (4xx) except 429 (rate limit)
      if (error.status >= 400 && error.status < 500 && error.status !== 429) {
        throw error;
      }

      // Calculate delay with exponential backoff and jitter
      const backoff = Math.min(
        Math.pow(2, attempt) * baseDelay + Math.random() * 1000,
        maxDelay
      );

      console.warn(`[Backend Gemini] Attempt ${attempt}/${maxAttempts} failed: ${error.message}. Retrying in ${Math.round(backoff)}ms`);

      // Wait before retry
      if (attempt < maxAttempts) {
        await sleep(backoff);
      }
    }
  }

  // If we get here, all attempts failed
  console.error(`[Backend Gemini] All ${maxAttempts} attempts failed. Last error:`, lastError);
   if (lastError) {
    await logGeminiApiError(lastError, {
      apiEndpoint: 'withRetry',
      retryAttempt: maxAttempts,
      maxAttempts
    });
  }
  
  throw lastError || new Error('Max retry attempts reached');
};

/**
 * Generate multiple Learning Packs (one per chapter/section) from a base64 file.
 * Returns an array: [{ title, content, order, language }]
 */
export const generateLearningPacksFromBase64 = async (base64Data, mimeType) => {
  try {
    const isPdf = mimeType === 'application/pdf';
    const isImage = mimeType.startsWith('image/');
    const isDocx = mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    const isDoc = mimeType === 'application/msword';
    const isTxt = mimeType === 'text/plain';

    let prompt = '';
    let textForChapters = '';
    let forceVisionAPI = false;

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    // Pre-check for Sinhala/Tamil content in PDFs - use Vision API if detected
    if (isPdf) {
      try {
        const buffer = Buffer.from(base64Data, 'base64');
        const { default: pdfParse } = await import('pdf-parse');
        const quickCheck = await pdfParse(buffer, { max: 3 }); // Check first 3 pages only
        const sampleText = quickCheck.text.substring(0, 5000);

        // Detect if content has Sinhala/Tamil characters
        const hasSinhala = /[\u0D80-\u0DFF]{5,}/.test(sampleText);
        const hasTamil = /[\u0B80-\u0BFF]{5,}/.test(sampleText);

        if (hasSinhala || hasTamil) {
          forceVisionAPI = true;
        }
      } catch (preCheckError) {
        console.warn('[Backend Gemini] Pre-check failed, will use Vision API:', preCheckError.message);
        forceVisionAPI = true;
      }
    }

    // Helper: sanitize slightly-malformed JSON array text
    const sanitizeJsonArrayString = (raw) => {
      if (!raw || typeof raw !== 'string') return raw;
      let s = raw.trim();
      const m = s.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || s.match(/\[[\s\S]*\]/);
      if (m) s = (m[1] || m[0]).trim();
      s = s.replace(/[“”]/g, '"').replace(/[‘’]/g, "'");
      // Remove control characters except \n, \r, \t
      s = s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, ' ');
      s = s.replace(/,\s*(\]|\})/g, '$1');
      const start = s.indexOf('[');
      const end = s.lastIndexOf(']');
      if (start !== -1 && end !== -1) s = s.substring(start, end + 1);
      return s;
    };

    // Local fallback: split plain text into multiple packs
    const splitTextIntoPacks = (text) => {
      const cleaned = String(text || '').replace(/\u0000/g, '').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
      if (!cleaned) return [];
      const paragraphs = cleaned.split(/\n\s*\n+/);
      const packs = [];
      let buf = [];
      let chars = 0;
      const targetMin = 1200;
      const targetMax = 2500;
      paragraphs.forEach((p) => {
        const para = p.trim();
        if (!para) return;
        if (chars > 0 && (chars + para.length > targetMax)) {
          const content = buf.join('\n\n');
          const firstLine = content.split('\n')[0] || '';
          const title = (firstLine.length > 8 && firstLine.length < 120) ? firstLine : `Chapter ${packs.length + 1}`;
          packs.push({ title, content, order: packs.length + 1, language: 'English' });
          buf = [para];
          chars = para.length;
        } else {
          buf.push(para);
          chars += para.length;
          if (chars >= targetMin) {
            const content = buf.join('\n\n');
            const firstLine = content.split('\n')[0] || '';
            const title = (firstLine.length > 8 && firstLine.length < 120) ? firstLine : `Chapter ${packs.length + 1}`;
            packs.push({ title, content, order: packs.length + 1, language: 'English' });
            buf = [];
            chars = 0;
          }
        }
      });
      if (buf.length) {
        const content = buf.join('\n\n');
        const firstLine = content.split('\n')[0] || '';
        const title = (firstLine.length > 8 && firstLine.length < 120) ? firstLine : `Chapter ${packs.length + 1}`;
        packs.push({ title, content, order: packs.length + 1, language: 'English' });
      }
      return packs;
    };

    // Local fallback orchestrator
    const localFallbackPacks = async () => {
      try {
        if (isPdf) {
          const { default: PDFParser } = await import('pdf2json');
          const buffer = Buffer.from(base64Data, 'base64');
          const text = await new Promise((resolve, reject) => {
            const pdfParser = new PDFParser(this, 1);
            pdfParser.on('pdfParser_dataError', errData => reject(new Error(errData.parserError)));
            pdfParser.on('pdfParser_dataReady', pdfData => {
              try {
                const pages = pdfData?.Pages || [];
                const parts = [];
                const safeDecode = (s) => {
                  if (typeof s !== 'string') return '';
                  const replaced = s.replace(/\+/g, ' ');
                  try { return decodeURIComponent(replaced); } catch { return replaced; }
                };
                pages.forEach(pg => {
                  (pg.Texts || []).forEach(t => {
                    const str = (t.R || []).map(r => safeDecode(r.T || '')).join('');
                    parts.push(str);
                  });
                  parts.push('\n\n');
                });
                resolve(parts.join(' '));
              } catch (e) {
                reject(e);
              }
            });
            pdfParser.parseBuffer(buffer);
          });
          const packs = splitTextIntoPacks(text);
          if (packs.length) return packs;
        } else if (isDocx) {
          const { default: mammoth } = await import('mammoth');
          const buffer = Buffer.from(base64Data, 'base64');
          const { value } = await mammoth.extractRawText({ buffer });
          const packs = splitTextIntoPacks(value || '');
          if (packs.length) return packs;
        } else if (isTxt) {
          const text = Buffer.from(base64Data, 'base64').toString('utf-8');
          const packs = splitTextIntoPacks(text);
          if (packs.length) return packs;
        }
      } catch (e) {
        console.error('[Backend Gemini] Local fallback error:', e);
      }
      return [{ title: 'Chapter 1: Document Content', content: 'Content not available', order: 1, language: 'English' }];
    };

    if (isPdf || isImage || forceVisionAPI) {
      // Use Vision API for images, PDFs, and Sinhala/Tamil content
      const imagePart = { inlineData: { data: base64Data, mimeType } };
      prompt = `You are an expert educational content creator for the Sri Lankan local syllabus (Grades 6-11) with advanced multilingual capabilities in English, Sinhala, and Tamil.

⚠️ ABSOLUTE RULES - VIOLATION WILL RESULT IN REJECTION:
1. **FIRST**: Check if this is a TABLE OF CONTENTS page - if yes, extract chapter titles ONLY
2. Create ONE learning pack per ACTUAL chapter found in the document
3. Each pack must have a REAL, meaningful title from the document
4. Use ONLY clean Unicode - NO garbage characters, NO corrupted text
5. ALL content must be in the DETECTED language (English/Sinhala/Tamil)
6. DO NOT create a pack for every page - analyze the ENTIRE document structure first
7. If document has 15 chapters, create 15 packs; if 3 chapters, create 3 packs

---

### STEP 0: DOCUMENT STRUCTURE ANALYSIS (DO THIS FIRST!)

🔍 **CRITICAL**: Before creating packs, analyze the ENTIRE document:

**STEP 0.1: Is this a Table of Contents?**
- Look for: "Contents", "Table of Contents", "Index", "පටුන", "අන්තර්ගතය", "உள்ளடக்கம்"
- Check if you see a list of chapter titles with page numbers
- **IMPORTANT**: If you find a TOC, you MUST also scan the REST of the document

**STEP 0.2: TOC VALIDATION (CRITICAL!)**
If you found a Table of Contents:
1. **Count TOC entries**: How many chapters are listed? (e.g., 5 chapters)
2. **Scan remaining pages**: Look through ALL pages after the TOC
3. **Verify chapter presence**: Check if those chapters actually exist in the document
4. **Compare content volume**: 
   - If TOC lists 5 chapters but document has 50+ pages of content → TOC is valid ✅
   - If TOC lists 10 chapters but document only has 3 pages → TOC is INVALID ❌
   - If TOC is just 1 page and rest is blank → TOC is INVALID ❌

**STEP 0.3: Decision Logic**
- **If TOC is VALID** (matches actual document structure):
  → Extract chapter titles from TOC
  → Scan actual content to create meaningful summaries
  → Create packs based on TOC structure
  
- **If TOC is INVALID or INCOMPLETE** (doesn't match document):
  → IGNORE the TOC
  → Analyze the full document content
  → Detect chapters from actual content (not from TOC)
  → Create packs based on what you actually see

**STEP 0.4: Document Type Detection (if no valid TOC):**
1. **Single Chapter Document**: If you see only ONE main topic → Create 1 pack
2. **Multi-Chapter Textbook**: If you see clear chapter divisions → Create 1 pack per chapter (ALL chapters)
3. **Exercise/Worksheet**: If mostly problems/exercises → Create 1 pack summarizing topics
4. **Reference Material**: If dense content without chapters → Create 2-3 thematic packs

⚠️ **NEVER** treat each page as a separate chapter!
⚠️ **ALWAYS** verify TOC against actual document content!
⚠️ **ALWAYS** create packs for ALL actual chapters found (whether 3, 10, 15, or 20 chapters)

---

### STEP 1: CRITICAL - PROPER UNICODE OCR

🚨 **ABSOLUTE REQUIREMENT**: You MUST output proper Unicode characters. NO EXCEPTIONS.

**FORBIDDEN OUTPUT EXAMPLES** (These are GARBAGE - DO NOT PRODUCE):
❌ ";d;aúl ixLHd" 
❌ "o¾Yl yd ,>q.Kl"
❌ "fkdñ,a fnod yeÿ"
❌ ">k jia;=j,"
❌ "iudka;r f¾Ld"

**REQUIRED OUTPUT EXAMPLES** (Proper Unicode):
✅ Sinhala: "පළමු පරිච්ඡේදය", "ගණිතය", "සංඛ්‍යා පද්ධති", "වීජ ගණිතය"
✅ Tamil: "முதல் அத்தியாயம்", "கணிதம்", "எண் முறைகள்", "இயற்கணிதம்"
✅ English: "Chapter 1", "Mathematics", "Number Systems", "Algebra"

**Language Detection**:
1. Look at the script in the image
2. If you see Sinhala script (rounded characters like ක ග ච ජ ට ඩ ණ ත ද න ප බ ම ය ර ල ව ශ ෂ ස හ ළ):
   - Language = "Sinhala"
   - Unicode range: U+0D80 to U+0DFF
   - Output ONLY Sinhala Unicode characters
3. If you see Tamil script (angular characters like க ங ச ஞ ட ண த ந ப ம ய ர ல வ ழ ள ற ன):
   - Language = "Tamil"  
   - Unicode range: U+0B80 to U+0BFF
   - Output ONLY Tamil Unicode characters
4. If you see Latin alphabet (A-Z, a-z):
   - Language = "English"

**SELF-VALIDATION BEFORE RESPONDING**:
Before you output anything, check:
1. Does my output contain characters from the CORRECT Unicode range?
2. Do the words look like real Sinhala/Tamil words (not Latin gibberish)?
3. Would a native speaker recognize these as proper words?

If ANY answer is NO, you MUST re-read the image and try again.

### STEP 2: INTELLIGENT PACK CREATION

⚠️ **CRITICAL RULES**:

**SCENARIO A: VALID TABLE OF CONTENTS FOUND**
If you validated the TOC (Step 0.2) and it matches the document:
1. Extract ALL chapter/section titles from the TOC
2. **IMPORTANT**: Scan the actual chapter content pages to create accurate summaries
3. Don't just use TOC titles - read the actual chapter content
4. Create one pack per chapter with:
   - Title from TOC
   - SHORT, PRECISE summary from actual chapter content (40-60 words MAXIMUM)
   - Detected language
5. If TOC shows 15 chapters, create 15 packs; if 20 chapters, create 20 packs

**SCENARIO B: INVALID/INCOMPLETE TOC OR NO TOC**
If TOC doesn't match document OR no TOC exists:
1. **Scan the ENTIRE document**: Look through all pages
2. **Count chapters by markers**:
   - English: "Chapter 1", "Unit 1", "Lesson 1", "Section 1.1", "Part 1"
   - Sinhala: "පරිච්ඡේදය 1", "පාඩම 1", "ඒකකය 1", "කොටස 1"
   - Tamil: "அத்தியாயம் 1", "பாடம் 1", "அலகு 1", "பகுதி 1"

3. **Decision Logic:**
   - **0-1 chapters found**: Create 1 comprehensive pack covering all content
   - **2+ chapters found**: Create 1 pack per chapter (ALL chapters, no limit)
   - **Example**: If 15 chapters exist, create 15 packs
   - **Example**: If 3 chapters exist, create 3 packs

**SCENARIO C: UNCLEAR STRUCTURE**
If no clear chapters or TOC:
- Analyze main topics/themes
- Create 1-3 thematic packs based on content
- NEVER create a pack for every page

**GOLDEN RULES**: 
- ✅ ALWAYS verify TOC against actual content
- ✅ ALWAYS create packs for ALL actual chapters found
- ✅ ALWAYS read actual content (not just TOC)
- ❌ NEVER create a pack for every page
- ❌ NEVER trust TOC without verification

### STEP 3: Create Learning Packs
For EACH identified chapter:
- **title**: Extract the EXACT chapter title from the document (in detected language)
- **content**: Write a SHORT, PRECISE summary (40-60 words MAXIMUM) covering ONLY the key concepts (in detected language)
- **language**: The detected language

⚠️ CRITICAL: Keep summaries SHORT and PRECISE - 40-60 words MAXIMUM! Focus on key points only!

### IF NO CLEAR CHAPTERS EXIST:
Create EXACTLY ONE comprehensive learning pack that covers all main themes of the document.

### VALIDATION RULES:
✓ Each title must be meaningful and readable
✓ NO random characters like "fkdñ,a fnod yeÿ iyd h'"
✓ NO corrupted text or encoding errors
✓ Use proper Unicode for Sinhala (0D80-0DFF) and Tamil (0B80-0BFF)
✓ Create packs for ALL actual chapters (no arbitrary limit)
✓ Language field MUST match the actual content language

### OUTPUT FORMAT EXAMPLES:

**Example 1: Sinhala Math Textbook (Multiple Chapters)**
<BEGIN_JSON>
[
  {
    "title": "පරිච්ඡේදය 1: සංඛ්‍යා පද්ධති",
    "content": "මෙම පරිච්ඡේදයෙන් සංඛ්‍යා පද්ධති පිළිබඳ මූලික සංකල්ප විස්තර කෙරේ. ස්වභාවික සංඛ්‍යා, පූර්ණ සංඛ්‍යා සහ තාර්කික සංඛ්‍යා ගැන සාකච්ඡා කෙරේ.",
    "language": "Sinhala"
  },
  {
    "title": "පරිච්ඡේදය 2: වීජ ගණිතය",
    "content": "වීජ ගණිතයේ මූලික සංකල්ප හඳුන්වා දෙයි. විචල්‍යයන්, සමීකරණ සහ අසමානතා විසඳීම පිළිබඳ විස්තර කෙරේ.",
    "language": "Sinhala"
  }
]
<END_JSON>

**Example 2: Tamil Science Document (Single Topic)**
<BEGIN_JSON>
[
  {
    "title": "அத்தியாயம் 1: ஒளியியல்",
    "content": "இந்த அத்தியாயம் ஒளியின் பண்புகள் மற்றும் நடத்தை பற்றி விவரிக்கிறது. பிரதிபலிப்பு, ஒளிவிலகல் மற்றும் ஒளி சிதறல் பற்றிய கருத்துக்கள் விளக்கப்படுகின்றன.",
    "language": "Tamil"
  }
]
<END_JSON>

**Example 3: English Textbook (Table of Contents Detected)**
<BEGIN_JSON>
[
  {
    "title": "Chapter 1: Introduction to Biology",
    "content": "This chapter introduces the fundamental concepts of biology, including cell structure, living organisms, and basic life processes.",
    "language": "English"
  },
  {
    "title": "Chapter 2: Cell Biology",
    "content": "Detailed study of cell structure and function, including organelles, cell membrane, and cellular processes.",
    "language": "English"
  }
]
<END_JSON>

⚠️ FINAL CHECKLIST:
1. ✓ Scanned the ENTIRE document (not just first page)?
2. ✓ If TOC found, verified it against actual content?
3. ✓ Detected correct language (English/Sinhala/Tamil)?
4. ✓ Used proper Unicode characters?
5. ✓ Created packs for ALL actual chapters found?
6. ✓ Titles are meaningful and from the document?
7. ✓ Content summaries based on ACTUAL content (not just TOC)?
8. ✓ Content summaries are in the detected language?
9. ✓ Did NOT create a pack for every page?

⚠️ REMEMBER: 
- Verify TOC against actual document
- Analyze ENTIRE document structure
- Create packs for ALL chapters
- Use actual content for summaries
- Clean Unicode only
- Correct language detection!`;

      let result;
      try {
        result = await withRetry(() => model.generateContent({
          contents: [{ role: 'user', parts: [{ text: prompt }, imagePart] }]
        }), { maxAttempts: 4, baseDelay: 1500 });
      } catch (e) {
        await logGeminiApiError(e, {
          apiEndpoint: 'generateContent',
          prompt: prompt.substring(0, 500),
          fileType: mimeType,
          endpoint: 'generateLearningPacksFromBase64'
        });
        return await localFallbackPacks();
      }

      let raw = result.response.text();
      const block = raw.match(/<BEGIN_JSON>[\s\S]*?<END_JSON>/);
      if (block) raw = block[0].replace(/<BEGIN_JSON>|<END_JSON>/g, '').trim();
      raw = sanitizeJsonArrayString(raw);
      let packs;
      try {
        packs = JSON.parse(raw);
      } catch (e1) {
        const repairPrompt = `Fix to a valid JSON array only. No extra text.\n\n<INPUT>\n${raw}\n</INPUT>`;
        try {
          const repair = await withRetry(() => model.generateContent({ contents: [{ role: 'user', parts: [{ text: repairPrompt }] }] }), { maxAttempts: 3, baseDelay: 800 });
          const repairedText = repair.response.text();
          const repaired = sanitizeJsonArrayString(repairedText);
          packs = JSON.parse(repaired);
        } catch (e2) {
          return await localFallbackPacks();
        }
      }
      // Validate and filter packs
      const validPacks = packs
        .filter((p, idx) => {
          const title = String(p.title || '');
          const content = String(p.content || '');
          const language = p.language || 'English';

          // Check if title has meaningful content (not just garbage)
          const hasEnglish = /[a-zA-Z]{3,}/.test(title);
          const hasSinhala = /[\u0D80-\u0DFF]{3,}/.test(title);
          const hasTamil = /[\u0B80-\u0BFF]{3,}/.test(title);
          const hasValidTitle = title.length > 3 && (hasEnglish || hasSinhala || hasTamil);

          // Specific garbage patterns for Sinhala/Tamil corruption
          const hasGarbagePatterns = /fkd[ñ,a]|fnod|yeÿ|iyd|ksoi|mqkl|wdh|kfh|bEö|fjk|;d;a|o¾Y|,>q\.|>k jia|mDIaG|mßud|oaúm|ùÔh|iudka;r|f¾Ld|m%;s|fldgia/.test(title);

          // For Tamil/Sinhala, be more lenient with garbage ratio due to combining characters
          // For English, use stricter threshold
          const garbageThreshold = (hasTamil || hasSinhala) ? 0.5 : 0.3;

          // Reject if title is mostly garbage characters
          const garbageRatio = (title.match(/[^\p{L}\p{N}\s.,!?\-:;()'"]/gu) || []).length / title.length;
          const isGarbage = garbageRatio > garbageThreshold || hasGarbagePatterns;

          // Debug logging
          if (!hasValidTitle || isGarbage) {
            console.log(`[Backend Gemini] Debug pack ${idx + 1}:`, {
              title: title.substring(0, 50),
              language,
              hasEnglish,
              hasSinhala,
              hasTamil,
              hasValidTitle,
              garbageRatio: garbageRatio.toFixed(3),
              hasGarbagePatterns,
              isGarbage
            });
          }

          // Language-specific validation
          if (language === 'Sinhala' && !hasSinhala) {
            console.warn(`[Backend Gemini] Pack ${idx + 1} claims Sinhala but has no Sinhala characters: "${title.substring(0, 50)}"`);
            return false;
          }
          if (language === 'Tamil' && !hasTamil) {
            console.warn(`[Backend Gemini] Pack ${idx + 1} claims Tamil but has no Tamil characters: "${title.substring(0, 50)}"`);
            return false;
          }

          if (!hasValidTitle || isGarbage) {
            console.warn(`[Backend Gemini] Filtering out invalid pack ${idx + 1}: "${title.substring(0, 50)}"`);
            return false;
          }

          return true;
        })
        // No slice limit - create packs for ALL valid chapters found
        .map((p, idx) => {
          const title = String(p.title || `Chapter ${idx + 1}`);
          const content = String(p.content || '');
          // Detect language from title and content if not provided
          const detectedLanguage = p.language || detectLanguageFromText(title + ' ' + content);

          return {
            title: title,
            content: content,
            order: idx + 1,
            language: detectedLanguage
          };
        });

      console.log(`[Backend Gemini] Validated ${validPacks.length} packs from ${packs.length} generated`);
      return validPacks;
    }

    // Text-first path for DOCX/TXT
    if (isDoc) throw new Error('DOC format is not supported. Please convert to PDF or DOCX.');

    if (isDocx) {
      const { default: mammoth } = await import('mammoth');
      const buffer = Buffer.from(base64Data, 'base64');
      const { value } = await mammoth.extractRawText({ buffer });
      textForChapters = value || '';
    } else if (isTxt) {
      textForChapters = Buffer.from(base64Data, 'base64').toString('utf-8');
    } else {
      throw new Error(`Unsupported MIME type: ${mimeType}`);
    }

    if (!textForChapters?.trim()) throw new Error('No text could be extracted for chapter analysis');

    prompt = `You are an expert educational content creator for the Sri Lankan local syllabus (Grades 6-11) with advanced multilingual capabilities in English, Sinhala, and Tamil.

⚠️ ABSOLUTE RULES - VIOLATION WILL RESULT IN REJECTION:
1. Generate MAXIMUM 10 learning packs - NEVER exceed this limit
2. Each pack must have a REAL, meaningful title from the document
3. Use ONLY clean Unicode - NO garbage characters, NO corrupted text
4. ALL content must be in the DETECTED language (English/Sinhala/Tamil)

---

### STEP 1: Language Detection
Analyze the text and identify the PRIMARY language:
- **English**: If you see Latin alphabet (A-Z, a-z)
- **Sinhala**: If you see Sinhala script (ක, ග, ච, ජ, ට, ඩ, ණ, ත, ද, න, ප, බ, ම, ය, ර, ල, ව, ශ, ෂ, ස, හ, ළ, etc.)
- **Tamil**: If you see Tamil script (க, ங, ச, ஞ, ட, ண, த, ந, ப, ம, ய, ர, ல, வ, ழ, ள, ற, ன, etc.)

Return ONLY: "English", "Sinhala", or "Tamil"

### STEP 2: Extract REAL Chapters
Look for ACTUAL chapter markers in the text:
- English: "Chapter 1", "Unit 1", "Lesson 1", "Section 1.1"
- Sinhala: "පරිච්ඡේදය 1", "පාඩම 1", "ඒකකය 1"
- Tamil: "அத்தியாயம் 1", "பாடம் 1", "அலகு 1"

**CRITICAL**: If you find 5 real chapters, create 5 packs. If you find 8, create 8. MAXIMUM 10 packs total.

### STEP 3: Create Learning Packs
For EACH identified chapter:
- **title**: Extract the EXACT chapter title from the text (in detected language)
- **content**: Write a 150-300 word summary of that chapter's key concepts (in detected language)
- **language**: The detected language

### IF NO CLEAR CHAPTERS EXIST:
Create 3-5 topic-based packs covering the main themes of the document.

### VALIDATION RULES:
✓ Each title must be meaningful and readable
✓ NO random characters like "fkdñ,a fnod yeÿ iyd h'"
✓ NO corrupted text or encoding errors
✓ Use proper Unicode for Sinhala (0D80-0DFF) and Tamil (0B80-0BFF)
✓ Maximum 10 packs - reject if more

### OUTPUT FORMAT:
<BEGIN_JSON>
[
  {
    "title": "පළමු පරිච්ඡේදය: සංඛ්‍යා පද්ධති",
    "content": "මෙම පරිච්ඡේදයෙන් සංඛ්‍යා පද්ධති පිළිබඳ මූලික සංකල්ප විස්තර කෙරේ...",
    "language": "Sinhala"
  }
]
<END_JSON>

⚠️ REMEMBER: Maximum 10 packs, clean Unicode only, real chapter titles!

SOURCE TEXT (may be truncated):\n${textForChapters.substring(0, 120000)}`;

    let result2;
    try {
      result2 = await withRetry(() => model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }]
      }), { maxAttempts: 4, baseDelay: 1500 });
    } catch (e) {
      return await localFallbackPacks();
    }

    let raw2 = result2.response.text();
    const block2 = raw2.match(/<BEGIN_JSON>[\s\S]*?<END_JSON>/);
    if (block2) raw2 = block2[0].replace(/<BEGIN_JSON>|<END_JSON>/g, '').trim();
    raw2 = sanitizeJsonArrayString(raw2);
    let packs2;
    try {
      packs2 = JSON.parse(raw2);
    } catch (e1) {
      const repairPrompt2 = `Fix to a valid JSON array only. No extra text.\n\n<INPUT>\n${raw2}\n</INPUT>`;
      try {
        const repair2 = await withRetry(() => model.generateContent({ contents: [{ role: 'user', parts: [{ text: repairPrompt2 }] }] }), { maxAttempts: 3, baseDelay: 800 });
        const repairedText2 = repair2.response.text();
        const repaired2 = sanitizeJsonArrayString(repairedText2);
        packs2 = JSON.parse(repaired2);
      } catch (e2) {
        return await localFallbackPacks();
      }
    }
    // Validate and filter packs
    const validPacks2 = packs2
      .filter((p, idx) => {
        const title = String(p.title || '');
        const content = String(p.content || '');
        const language = p.language || 'English';

        // Check if title has meaningful content (not just garbage)
        const hasEnglish = /[a-zA-Z]{3,}/.test(title);
        const hasSinhala = /[\u0D80-\u0DFF]{3,}/.test(title);
        const hasTamil = /[\u0B80-\u0BFF]{3,}/.test(title);
        const hasValidTitle = title.length > 3 && (hasEnglish || hasSinhala || hasTamil);

        // Specific garbage patterns for Sinhala/Tamil corruption
        const hasGarbagePatterns = /fkd[ñ,a]|fnod|yeÿ|iyd|ksoi|mqkl|wdh|kfh|bEö|fjk|;d;a|o¾Y|,>q\.|>k jia|mDIaG|mßud|oaúm|ùÔh|iudka;r|f¾Ld|m%;s|fldgia/.test(title);

        // For Tamil/Sinhala, be more lenient with garbage ratio due to combining characters
        // For English, use stricter threshold
        const garbageThreshold = (hasTamil || hasSinhala) ? 0.5 : 0.3;

        // Reject if title is mostly garbage characters
        const garbageRatio = (title.match(/[^\p{L}\p{N}\s.,!?\-:;()'"]/gu) || []).length / title.length;
        const isGarbage = garbageRatio > garbageThreshold || hasGarbagePatterns;

        // Debug logging
        if (!hasValidTitle || isGarbage) {
          console.log(`[Backend Gemini] Debug pack ${idx + 1}:`, {
            title: title.substring(0, 50),
            language,
            hasEnglish,
            hasSinhala,
            hasTamil,
            hasValidTitle,
            garbageRatio: garbageRatio.toFixed(3),
            hasGarbagePatterns,
            isGarbage
          });
        }

        // Language-specific validation
        if (language === 'Sinhala' && !hasSinhala) {
          console.warn(`[Backend Gemini] Pack ${idx + 1} claims Sinhala but has no Sinhala characters: "${title.substring(0, 50)}"`);
          return false;
        }
        if (language === 'Tamil' && !hasTamil) {
          console.warn(`[Backend Gemini] Pack ${idx + 1} claims Tamil but has no Tamil characters: "${title.substring(0, 50)}"`);
          return false;
        }

        if (!hasValidTitle || isGarbage) {
          console.warn(`[Backend Gemini] Filtering out invalid pack ${idx + 1}: "${title.substring(0, 50)}"`);
          return false;
        }

        return true;
      })
      .slice(0, 10) // Enforce maximum 10 packs
      .map((p, idx) => {
        const title = String(p.title || `Chapter ${idx + 1}`);
        const content = String(p.content || '');
        // Detect language from title and content if not provided
        const detectedLanguage = p.language || detectLanguageFromText(title + ' ' + content);

        return {
          title: title,
          content: content,
          order: idx + 1,
          language: detectedLanguage
        };
      });

    console.log(`[Backend Gemini] Validated ${validPacks2.length} packs from ${packs2.length} generated`);
    return validPacks2;
  } catch (error) {
    await logGeminiApiError(error, {
      apiEndpoint: 'generateLearningPacksFromBase64',
      fileType: mimeType,
      endpoint: 'generateLearningPacksFromBase64'
    });
    console.error('[Backend Gemini] generateLearningPacksFromBase64 error:', error);
    throw new Error(`Failed to generate learning packs: ${error.message}`);
  }
};

// Sri Lankan education system - 8 Compulsory Subjects (Grades 6-11)
const COMPULSORY_SUBJECTS = [
  'Mathematics',
  'Science',
  'Social Studies', // includes History, Geography, Civics
  'Language & Literature (Sinhala)', // First Language
  'Language & Literature (Tamil)', // First Language
  'English Language',
  'Information & Communication Technology (ICT)',
  'Religion' // Buddhism / Islam / Hinduism / Christianity
];

const AESTHETIC_SUBJECTS = [
  'Health & Physical Education',
  'Aesthetic Education', // includes Art & Music
  'Health Science',
  'Physical Education',
  'Art',
  'Music'
];

const GRADE_RANGE = {
  min: 6,
  max: 11
};

/**
 * Generate 5-8 bullet summary from text content
 */
export const generateSummaryFromText = async (text, language = 'English') => {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const prompt = `SYSTEM:\nYou are EduQuestLab. Summarize ONLY in ${language}. For Sinhala/Tamil, use clean Unicode.\n\n🚨 CRITICAL: DO NOT mention figure numbers, page numbers, chapter numbers, or textbook names in the summary. Focus ONLY on the actual concepts and knowledge.\n\nTASK:\nProduce 5-8 concise bullet points strictly grounded in the provided content. No preface or trailing text.\nCONTENT:\n${text}\nOUTPUT: JSON object {"bullets": string[]} with 5-8 items.`;
    const result = await model.generateContent(prompt);
    const textOut = result.response.text();
    const match = textOut.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('Invalid summary response');
    const parsed = JSON.parse(match[0]);
    const bullets = Array.isArray(parsed.bullets) ? parsed.bullets.slice(0, 8) : [];
    return bullets;
  } catch (err) {
    console.error('[Backend Gemini] Summary (text) error:', err);
    return [];
  }
};

/**
 * Generate a Learning Pack directly from a base64 file using Gemini Vision API
 * Returns structured markdown/plain text according to the provided prompt
 * @param {string} base64Data - Base64 encoded file data
 * @param {string} mimeType - MIME type of the file (e.g., application/pdf, image/png)
 * @param {string} userPrompt - The user-provided instruction prompt
 * @returns {Promise<string>} - Generated learning pack text
 */
export const generateLearningPackFromBase64 = async (base64Data, mimeType, userPrompt) => {
  try {
    const prompt = userPrompt || 'You are an expert educational content creator. Generate a concise learning pack.';

    // Route by MIME type: PDFs/images via Vision (inlineData). Others (e.g., DOCX) -> extract text and send as text-only.
    const isPdf = mimeType === 'application/pdf';
    const isImage = /^image\//.test(mimeType);
    const isDocx = mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    const isDoc = mimeType === 'application/msword';
    const isTxt = mimeType === 'text/plain';

    let contents;

    if (isPdf || isImage) {
      // Use Vision with inlineData
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
      const imagePart = { inlineData: { data: base64Data, mimeType } };
      contents = [{ role: 'user', parts: [{ text: prompt }, imagePart] }];

      const result = await withRetry(() => model.generateContent({ contents }), { maxAttempts: 4, baseDelay: 1500 });
      const response = await result.response;
      const text = response.text();
      return String(text || '').replace(/\u0000/g, '').trim();
    }

    // For DOCX/DOC/TXT, convert to plain text then send as text-only prompt
    let extractedText = '';
    try {
      if (isDocx) {
        // Use mammoth to extract DOCX text (dynamic import to keep optional)
        const { default: mammoth } = await import('mammoth');
        const buffer = Buffer.from(base64Data, 'base64');
        const { value } = await mammoth.extractRawText({ buffer });
        extractedText = value || '';
      } else if (isDoc) {
        throw new Error('DOC format is not supported. Please convert to PDF or DOCX.');
      } else if (isTxt) {
        extractedText = Buffer.from(base64Data, 'base64').toString('utf-8');
      } else {
        throw new Error(`Unsupported MIME type: ${mimeType}`);
      }
    } catch (e) {
      console.error('[Backend Gemini] Text extraction for non-vision file failed:', e);
      throw e;
    }

    if (!extractedText || !extractedText.trim()) {
      throw new Error('No text could be extracted from the file');
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const textPrompt = `${prompt}\n\nSOURCE TEXT (clean Unicode):\n${extractedText.substring(0, 120000)}`; // safety cap
    const result = await withRetry(() => model.generateContent(textPrompt), { maxAttempts: 4, baseDelay: 1500 });
    const text = result.response.text();
    return String(text || '').replace(/\u0000/g, '').trim();
  } catch (error) {
    console.error('[Backend Gemini] Learning Pack generation error:', error);
    throw new Error(`Failed to generate learning pack: ${error.message}`);
  }
};

/**
 * Generate 5-8 bullet summary from image/PDF using Vision
 */
export const generateSummaryFromVision = async (base64Data, mimeType, language = 'English') => {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const prompt = `SYSTEM:\nYou are EduQuestLab. Summarize ONLY in ${language}. For Sinhala/Tamil, use clean Unicode.\n\n🚨 CRITICAL: DO NOT mention figure numbers, page numbers, chapter numbers, or textbook names in the summary. Focus ONLY on the actual concepts and knowledge.\n\nTASK:\nProduce 5-8 concise bullet points strictly grounded in this document/image. No preface or trailing text.\nOUTPUT: JSON object {"bullets": string[]} with 5-8 items.`;
    const imagePart = { inlineData: { data: base64Data, mimeType } };
    const result = await withRetry(() => model.generateContent([prompt, imagePart]));
    const textOut = result.response.text();
    const match = textOut.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('Invalid summary response');
    const parsed = JSON.parse(match[0]);
    const bullets = Array.isArray(parsed.bullets) ? parsed.bullets.slice(0, 8) : [];
    return bullets;
  } catch (err) {
    console.error('[Backend Gemini] Summary (vision) error:', err);
    return [];
  }
};

/**
 * Download a file and produce a 5-8 bullet summary in the specified language
 */
export const generateSummaryFromFile = async (fileUrl, fileType, language = 'English') => {
  try {
    const buffer = await downloadAny(fileUrl);
    const mimeType = getMimeType(fileType, fileUrl);
    if (fileType === 'image' || fileType === 'pdf') {
      const base64Data = buffer.toString('base64');
      return await generateSummaryFromVision(base64Data, mimeType, language);
    } else {
      const text = buffer.toString('utf-8');
      return await generateSummaryFromText(text, language);
    }
  } catch (err) {
    console.error('[Backend Gemini] Summary (file) error:', err);
    return [];
  }
};

/**
 * Generate structured study material (summary + sections + subtopics) from an uploaded file
 * @param {string} fileUrl
 * @param {string} fileType - 'image' | 'pdf' | 'document'
 * @returns {Promise<Object>} - Structured material JSON
 */
export const generateStructuredMaterialFromFile = async (fileUrl, fileType) => {
  try {

    // Parse path and download file (reuse logic)
    const buffer = await downloadAny(fileUrl);
    const base64Data = buffer.toString('base64');
    const mimeType = getMimeType(fileType, fileUrl);

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const schema = {
      type: 'OBJECT',
      properties: {
        summary: { type: 'STRING' },
        key_points: { type: 'ARRAY', items: { type: 'STRING' } },
        sections: {
          type: 'ARRAY',
          items: {
            type: 'OBJECT',
            properties: {
              title: { type: 'STRING' },
              summary: { type: 'STRING' },
              subtopics: {
                type: 'ARRAY',
                items: {
                  type: 'OBJECT',
                  properties: {
                    title: { type: 'STRING' },
                    points: { type: 'ARRAY', items: { type: 'STRING' } },
                  },
                  required: ['title']
                }
              }
            },
            required: ['title']
          }
        },
        glossary: {
          type: 'ARRAY',
          items: {
            type: 'OBJECT',
            properties: {
              term: { type: 'STRING' },
              definition: { type: 'STRING' }
            },
            required: ['term', 'definition']
          }
        },
        diagrams: {
          type: 'ARRAY',
          items: {
            type: 'OBJECT',
            properties: {
              caption: { type: 'STRING' },
              present: { type: 'BOOLEAN' }
            },
            required: ['caption']
          }
        },
        study_time_estimate_min: { type: 'NUMBER' }
      },
      required: ['summary', 'sections']
    };

    const prompt = `Create structured study material from this document.

Return JSON that includes:
- summary: 3-6 sentence overview in clean Unicode
- key_points: bullet points of critical ideas
- sections: array of sections with title, 1-3 sentence summary, and subtopics
  - subtopics: each has title and list of concise bullet points
- glossary: key terms with simple definitions (if applicable)
- diagrams: list captions if diagrams are present, else empty array
- study_time_estimate_min: approximate minutes to study the material (integer)

Keep it concise, accurate, and aligned to Sri Lankan Grades 6-11 context when possible.`;

    const imagePart = { inlineData: { data: base64Data, mimeType } };

    const result = await withRetry(() => model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }, imagePart] }],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: schema
      }
    }));

    const response = await result.response;
    const text = response.text();

    let material;
    try {
      material = JSON.parse(text);
    } catch (e) {
      const jsonMatch = text.match(/```json\n?([\s\S]*?)\n?```/) || text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        material = JSON.parse(jsonMatch[1] || jsonMatch[0]);
      } else {
        throw new Error('Failed to parse structured material JSON');
      }
    }

    // Minimal normalization
    material.key_points = Array.isArray(material.key_points) ? material.key_points : [];
    material.sections = Array.isArray(material.sections) ? material.sections : [];
    material.glossary = Array.isArray(material.glossary) ? material.glossary : [];
    material.diagrams = Array.isArray(material.diagrams) ? material.diagrams : [];

    return material;
  } catch (error) {
    console.error('[Backend Gemini] Structured material generation error:', error);
    return {
      summary: 'Unable to generate structured material',
      key_points: [],
      sections: [],
      glossary: [],
      diagrams: [],
      study_time_estimate_min: 0,
      error: error.message
    };
  }
};

/**
 * Extract content metadata from file using Gemini Vision API
 * Extracts: language, grade, subject, chapters, clean text
 * @param {string} base64Data - Base64 encoded file data
 * @param {string} mimeType - MIME type of file
 * @returns {Promise<Object>} - Extracted metadata
 */
export const extractContentMetadata = async (base64Data, mimeType) => {
  try {

    // Define the JSON schema for the response (REQUIRED FOR STRUCTURED OUTPUT)
    const metadataSchema = {
      type: "OBJECT",
      properties: {
        language: { type: "STRING", enum: ["English", "Sinhala", "Tamil", "Mixed", "Unknown"] },
        grade: { type: "STRING", enum: ["6", "7", "8", "9", "10", "11", "Unknown"] },
        subject: { type: "STRING", enum: [...COMPULSORY_SUBJECTS, ...AESTHETIC_SUBJECTS, "Unknown"] },
        chapters: {
          type: "ARRAY",
          items: {
            type: "OBJECT",
            properties: {
              title: { type: "STRING" },
              content: { type: "STRING" },
              pageNumbers: { type: "ARRAY", items: { type: "NUMBER" } }
            },
            required: ["title", "content"]
          }
        },
        summary: { type: "STRING" },
        hasDiagrams: { type: "BOOLEAN" },
        topics: { type: "ARRAY", items: { type: "STRING" } }
      },
      required: ["language", "grade", "subject", "chapters", "summary", "hasDiagrams", "topics"]
    };

    // 1. Initialize model
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const prompt = `
Analyze this educational document and extract the following metadata in JSON format.

Context: This is from the Sri Lankan Local Syllabus (Grades 6-11) with these 8 COMPULSORY subjects:
1. Mathematics
2. Science
3. Social Studies (includes History, Geography, Civics)
4. Language & Literature (Sinhala or Tamil - First Language)
5. English Language
6. Information & Communication Technology (ICT)
7. Religion (Buddhism / Islam / Hinduism / Christianity)
8. Health & Physical Education / Aesthetic Education (includes Health Science, Physical Education, Art & Music)

Extract:
1. **language**: Detect the primary language (English, Sinhala, Tamil, or Mixed)
2. **grade**: Identify the grade level (6-11 ONLY, or "Unknown" if not in this range)
3. **subject**: Identify the subject from the compulsory/aesthetic subjects above (match exactly, or "Unknown")
4. **chapters**: Array of chapter/section objects with:
    - title: Chapter/section title
    - content: Clean Unicode text content
    - pageNumbers: Array of page numbers (if visible)
5. **summary**: Brief 2-3 sentence summary of the document
6. **hasDiagrams**: Boolean - does it contain diagrams/images?
7. **topics**: Array of main topics covered

IMPORTANT: 
- Grade must be between 6-11 (Sri Lankan local syllabus)
- Subject must match one of the listed subjects.
- For Social Studies, include History/Geography/Civics content
- For Language & Literature, specify if Sinhala or Tamil

Return ONLY valid JSON in the format strictly defined by the schema.
`;

    const imagePart = {
      inlineData: {
        data: base64Data,
        mimeType: mimeType
      }
    };

    // 2. CORRECTED API CALL STRUCTURE with better error handling
    const result = await withRetry(
      async () => {
        try {
          const generationConfig = {
            temperature: 0.7,
            topP: 0.95,
            topK: 40,
            maxOutputTokens: 8192,
          };

          const response = await model.generateContent({
            contents: [{
              role: "user",
              parts: [
                { text: prompt },
                imagePart
              ]
            }],
            generationConfig: generationConfig,
          });

          return response;
        } catch (error) {
          await logGeminiApiError(error, {
            apiEndpoint: 'generateContent',
            fileType: mimeType,
            endpoint: 'extractContentMetadata',
            retryAttempt: context.retryCount // if available
          });
          console.error('[Backend Gemini] API call failed:', {
            message: error.message,
            status: error.status,
            code: error.code,
            stack: error.stack?.split('\n').slice(0, 3).join('\n')
          });
          throw error; // Re-throw for retry logic
        }
      },
      { maxAttempts: 5, baseDelay: 2000 }
    );

    const response = await result.response;
    const text = response.text();

    // Parse JSON response with better error handling
    let metadata;
    try {
      // First try direct JSON parse
      metadata = JSON.parse(text);
    } catch (parseError) {
      console.warn('[Backend Gemini] Initial JSON parse failed, trying to extract from markdown');

      // Try to extract JSON from markdown code blocks
      const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/) ||
        text.match(/\{[\s\S]*\}/);

      if (jsonMatch) {
        try {
          const jsonStr = (jsonMatch[1] || jsonMatch[0]).trim();
          metadata = JSON.parse(jsonStr);
        } catch (e) {
          console.error('[Backend Gemini] Failed to parse extracted JSON:', e);
          throw new Error(`Failed to parse JSON from response: ${e.message}`);
        }
      } else {
        console.error('[Backend Gemini] No valid JSON found in response');
        throw new Error('No valid JSON found in API response');
      }
    }

    // Ensure the response has the necessary fields (fallback if schema wasn't fully respected)
    if (!metadata.chapters) {
      metadata.chapters = [];
    }
    if (!metadata.topics) {
      metadata.topics = [];
    }


    console.log('[Backend Gemini] Extracted metadata:', {
      language: metadata.language,
      grade: metadata.grade,
      subject: metadata.subject,
      chaptersCount: metadata.chapters?.length || 0,
      hasDiagrams: metadata.hasDiagrams
    });

    return metadata;

  } catch (error) {
    await logGeminiApiError(error, {
      apiEndpoint: 'extractContentMetadata',
      fileType: mimeType,
      endpoint: 'extractContentMetadata'
    });
    console.error('[Backend Gemini] Metadata extraction error:', {
      message: error.message,
      status: error.status,
      code: error.code,
      stack: error.stack?.split('\n').slice(0, 3).join('\n')
    });

    // Return default metadata with error details
    return {
      language: 'English', // Default to English instead of Unknown
      grade: '10', // Default to grade 10
      subject: 'General', // Default subject
      chapters: [{
        title: 'Document Content',
        content: 'Content extraction failed. Please try again or check the document format.',
        pageNumbers: [1]
      }],
      summary: 'Unable to extract content. The document may be in an unsupported format or the service is temporarily unavailable.',
      hasDiagrams: false,
      topics: ['General Knowledge'],
      hasDiagrams: false,
      topics: [],
      error: error.message
    };
  }
};

/**
 * Generate questions from text content using Gemini AI
 * @param {string} content - Text content to generate questions from
 * @param {Object} options - Generation options
 * @param {number} options.count - Number of questions to generate
 * @param {string} options.difficulty - Difficulty level (Easy, Intermediate, Hard)
 * @param {Array<string>} options.types - Question types to generate
 * @returns {Promise<Array>} - Generated questions
 */
export const generateQuestions = async (content, options = {}) => {
  try {
    const {
      count = 5,
      difficulty = 'Intermediate',
      types = ['MCQ', 'FIIB', 'TF', 'HOQ'],
      language = 'English',
      bloom_level = 'Understand'
    } = options;

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const prompt = `
SYSTEM:
You are EduQuestLab, a multilingual pedagogy-aware generator. Always obey requested language; align to Bloom's level; ground strictly in provided context.

TASK:
Generate EXACTLY ${count} questions strictly from the provided content.

Content (use only this):
${content}

Constraints:
- All text must be in ${language}. For Sinhala or Tamil, output clean Unicode.
- Difficulty: ${difficulty}
- Bloom level: ${bloom_level}
- Allowed types: MCQ, FIIB, TF, HOQ (ignore any other types)
- Generate EXACTLY ${count} questions - no more, no less

Question Format Requirements:
1. MCQ (Multiple Choice):
   - question_type: "MCQ"
   - question_text: Clear, unambiguous question testing key concepts
   - correct_answer: Precise and correct
   - options: 4 plausible options with ONE clearly correct answer
   - explanation: Brief reasoning

2. FIIB (Fill In The Blank):
   - question_type: "FIIB" 
   - question_text: Sentence with ___ for blank testing important terms
   - correct_answer: Key term or concept
   - options: 4-6 related terms including correct answer
   - explanation: Why this term fits

3.  TF (True/False):
   - question_type: "TF"
   - question_text: Clear factual statement
   - correct_answer: "True" or "False"
   - explanation: Evidence for why true/false 

4. HOQ (Higher Order Question - Short Answer):
   - question_type: "HOQ"
   - question_text: Analytical/evaluative question requiring critical thinking
   - correct_answer: CONCISE answer (1-2 sentences, 15-25 words MAX)
   - explanation: Key points and reasoning 
   - ⚠️ HOQ answers MUST be SHORT - no essays!

Output: JSON array only. Each item object must include:
- type (MCQ|FIIB|TF|HOQ)
- difficulty
- question
- answer
- options (array for MCQ and FIIB only)

Example for FIIB:
{
  "type": "FIIB",
  "difficulty": "Intermediate",
  "question": "The process of converting light energy into chemical energy is called ___",
  "answer": "photosynthesis",
  "options": ["photosynthesis", "respiration", "digestion", "transpiration", "fermentation"]
}
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Parse JSON response
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      await logGeminiParsingError(
        new Error('Invalid response format from Gemini'),
        {
          apiEndpoint: 'generateContent',
          prompt: prompt.substring(0, 500),
          responseText: text.substring(0, 1000),
          language: options.language,
          questionTypes: options.types,
          questionCount: options.count
        }
      );
      throw new Error('Invalid response format from Gemini');
    }

    const questions = JSON.parse(jsonMatch[0]);

    // Validate and fix FIIB questions to ensure they have options
    const validatedQuestions = questions.map(q => {
      if (q.type === 'FIIB') {
        if (!Array.isArray(q.options) || q.options.length === 0) {
          console.warn('[Backend] FIIB question missing options, generating defaults:', q.question);
          // Generate default options if missing
          const answer = q.answer || 'answer';
          q.options = [
            answer,
            'option1',
            'option2',
            'option3',
            'option4'
          ];
        }
      }
      return q;
    });

    return validatedQuestions;

  } catch (error) {
    await logGeminiApiError(error, {
      apiEndpoint: 'generateContent',
      prompt: prompt?.substring(0, 500),
      language: options.language,
      questionTypes: options.types,
      questionCount: options.count,
      endpoint: 'generateQuestions'
    });
    console.error('[Backend] Gemini generation error:', error);
    // No mock fallback: return empty set so UI shows real state
    return [];
  }
};

/**
 * Generate mock questions (fallback)
 * @param {number} count - Number of questions
 * @param {string} reason - Reason for using mock data
 * @returns {Array} - Mock questions
 */
const generateMockQuestions = (count, reason = 'API unavailable') => {
  const mockQuestions = [
    {
      type: 'MCQ',
      difficulty: 'Easy',
      question: 'What is the primary function of mitochondria?',
      answer: 'Energy production',
      options: ['Energy production', 'Protein synthesis', 'DNA replication', 'Cell division']
    },
    {
      type: 'FIIB',
      difficulty: 'Intermediate',
      question: 'The powerhouse of the cell is called ___',
      answer: 'mitochondria'
    },
    {
      type: 'TF',
      difficulty: 'Easy',
      question: 'Cells are the basic unit of life',
      answer: 'True'
    },
    {
      type: 'HOQ',
      difficulty: 'Hard',
      question: 'Explain the process of cellular respiration',
      answer: 'Cellular respiration is a metabolic process that converts glucose into ATP...'
    },
    {
      type: 'Summary',
      difficulty: 'Intermediate',
      question: 'Summarize the main points about cell structure',
      answer: 'Cells contain nucleus, cytoplasm, and organelles...'
    }
  ];

  return mockQuestions.slice(0, count);
};

/**
 * Generate questions from uploaded file using Gemini Vision API
 * @param {string} fileUrl - Public URL of uploaded file
 * @param {string} fileType - File type (image, pdf, document)
 * @param {Object} options - Generation options
 * @returns {Promise<Array>} - Generated questions
 */
export const generateQuestionsFromFile = async (fileUrl, fileType, options = {}) => {
  try {
    const {
      count = 5,
      difficulty = 'Intermediate',
      types = ['MCQ', 'FIIB', 'TF', 'HOQ'],
      language = 'English',
      grade = 'Unknown',
      subject = 'Unknown',
      bloom_level = 'Understand'
    } = options;

    // Extract file path from URL
    // URL format: https://.../storage/v1/object/public/content-uploads/uploads/file.pdf
    const buffer = await downloadAny(fileUrl);
    const base64Data = buffer.toString('base64');

    // Determine MIME type
    const mimeType = getMimeType(fileType, fileUrl);

    // Step 1: Extract content metadata (language, grade, subject, chapters)
    let metadata = null;
    if (fileType === 'image' || fileType === 'pdf') {
      try {
        metadata = await extractContentMetadata(base64Data, mimeType);
      } catch (metadataError) {
        await logGeminiApiError(metadataError, {
          apiEndpoint: 'extractContentMetadata',
          fileType: mimeType,
          endpoint: 'generateQuestionsFromFile'
        });
      }
    }

    // Step 2: Generate questions
    let questions = [];

    // Use the provided counts if available, otherwise distribute evenly
    const typeCounts = {};
    if (options.counts) {
      // Use the exact counts provided in the options
      Object.entries(options.counts).forEach(([type, cnt]) => {
        if (cnt > 0 && types.includes(type)) {
          typeCounts[type] = cnt;
        }
      });
    } else if (types && types.length > 0) {
      // Fallback to even distribution if no counts provided
      const baseCount = Math.floor(count / types.length);
      const remainder = count % types.length;

      types.forEach((type, index) => {
        typeCounts[type] = index < remainder ? baseCount + 1 : baseCount;
      });
    } else {
      // Fallback to all MCQs if no types specified
      typeCounts['MCQ'] = count;
    }

    // If no valid types with count > 0, return empty array
    if (Object.keys(typeCounts).length === 0) {
      return [];
    }

    // Generate questions for each type
    const allQuestions = [];

    for (const [type, typeCount] of Object.entries(typeCounts)) {
      if (typeCount <= 0) continue;

      try {
        let typeQuestions = [];
        let text = '';

        try {
          text = fileType === 'pdf' || fileType === 'image'
            ? await extractTextFromFile(base64Data, mimeType)
            : buffer.toString('utf-8');

          typeQuestions = await generateQuestions(text, {
            count: typeCount * 2, // Generate extra to ensure we get enough
            difficulty,
            types: [type], // Generate only this type
            language,
            bloom_level
          });
        } catch (extractError) {
          console.error(`[Backend Gemini] Error extracting text for ${type}:`, extractError);
          // Skip this type if extraction fails - no mock questions
          typeQuestions = [];
        }

        // Take only the requested number of this type
        const selectedQuestions = typeQuestions
          .filter(q => (q.type || q.question_type) === type)
          .slice(0, typeCount);

        allQuestions.push(...selectedQuestions);

      } catch (error) {
        console.error(`[Backend Gemini] Error generating ${type} questions:`, error);
        // Continue with other types
      }
    }

    // If we didn't get enough questions, try one more time with all types
    if (allQuestions.length < count) {
      const remaining = count - allQuestions.length;

      try {
        let additionalQuestions = [];

        if (fileType === 'image' || fileType === 'pdf') {
          additionalQuestions = await generateQuestionsFromVision(base64Data, mimeType, {
            count: remaining * 2,
            difficulty,
            types: Object.keys(typeCounts),
            counts: typeCounts, // Pass exact counts per type
            language,
            bloom_level
          });
        } else {
          const text = buffer.toString('utf-8');
          additionalQuestions = await generateQuestions(text, {
            count: remaining * 2,
            difficulty,
            types: Object.keys(typeCounts),
            language,
            bloom_level
          });
        }

        // Add unique questions up to the target count
        const existingIds = new Set(allQuestions.map(q => q.id));
        const newQuestions = additionalQuestions
          .filter(q => !existingIds.has(q.id))
          .slice(0, remaining);

        allQuestions.push(...newQuestions);

      } catch (error) {
        console.error('[Backend Gemini] Error generating additional questions:', error);
      }
    }

    // Ensure we don't exceed the requested count
    const finalQuestions = allQuestions.slice(0, count);
    console.log(`[Backend Gemini] Generated total of ${finalQuestions.length} questions`);

    // Step 3: Attach metadata to questions using provided values
    if (Array.isArray(finalQuestions)) {
      return finalQuestions.map(q => ({
        ...q,
        metadata: {
          language: language,
          grade: grade,
          subject: subject,
          topics: metadata?.topics || []
        }
      }));
    }

    return finalQuestions;

  } catch (error) {
    await logGeminiApiError(error, {
      apiEndpoint: 'generateQuestionsFromFile',
      fileType,
      language: options.language,
      questionTypes: options.types,
      questionCount: options.count,
      endpoint: 'generateQuestionsFromFile'
    });
    console.error('[Backend Gemini] File processing error:', error);
    // No mock fallback: return empty set
    return [];
  }
};

/**
 * Generate questions from image/PDF using Gemini Vision API
 */
export const generateQuestionsFromVision = async (base64Data, mimeType, params = {}) => {
  const {
    count = 5,
    difficulty = 'Intermediate',
    types = ['MCQ', 'FIIB', 'TF', 'HOQ'],
    language = 'English',
    bloom_level = 'Understand',
    counts = {}
  } = params;

  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  // Build type-specific count requirements
  let typeRequirements = '';
  if (Object.keys(counts).length > 0) {
    typeRequirements = '\n\nEXACT QUESTION TYPE COUNTS REQUIRED:\n';
    Object.entries(counts).forEach(([type, cnt]) => {
      if (cnt > 0) {
        typeRequirements += `- Generate EXACTLY ${cnt} ${type} questions\n`;
      }
    });
  } else {
    typeRequirements = `\n\nGenerate EXACTLY ${count} questions using these types: ${types.join(', ')}`;
  }

  const prompt = `SYSTEM:
You are EduQuestLab, a multilingual pedagogy-aware generator. Analyze the provided document/image and generate educational questions.

🚨 CRITICAL UNICODE REQUIREMENT FOR SINHALA/TAMIL:
${language === 'Sinhala' || language === 'Tamil' ? `
⚠️ ABSOLUTE REQUIREMENT: You MUST output PURE Unicode characters. NO EXCEPTIONS.

**FORBIDDEN OUTPUT (GARBAGE - DO NOT PRODUCE):**
❌ "f.da,hlska odr fyda YS¾I"
❌ ";d;aúl ixLHd"
❌ "o¾Yl yd ,>q.Kl"
❌ "fkdñ,a fnod yeÿ"
❌ ">k jia;=j,"
❌ "iudka;r f¾Ld"

**REQUIRED OUTPUT (Proper Unicode):**
${language === 'Sinhala' ? '✅ Sinhala: "පළමු පරිච්ඡේදය", "ගණිතය", "සංඛ්‍යා පද්ධති", "වීජ ගණිතය"' : ''}
${language === 'Tamil' ? '✅ Tamil: "முதல் அத்தியாயம்", "கணிதம்", "எண் முறைகள்", "இயற்கணிதம்"' : ''}

**SELF-VALIDATION BEFORE RESPONDING:**
1. Does my output contain characters from the CORRECT Unicode range?
   - Sinhala: U+0D80 to U+0DFF (ක ග ච ජ ට ඩ ණ ත ද න ප බ ම ය ර ල ව ශ ෂ ස හ ළ)
   - Tamil: U+0B80 to U+0BFF (க ங ச ஞ ட ண த ந ப ம ய ர ல வ ழ ள ற ன)
2. Do the words look like real ${language} words (not Latin gibberish)?
3. Would a native speaker recognize these as proper words?

If ANY answer is NO, you MUST re-read the image and try again.

⚠️ CRITICAL: Questions with garbage characters will be REJECTED. Generate ONLY clean Unicode!
⚠️ If you generate garbage, the user will receive FEWER questions than requested!
⚠️ DOUBLE-CHECK every character before responding!
` : ''}

TASK:
Generate questions strictly from the provided document/image content.
${typeRequirements}

⚠️ IMPORTANT: Generate EXACTLY the requested number of questions. Do NOT generate extra.
⚠️ ALL questions must be clean and valid - garbage questions will be rejected!

🚨 CRITICAL CONTENT RULES:
- DO NOT mention figure numbers, page numbers, or textbook names in questions or summaries
- DO NOT reference "Figure 1.2", "Page 45", "Chapter 3", or book titles
- DO NOT include grade levels in question text
- Focus ONLY on the actual concepts and knowledge
- Write questions as if testing pure understanding, not document navigation
- Example: Instead of "According to Figure 2.1, what is...", write "What is..."
- Example: Instead of "On page 15, the text states...", write "The concept states..."

Constraints:
- All text must be in ${language}. ${language === 'Sinhala' || language === 'Tamil' ? 'Use PURE Unicode only - NO garbage characters!' : ''}
- Difficulty: ${difficulty}
- Bloom level: ${bloom_level}
- Allowed types: MCQ, FIIB, TF, HOQ

Question Format Requirements:
1. MCQ (Multiple Choice):
   - question_type: "MCQ"
   - question_text: The question
   - correct_answer: The correct answer
   - options: Array of 4 options (including the correct answer)
   - explanation: WHY the correct answer is correct (2-3 sentences explaining the reasoning)

2. FIIB (Fill In The Blank):
   - question_type: "FIIB"
   - question_text: Text with ___ for blank (e.g., "The capital of France is ___")
   - correct_answer: The correct word/phrase to fill the blank
   - options: REQUIRED Array of 4-6 possible answers (MUST include correct answer and distractors) for drag-and-drop
   - explanation: WHY this answer fills the blank correctly (2-3 sentences)
   - ⚠️ CRITICAL: FIIB questions MUST have an options array - this is mandatory!

3. TF (True/False):
   - question_type: "TF"
   - question_text: A statement
   - correct_answer: "True" or "False"
   - explanation: WHY the statement is true or false (2-3 sentences with evidence)

4. HOQ (Higher Order Question - Open-ended):
   - question_type: "HOQ"
   - question_text: An analytical, evaluative, or creative question requiring extended response
   - correct_answer: A SHORT, concise model answer (1-2 sentences ONLY) demonstrating key understanding
   - explanation: REQUIRED - Brief guidance on key points to include (2 sentences in ${language})
   - Example HOQ explanation: "A good answer should identify the main causes and provide one specific example. This question assesses critical thinking and analysis skills."

⚠️ CRITICAL: ALL questions MUST include an "explanation" field in ${language}!
⚠️ HOQ questions MUST have detailed explanations that guide students on how to approach the answer!

OUTPUT FORMAT: Return ONLY a valid JSON array. Example for FIIB:
[{
  "question_type": "FIIB",
  "difficulty": "Medium",
  "blooms_taxonomy": "Understand",
  "question_text": "The process of converting light energy into chemical energy is called ___",
  "correct_answer": "photosynthesis",
  "options": ["photosynthesis", "respiration", "digestion", "transpiration", "fermentation"],
  "explanation": "Photosynthesis is the process by which plants convert light energy from the sun into chemical energy stored in glucose. This occurs in the chloroplasts of plant cells using chlorophyll."
}]

IMPORTANT: Respect the exact question type counts requested above!`;

  const imagePart = {
    inlineData: {
      data: base64Data,
      mimeType: mimeType
    }
  };

  try {
    const result = await model.generateContent([prompt, imagePart]);
    const response = await result.response;
    const text = response.text();

    // Parse JSON response with better error handling
    let jsonText = text.trim();

    // Try to extract JSON from markdown code blocks
    const jsonMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)\s*```/) ||
      jsonText.match(/\[[\s\S]*\]/);

    if (!jsonMatch) {
      await logGeminiParsingError(
        new Error('No valid JSON array found in response'),
        {
          apiEndpoint: 'generateContent',
          prompt: prompt.substring(0, 500),
          responseText: text.substring(0, 1000),
          fileType: mimeType,
          language,
          questionTypes: types,
          questionCount: count
        }
      );
      throw new Error('No valid JSON array found in response');
    }

    // Clean and parse the JSON
    let questions;
    try {
      const jsonStr = (jsonMatch[1] || jsonMatch[0]).trim();
      questions = JSON.parse(jsonStr);

      if (!Array.isArray(questions)) {
        throw new Error('Expected an array of questions');
      }
    } catch (parseError) {
      console.error('[Backend Gemini] JSON parse error:', parseError);
      throw new Error(`Failed to parse questions: ${parseError.message}`);
    }

    // Process and validate questions
    const processedQuestions = questions.slice(0, count).map((q, index) => {
      const questionType = (q.type || q.question_type || 'MCQ').toUpperCase();
      const validTypes = ['MCQ', 'FIIB', 'TF', 'HOQ'];

      if (!validTypes.includes(questionType)) {
        console.warn(`[Backend Gemini] Invalid question type: ${questionType}, defaulting to MCQ`);
      }

      const finalType = validTypes.includes(questionType) ? questionType : 'MCQ';
      let questionText = String(q.question || q.question_text || `Question ${index + 1}`).trim();
      let answer = String(q.answer || q.correct_answer || '').trim();
      let options = Array.isArray(q.options) ? q.options.map(String).filter(Boolean) : [];

      // Debug log for HOQ questions
      if (finalType === 'HOQ') {
        console.log(`[Backend Gemini] 🔍 Processing HOQ question ${index + 1}:`, {
          question: questionText.substring(0, 100),
          answer: answer.substring(0, 100),
          language
        });
      }

      // 🚨 CRITICAL: Validate Sinhala/Tamil Unicode - REJECT garbage characters
      if (language === 'Sinhala' || language === 'Tamil') {
        const garbagePatterns = /fkd[ñ,a]|fnod|yeÿ|iyd|ksoi|mqkl|wdh|kfh|bEö|fjk|;d;a|o¾Y|,>q\.|>k jia|mDIaG|mßud|oaúm|ùÔh|iudka;r|f¾Ld|m%;s|fldgia|YS¾I|msróvhla|hehs|lshkq|,efnkafka|nyq-wi%dldr|wdOdrlhlata|;%sfldaKdldr|uqyqK;a|lshk|fmdÿ|,laIHhlg|hd ùu|u\.ska|we;sjk|iup;=ri%dldr|wdOdrlhla|Rcq msróvhl|uq¿|j¾\.M,h|iQ;%fhka|,ndfok|,ïn Wi|iïnkaO;dj|úia;r|me;a;l|;s%fldaKdldr|uqyqK;l|flakaøh|YS¾Ih olajd|ÿr fõ|mhs;\.ria|m%fïhh|Ndú;fhka|oelafõ|tneúka|meyeÈ,s|ms<sn\|j|iklaldfha|oelafjk|ksjerÈ|m%ldYh|jkafka|ljr o\?|jD;a;dldr|b;sß|ish,a,|p;=ri%dldr|yudre/;

        const hasGarbage = garbagePatterns.test(questionText) ||
          garbagePatterns.test(answer) ||
          options.some(opt => garbagePatterns.test(opt));

        if (hasGarbage) {
          logGeminiValidationError(
            'Question contains garbage characters',
            {
              apiEndpoint: 'generateContent',
              language,
              garbagePatterns: Array.from(questionText.match(garbagePatterns) || []).slice(0, 5),
              contentSample: questionText.substring(0, 200),
              validationRules: 'Sinhala/Tamil Unicode validation',
              metadata: {
                questionType: finalType,
                questionIndex: index
              }
            }
          );
          console.error(`[Backend Gemini] ❌ REJECTED Question ${index + 1} (${finalType}) - Contains garbage characters:`, {
            question: questionText.substring(0, 100),
            language
          });

          if (finalType === 'HOQ') {
            console.error(`[Backend Gemini] ⚠️ HOQ question was rejected! This is why it's not displayed.`);
          }

          // Skip this question - it will not be included in the final array
          return null;
        }

        // Validate proper Unicode range
        const hasProperUnicode = language === 'Sinhala'
          ? /[\u0D80-\u0DFF]{3,}/.test(questionText)
          : /[\u0B80-\u0BFF]{3,}/.test(questionText);

        if (!hasProperUnicode) {
          console.warn(`[Backend Gemini] ⚠️ Question ${index + 1} missing proper ${language} Unicode:`, questionText.substring(0, 50));
        }
      }

      // Validate FIIB questions have options
      if (finalType === 'FIIB') {
        if (!options || options.length === 0) {
          console.warn('[Backend Gemini] FIIB question missing options, generating defaults:', questionText.substring(0, 50));
          // Generate default options if missing
          options = [
            answer,
            'option1',
            'option2',
            'option3',
            'option4'
          ];
        }
        console.log('[Backend Gemini] Vision FIIB question validated:', {
          question: questionText.substring(0, 50),
          answer: answer,
          optionsCount: options.length
        });
      }

      // Add True/False options for TF questions
      if (finalType === 'TF') {
        options = ['True', 'False'];
        // Normalize answer to "True" or "False"
        if (answer.toLowerCase().includes('true') || answer.toLowerCase() === 't') {
          answer = 'True';
        } else if (answer.toLowerCase().includes('false') || answer.toLowerCase() === 'f') {
          answer = 'False';
        }
        console.log('[Backend Gemini] TF question validated:', {
          question: questionText.substring(0, 50),
          answer: answer,
          options: options
        });
      }

      // ✅ CRITICAL: Ensure ALL questions have explanations
      let explanation = q.explanation || q.reasoning || '';

      // Generate default explanation if missing
      if (!explanation || explanation.trim().length < 10) {
        console.warn(`[Backend Gemini] Question ${index + 1} missing explanation, generating default`);

        // Generate type-specific default explanations
        if (finalType === 'MCQ') {
          explanation = `The correct answer is "${answer}" based on the content provided.`;
        } else if (finalType === 'FIIB') {
          explanation = `"${answer}" correctly fills the blank in this context.`;
        } else if (finalType === 'TF') {
          explanation = `This statement is ${answer} according to the source material.`;
        } else if (finalType === 'HOQ') {
          explanation = `This answer addresses the key concepts and demonstrates understanding of the topic.`;
        }
      }

      return {
        id: `gen-${Date.now()}-${index}`,
        type: finalType,
        difficulty: ['Easy', 'Intermediate', 'Hard'].includes(q.difficulty)
          ? q.difficulty
          : difficulty,
        blooms_taxonomy: [
          'Remember', 'Understand', 'Apply',
          'Analyze', 'Evaluate', 'Create'
        ].includes(q.blooms_taxonomy) ? q.blooms_taxonomy : bloom_level,
        question: questionText,
        answer: answer,
        options: options,
        explanation: explanation, // ✅ ALWAYS has a value now
        generated: true,
        source: 'gemini-vision'
      };
    });

    // Filter out null values (rejected questions with garbage characters)
    const validQuestions = processedQuestions.filter(q => q !== null);

    const rejectedCount = processedQuestions.length - validQuestions.length;
    if (rejectedCount > 0) {
      console.warn(`[Backend Gemini] ⚠️ Rejected ${rejectedCount} questions due to garbage characters`);
      console.warn(`[Backend Gemini] Valid questions: ${validQuestions.length}, Requested: ${count}`);

      // If we rejected too many and don't have enough valid questions, warn the user
      if (validQuestions.length < count * 0.5) {
        console.error(`[Backend Gemini] ❌ CRITICAL: Only ${validQuestions.length}/${count} valid questions generated!`);
        console.error(`[Backend Gemini] The PDF may have encoding issues. Consider re-scanning or using a different file.`);
      }
    }

    // Log question type distribution
    const typeDistribution = validQuestions.reduce((acc, q) => {
      acc[q.type] = (acc[q.type] || 0) + 1;
      return acc;
    }, {});
    console.log(`[Backend Gemini] Question type distribution:`, typeDistribution);
    console.log(`[Backend Gemini] Successfully generated ${validQuestions.length} valid questions (${rejectedCount} rejected)`);

    return validQuestions;

  } catch (error) {
    await logGeminiApiError(error, {
      apiEndpoint: 'generateContent',
      prompt: prompt?.substring(0, 500),
      fileType: mimeType,
      language,
      questionTypes: types,
      questionCount: count,
      endpoint: 'generateQuestionsFromVision',
      metadata: {
        promptLength: prompt?.length,
        responseLength: text?.length
      }
    });
    console.error('[Backend Gemini] Vision question generation error:', error);
    return [];
  }
}

/**
 * Get MIME type from file type and URL
 * @param {string} fileType - File type
 * @param {string} fileUrl - File URL
 * @returns {string} - MIME type
 */
const getMimeType = (fileType, fileUrl) => {
  const extension = fileUrl.split('.').pop().toLowerCase();

  const mimeTypes = {
    // Images
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'webp': 'image/webp',
    // Documents
    'pdf': 'application/pdf',
    'txt': 'text/plain',
    'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  };

  return mimeTypes[extension] || 'application/octet-stream';
};

export default {
  generateQuestions,
  generateQuestionsFromFile,
  generateStructuredMaterialFromFile,
  generateLearningPackFromBase64,
  generateLearningPacksFromBase64
};
//save