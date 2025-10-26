/**
 * BACKEND - Gemini AI Service
 * This file contains AI question generation logic using Google's Gemini API
 * Used by backend API controllers
 * DO NOT use this in frontend - this should only run on the server
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import { downloadFile } from './supabaseStorage.js';

dotenv.config();

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

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
    const result = await model.generateContent([prompt, imagePart]);
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
    const urlParts = fileUrl.split('/');
    const bucketIndex = urlParts.indexOf('content-uploads');
    if (bucketIndex === -1) throw new Error('Invalid file URL format - bucket name not found');
    const filePath = urlParts.slice(bucketIndex + 1).join('/');
    const buffer = await downloadFile(filePath);
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
    const urlParts = fileUrl.split('/');
    const bucketIndex = urlParts.indexOf('content-uploads');
    if (bucketIndex === -1) {
      throw new Error('Invalid file URL format - bucket name not found');
    }
    const filePath = urlParts.slice(bucketIndex + 1).join('/');

    const buffer = await downloadFile(filePath);
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

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }, imagePart] }],
      config: {
        responseMimeType: 'application/json',
        responseSchema: schema
      }
    });

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
    
    // 2. CORRECTED API CALL STRUCTURE:
    // Wrap the prompt and imagePart into the 'parts' array of a 'user' content object.
    const result = await model.generateContent({
      contents: [{
        role: "user",
        parts: [{ text: prompt }, imagePart] // Combine prompt and image part here
      }],
      config: { // Pass configuration as the 'config' property
        responseMimeType: "application/json",
        responseSchema: metadataSchema
      }
    });

    const response = await result.response;
    const text = response.text();

    console.log('[Backend Gemini] Raw metadata response:', text.substring(0, 200));

    // Parse JSON response
    let metadata;
    try {
      metadata = JSON.parse(text);
    } catch (parseError) {
      // Try to extract JSON from markdown code blocks
      const jsonMatch = text.match(/```json\n?([\s\S]*?)\n?```/) || text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        metadata = JSON.parse(jsonMatch[1] || jsonMatch[0]);
      } else {
        throw new Error('Failed to parse metadata JSON');
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
    console.error('[Backend Gemini] Metadata extraction error:', error);
    
    // Return default metadata on error
    return {
      language: 'Unknown',
      grade: 'Unknown',
      subject: 'Unknown',
      chapters: [{
        title: 'Content',
        content: 'Unable to extract content',
        pageNumbers: []
      }],
      summary: 'Metadata extraction failed',
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
      types = ['MCQ', 'FIIB', 'TF', 'HOQ', 'Summary']
    } = options;

    console.log('[Backend Gemini] Processing file:', { fileUrl, fileType });

    // Extract file path from URL
    // URL format: https://.../storage/v1/object/public/content-uploads/uploads/file.pdf
    const urlParts = fileUrl.split('/');
    const bucketIndex = urlParts.indexOf('content-uploads');
    
    if (bucketIndex === -1) {
      throw new Error('Invalid file URL format - bucket name not found');
    }
    
    // Get path after bucket name (e.g., "uploads/file.pdf")
    const filePath = urlParts.slice(bucketIndex + 1).join('/');
    
    console.log('[Backend Gemini] Downloading file from Supabase:', filePath);
    
    // Download file using Supabase service (bypasses RLS)
    const buffer = await downloadFile(filePath);
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
    let questions;
    if (fileType === 'image' || fileType === 'pdf') {
      questions = await generateQuestionsFromVision(base64Data, mimeType, {
        count,
        difficulty,
        types,
        language: options.language,
        bloom_level: options.bloom_level
      });
    } else {
      // For text documents, extract text first
      const text = buffer.toString('utf-8');
      questions = await generateQuestions(text, {
        count,
        difficulty,
        types,
        language: options.language,
        bloom_level: options.bloom_level
      });
    }

    // Step 3: Attach metadata to questions
    if (metadata && Array.isArray(questions)) {
      questions = questions.map(q => ({
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
 * @param {string} base64Data - Base64 encoded file data
 * @param {string} mimeType - MIME type of file
 * @param {Object} options - Generation options
 * @returns {Promise<Array>} - Generated questions
 */
const generateQuestionsFromVision = async (base64Data, mimeType, options) => {
  try {
    const { count = 5, difficulty = 'Intermediate', types = ['MCQ', 'FIIB', 'TF', 'HOQ'], language = 'English', bloom_level = 'Understand' } = options || {};

    // Use Gemini Pro Vision for image/PDF analysis
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const prompt = `SYSTEM:\nYou are EduQuestLab, a multilingual pedagogy-aware generator. Obey the requested language; align to Bloom's level; ground strictly in the provided content.\n\nTASK:\nAnalyze this document/image and generate ${count} educational items.\n\nConstraints:\n- Respond ONLY in ${language}. For Sinhala/Tamil, output clean Unicode; avoid Latin letters except proper nouns/symbols.\n- Difficulty: ${difficulty}.\n- Bloom level: ${bloom_level}.\n- Allowed types: MCQ, FIIB, TF, HOQ (ignore any other types).\n\nPer-type rules:\n- MCQ: 1 correct + 3 plausible distractors.\n- FIIB: concise blanks (use ___).\n- TF: unambiguous true/false.\n- HOQ: require reasoning; include short rationale.\n\nOutput: Return ONLY a JSON array. Each item shape:\n{\n  "question_type": "MCQ|FIIB|TF|HOQ",\n  "difficulty": "Easy|Intermediate|Hard",\n  "blooms_taxonomy": "Remember|Understand|Apply|Analyze|Evaluate|Create",\n  "question_text": string,\n  "correct_answer": string,\n  "options": string[]\n}`;

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

    // Parse JSON response (handle markdown code blocks)
    let jsonText = text.trim();
    
    // Remove markdown code blocks if present
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/```\n?/g, '');
    }

    // Extract JSON array
    const jsonMatch = jsonText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.error('[Backend Gemini] Invalid response format:', text.substring(0, 200));
      throw new Error('Invalid response format from Gemini');
    }

    const questions = JSON.parse(jsonMatch[0]);
    
    // Add generated flag and ensure IDs
    const processedQuestions = questions.map((q, index) => ({
      id: q.id || Date.now() + index,
      type: q.type || q.question_type || 'MCQ',
      difficulty: q.difficulty || difficulty,
      blooms_taxonomy: q.blooms_taxonomy || 'Understand',
      question: q.question || q.question_text || '',
      answer: q.answer || q.correct_answer || '',
      options: Array.isArray(q.options) ? q.options : [],
      reasoning: q.reasoning || undefined,
      generated: true,
      source: 'gemini-vision'
    }));

    console.log('[Backend Gemini] Generated questions:', processedQuestions.length);
    return processedQuestions;

  } catch (error) {
    console.error('[Backend Gemini] Vision API error:', error);
    throw error;
  }
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
