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
import { createRequire } from 'module';

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
          // Limit to first 20 pages for better performance
          max: 20,
          // Disable worker threads for better compatibility
          worker: false
        });
        
        if (!data.text || !data.text.trim()) {
          throw new Error('No text content could be extracted from the PDF');
        }
        
        return data.text;
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
  throw lastError || new Error('Max retry attempts reached');
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
    const prompt = `SYSTEM:\nYou are EduQuestLab. Summarize ONLY in ${language}. For Sinhala/Tamil, use clean Unicode.\nTASK:\nProduce 5-8 concise bullet points strictly grounded in the provided content. No preface or trailing text.\nCONTENT:\n${text}\nOUTPUT: JSON object {"bullets": string[]} with 5-8 items.`;
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
 * Generate 5-8 bullet summary from image/PDF using Vision
 */
export const generateSummaryFromVision = async (base64Data, mimeType, language = 'English') => {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const prompt = `SYSTEM:\nYou are EduQuestLab. Summarize ONLY in ${language}. For Sinhala/Tamil, use clean Unicode.\nTASK:\nProduce 5-8 concise bullet points strictly grounded in this document/image. No preface or trailing text.\nOUTPUT: JSON object {"bullets": string[]} with 5-8 items.`;
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
    console.log('[Backend Gemini] Generating structured study material:', { fileUrl, fileType });

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
    console.log('[Backend Gemini] Extracting content metadata...');

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
    
    // Log first 200 chars for debugging
    console.log('[Backend Gemini] Raw metadata response:', text.substring(0, 200) + (text.length > 200 ? '...' : ''));

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
          console.log('[Backend Gemini] Successfully extracted JSON from markdown');
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
Generate ${count} items strictly from the provided content.

Content (use only this):
${content}

Constraints:
- All text must be in ${language}. For Sinhala or Tamil, output clean Unicode.
- Difficulty: ${difficulty}
- Bloom level: ${bloom_level}
- Allowed types: MCQ, FIIB, TF, HOQ (ignore any other types)

Output: JSON array only. Each item object must include:
- type (MCQ|FIIB|TF|HOQ)
- difficulty
- question
- answer (for MCQ/FIIB/TF/HOQ)
- options (array of 4 strings for MCQ)
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Parse JSON response
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('Invalid response format from Gemini');
    }

    const questions = JSON.parse(jsonMatch[0]);
    
    console.log('[Backend] Generated questions:', questions.length);
    return questions;

  } catch (error) {
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
  console.log('[Backend Gemini] Using mock questions:', reason);
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
      bloom_level = 'Understand'
    } = options;

    console.log('[Backend Gemini] Processing file:', { fileUrl, fileType });

    // Extract file path from URL
    // URL format: https://.../storage/v1/object/public/content-uploads/uploads/file.pdf
    console.log('[Backend Gemini] Downloading file:', fileUrl);
    const buffer = await downloadAny(fileUrl);
    const base64Data = buffer.toString('base64');

    // Determine MIME type
    const mimeType = getMimeType(fileType, fileUrl);

    console.log('[Backend Gemini] File converted to base64, size:', base64Data.length);

    // Step 1: Extract content metadata (language, grade, subject, chapters)
    let metadata = null;
    if (fileType === 'image' || fileType === 'pdf') {
      console.log('[Backend Gemini] Step 1: Extracting content metadata...');
      metadata = await extractContentMetadata(base64Data, mimeType);
      console.log('[Backend Gemini] Metadata extracted:', {
        language: metadata.language,
        grade: metadata.grade,
        subject: metadata.subject,
        chapters: metadata.chapters?.length || 0
      });
    }

    // Step 2: Generate questions
    console.log('[Backend Gemini] Step 2: Generating questions...');
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
    
    console.log('[Backend Gemini] Target question counts by type:', typeCounts);
    
    // If no valid types with count > 0, return empty array
    if (Object.keys(typeCounts).length === 0) {
      console.log('[Backend Gemini] No valid question types with count > 0');
      return [];
    }
    
    // Generate questions for each type
    const allQuestions = [];
    
    for (const [type, typeCount] of Object.entries(typeCounts)) {
      if (typeCount <= 0) continue;
      
      console.log(`[Backend Gemini] Generating ${typeCount} ${type} questions...`);
      
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
          // Fallback to mock questions if text extraction fails
          typeQuestions = generateMockQuestions(typeCount, `Text extraction failed: ${extractError.message}`)
            .filter(q => q.type === type);
        }
        
        // Take only the requested number of this type
        const selectedQuestions = typeQuestions
          .filter(q => (q.type || q.question_type) === type)
          .slice(0, typeCount);
          
        console.log(`[Backend Gemini] Generated ${selectedQuestions.length}/${typeCount} ${type} questions`);
        allQuestions.push(...selectedQuestions);
        
      } catch (error) {
        console.error(`[Backend Gemini] Error generating ${type} questions:`, error);
        // Continue with other types
      }
    }
    
    // If we didn't get enough questions, try one more time with all types
    if (allQuestions.length < count) {
      const remaining = count - allQuestions.length;
      console.log(`[Backend Gemini] Generating ${remaining} additional questions to reach target...`);
      
      try {
        let additionalQuestions = [];
        
        if (fileType === 'image' || fileType === 'pdf') {
          additionalQuestions = await generateQuestionsFromVision(base64Data, mimeType, {
            count: remaining * 2,
            difficulty,
            types: Object.keys(typeCounts),
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
        console.log(`[Backend Gemini] Added ${newQuestions.length} additional questions`);
        
      } catch (error) {
        console.error('[Backend Gemini] Error generating additional questions:', error);
      }
    }
    
    // Ensure we don't exceed the requested count
    const finalQuestions = allQuestions.slice(0, count);
    console.log(`[Backend Gemini] Generated total of ${finalQuestions.length} questions`);

    // Step 3: Attach metadata to questions
    if (metadata && Array.isArray(finalQuestions)) {
      return finalQuestions.map(q => ({
        ...q,
        metadata: {
          language: metadata.language,
          grade: metadata.grade,
          subject: metadata.subject,
          topics: metadata.topics
        }
      }));
    }

    return questions;

  } catch (error) {
    console.error('[Backend Gemini] File processing error:', error);
    // No mock fallback: return empty set
    return [];
  }
};

/**
 * Generate questions from image/PDF using Gemini Vision API
      const prompt = `SYSTEM:\nYou are an expert educational content creator. Analyze the provided document/image and generate ${count} high-quality educational questions.\n\nINSTRUCTIONS:\n1. LANGUAGE: Respond in ${language}. For Sinhala/Tamil, use clean Unicode.\n2. DIFFICULTY: ${difficulty}.\n3. BLOOM'S LEVEL: ${bloom_level}.\n4. QUESTION TYPES: ${types.join(', ')}.\n\nQUESTION FORMAT RULES:\n- MCQ: 1 correct answer + 3 plausible distractors\n- FIIB: Use ___ for blanks\n- TF: Must be clearly true or false\n- HOQ: Include brief reasoning\n\nOUTPUT FORMAT: Return ONLY a valid JSON array. Example:\n[{\n  "question_type": "MCQ",\n  "difficulty": "Easy",\n  "blooms_taxonomy": "Understand",\n  "question_text": "Sample question?",\n  "correct_answer": "Correct answer",\n  "options": ["Incorrect 1", "Incorrect 2", "Correct answer", "Incorrect 3"],\n  "explanation": "Brief explanation if needed"\n}]`;

      const imagePart = {
        inlineData: {
          data: base64Data,
          mimeType: mimeType
        }
      };

      console.log('[Backend Gemini] Sending to Gemini Vision API...');
      
      const result = await model.generateContent([prompt, imagePart]);
      const response = await result.response;
      const text = response.text();

      console.log('[Backend Gemini] Received response from Gemini');
      
      // Log first 200 chars for debugging
      console.log('[Backend Gemini] Raw response:', text.length > 200 ? text.substring(0, 200) + '...' : text);

      // Parse JSON response with better error handling
      let jsonText = text.trim();
      
      // Try to extract JSON from markdown code blocks
      const jsonMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || 
                       jsonText.match(/\[[\s\S]*\]/);
      
      if (!jsonMatch) {
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

        return {
          id: `gen-${Date.now()}-${index}`,
          type: validTypes.includes(questionType) ? questionType : 'MCQ',
          difficulty: ['Easy', 'Intermediate', 'Hard'].includes(q.difficulty) 
            ? q.difficulty 
            : difficulty,
          blooms_taxonomy: [
            'Remember', 'Understand', 'Apply', 
            'Analyze', 'Evaluate', 'Create'
          ].includes(q.blooms_taxonomy) ? q.blooms_taxonomy : bloom_level,
          question: String(q.question || q.question_text || `Question ${index + 1}`).trim(),
          answer: String(q.answer || q.correct_answer || '').trim(),
          options: Array.isArray(q.options) 
            ? q.options.map(String).filter(Boolean) 
            : [],
          explanation: q.explanation ? String(q.explanation) : undefined,
          generated: true,
          source: 'gemini-vision',
          metadata: {
            attempt: attempt + 1,
            timestamp: new Date().toISOString()
          }
        };
      });

      console.log(`[Backend Gemini] Successfully generated ${processedQuestions.length} questions`);
      return processedQuestions;

    } catch (error) {
      lastError = error;
      attempt++;
      
      // Log error details
      console.error(`[Backend Gemini] Question generation attempt ${attempt} failed:`, {
        message: error.message,
        status: error.status,
        code: error.code,
        attempt,
        maxRetries
      });

      // If we've reached max retries, break the loop
      if (attempt >= maxRetries) break;

      // Calculate delay with exponential backoff and jitter
      const delay = Math.min(
        Math.pow(2, attempt) * baseDelay + Math.random() * 1000,
        30000 // Max 30 seconds
      );
      
      console.log(`[Backend Gemini] Retrying in ${Math.round(delay/1000)} seconds...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  // If we get here, all attempts failed
  console.error('[Backend Gemini] All question generation attempts failed');
  
  // Return mock questions as fallback
  console.warn('[Backend Gemini] Returning mock questions as fallback');
  return Array(count).fill().map((_, i) => ({
    id: `mock-${Date.now()}-${i}`,
    type: 'MCQ',
    difficulty: difficulty,
    blooms_taxonomy: bloom_level,
    question: `Sample question ${i + 1} (mock data - service unavailable)`,
    answer: 'Correct answer',
    options: ['Incorrect 1', 'Incorrect 2', 'Correct answer', 'Incorrect 3'],
    explanation: 'This is a placeholder question. The question generation service is currently unavailable.',
    generated: true,
    source: 'fallback',
    metadata: {
      isFallback: true,
      error: lastError?.message || 'Service unavailable',
      timestamp: new Date().toISOString()
    }
  }));
};

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
  generateStructuredMaterialFromFile
};
//save