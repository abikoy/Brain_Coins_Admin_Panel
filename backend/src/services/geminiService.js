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
 * Extract content metadata from file using Gemini Vision API
 * Extracts: language, grade, subject, chapters, clean text
 * @param {string} base64Data - Base64 encoded file data
 * @param {string} mimeType - MIME type of file
 * @returns {Promise<Object>} - Extracted metadata
 */
export const extractContentMetadata = async (base64Data, mimeType) => {
  try {
    console.log('[Backend Gemini] Extracting content metadata...');

    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.5-flash',
      generationConfig: {
        responseMimeType: "application/json"
      }
    });

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
3. **subject**: Identify the subject from the 8 compulsory subjects above (match exactly, or "Unknown")
4. **chapters**: Array of chapter/section objects with:
   - title: Chapter/section title
   - content: Clean Unicode text content
   - pageNumbers: Array of page numbers (if visible)
5. **summary**: Brief 2-3 sentence summary of the document
6. **hasDiagrams**: Boolean - does it contain diagrams/images?
7. **topics**: Array of main topics covered

IMPORTANT: 
- Grade must be between 6-11 (Sri Lankan local syllabus)
- Subject must match one of the 8 compulsory subjects listed above
- For Social Studies, include History/Geography/Civics content
- For Language & Literature, specify if Sinhala or Tamil

Return ONLY valid JSON in this exact format:
{
  "language": "English",
  "grade": "10",
  "subject": "Science",
  "chapters": [
    {
      "title": "Chapter 1: Introduction",
      "content": "Clean extracted text...",
      "pageNumbers": [1, 2]
    }
  ],
  "summary": "This document covers...",
  "hasDiagrams": true,
  "topics": ["Topic 1", "Topic 2"]
}
`;

    const imagePart = {
      inlineData: {
        data: base64Data,
        mimeType: mimeType
      }
    };

    const result = await model.generateContent([prompt, imagePart]);
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
      types = ['MCQ', 'FIIB', 'TF', 'HOQ', 'Summary']
    } = options;

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const prompt = `
Generate ${count} educational questions from the following content.

Content:
${content}

Requirements:
- Difficulty: ${difficulty}
- Question types: ${types.join(', ')}
- Format: JSON array with objects containing: type, difficulty, question, answer, options (for MCQ)

Question Types:
- MCQ: Multiple Choice Questions (include 4 options)
- FIIB: Fill in the Blanks
- TF: True/False
- HOQ: Higher Order Questions (analytical/critical thinking)
- Summary: Summarization questions

Return ONLY valid JSON array, no additional text.
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
    
    // Return mock questions if API fails
    return generateMockQuestions(options.count || 5);
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
      questions = await generateQuestionsFromVision(base64Data, mimeType, { count, difficulty, types });
    } else {
      // For text documents, extract text first
      const text = buffer.toString('utf-8');
      questions = await generateQuestions(text, { count, difficulty, types });
    }

    // Step 3: Attach metadata to questions
    if (metadata) {
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
    // Return mock questions as fallback
    return generateMockQuestions(options.count || 5, error.message);
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
    const { count, difficulty, types } = options;

    // Use Gemini Pro Vision for image/PDF analysis
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const prompt = `
Analyze this document/image and generate ${count} educational questions.

Requirements:
- Difficulty: ${difficulty}
- Question types: ${types.join(', ')}
- Extract all text and visual information from the document
- Generate questions based on the content
- Format: JSON array with objects containing: id, type, difficulty, question, answer, options (for MCQ)

Question Types:
- MCQ: Multiple Choice Questions (include 4 options, mark correct answer)
- FIIB: Fill in the Blanks (use ___ for blank)
- TF: True/False
- HOQ: Higher Order Questions (analytical/critical thinking)
- Summary: Summarization questions

Return ONLY valid JSON array, no markdown, no additional text.
Example format:
[
  {
    "id": 1,
    "type": "MCQ",
    "difficulty": "Easy",
    "question": "What is...?",
    "answer": "Option A",
    "options": ["Option A", "Option B", "Option C", "Option D"]
  }
]
`;

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
      ...q,
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
  generateQuestionsFromFile
};
