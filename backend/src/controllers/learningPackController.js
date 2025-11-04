// Core Node.js modules
import { promises as fs } from 'fs';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';

// Third-party imports
import multer from 'multer';

// (Removed PDF.js setup; using direct-to-Gemini flow)

// Local imports
import { 
  getLearningPacksBySubject,
  getLearningPackWithSubject,
  createLearningPack
} from '../services/learningPackService.js';
import { generateLearningPacksFromBase64, generateQuestions } from '../services/geminiService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const UPLOAD_DIR = path.join(process.cwd(), 'uploads');

// --- Utility Functions ---

// Ensure upload directory exists
const ensureUploadDir = async () => {
  try {
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
  } catch (err) {
    console.error('Error creating upload directory:', err);
    throw err;
  }
};

// Generate questions for a selected learning pack (second phase)
const generateQuestionsForPackHandler = async (req, res) => {
  try {
    const { content, language = 'English', count = 10, difficulty = 'Intermediate', types = ['MCQ', 'FIIB', 'TF', 'HOQ'], bloom_level = 'Understand' } = req.body || {};
    if (!content || typeof content !== 'string' || content.trim().length < 20) {
      return res.status(400).json({ success: false, error: 'Invalid or missing learning pack content' });
    }

    const questions = await generateQuestions(content, { count, difficulty, types, language, bloom_level });
    return res.json({ success: true, questions, stats: { questions: Array.isArray(questions) ? questions.length : 0 } });
  } catch (err) {
    console.error('[Backend] Generate questions error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// Simple language detector
const detectLanguage = (text) => {
  const tamilChars = text.match(/[\u0B80-\u0BFF]/g) || [];
  const sinhalaChars = text.match(/[\u0D80-\u0DFF]/g) || [];
  if (tamilChars.length > sinhalaChars.length && tamilChars.length > 10) return 'Tamil';
  else if (sinhalaChars.length > 10) return 'Sinhala';
  return 'English';
};

// Enhanced document structure analysis with better chapter detection
// Enhanced document structure analysis with better chapter detection
const analyzeDocumentStructure = (text, language) => {
  if (!text || typeof text !== 'string') {
    console.error('Invalid text input for document analysis');
    return [{ title: 'Chapter 1: Document Content', content: 'No content available', order: 1 }];
  }

  // Enhanced cleaning that preserves Sinhala and Tamil Unicode
  const cleanedText = text
    // Remove common PDF artifacts while preserving Sinhala (අ-෴) and Tamil (ஂ-௺) characters
    .replace(/[^\p{L}\p{N}\p{P}\p{Z}\n\r\u0D80-\u0DFF\u0B80-\u0BFF]/gu, ' ')
    // Remove common PDF commands
    .replace(/endobj|endstream|obj|stream|endstream|trailer|startxref|filter|flatedecode|length/gi, '')
    // Clean up excessive whitespace
    .replace(/\s+/g, ' ')
    .trim();

  // Define language-specific patterns
  const chapterPatterns = {
    Sinhala: [
      /(?:පරිච්ඡේදය|අධ්\u200Dයාය)\.?\s*(\d+|[IVXLCDM]+)/g,  // Sinhala chapter patterns
      /^\s*(\d+)\..*?[\u0D80-\u0DFF]/g  // Number followed by Sinhala text
    ],
    Tamil: [
      /(?:அத்தியாயம்|பகுதி)\s*(\d+|[IVXLCDM]+)/gi,  // Tamil chapter patterns
      /^\s*(\d+)\..*?[\u0B80-\u0BFF]/g  // Number followed by Tamil text
    ],
    English: [
      /^(chapter|unit|section|part|lecture|module|lesson)[\s:]+(\d+|[IVXLCDM]+)/i,
      /^\d+[\s\.]+\s*[A-Z][^\n]{5,}/,
      /^[IVXLCDM]+\.\s*[A-Z][^\n]+/i,
      /^\d+\.\d+\s+[A-Z][^\n]+/,
      /^[A-Z][A-Z\s]{10,}$/,
      /^[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s*:/
    ]
  };

  // Select patterns based on detected language
  const patterns = chapterPatterns[language] || chapterPatterns.English;
  const lines = cleanedText.split('\n');
  const chapters = [];
  let currentChapter = { title: 'Chapter 1: Introduction', content: '', order: 1 };
  let inChapter = false;

  // First pass: Identify all potential chapter starts
  const chapterIndices = [];
  lines.forEach((line, index) => {
    const isChapter = patterns.some(pattern => {
      // Reset lastIndex for global regex to avoid state issues
      if (pattern.global) pattern.lastIndex = 0;
      return pattern.test(line);
    });
    
    if (isChapter) {
      chapterIndices.push({ index, line });
    }
  });

  // If no chapters found, try to split by large paragraphs
  if (chapterIndices.length === 0) {
    console.log('No chapter markers found, attempting to split by paragraphs...');
    const paragraphs = cleanedText.split(/\n\s*\n+/);
    let currentContent = [];
    let charCount = 0;
    
    paragraphs.forEach((para, i) => {
      const paraLength = para.length;
      // Start new chapter every 5000 characters or at major section breaks
      if (charCount > 0 && (charCount + paraLength > 5000 || para.match(/[.!?]\s*$/))) {
        chapters.push({
          title: `Section ${chapters.length + 1}`,
          content: currentContent.join('\n\n'),
          order: chapters.length + 1
        });
        currentContent = [para];
        charCount = paraLength;
      } else {
        currentContent.push(para);
        charCount += paraLength;
      }
    });
    
    // Add the last chapter
    if (currentContent.length > 0) {
      chapters.push({
        title: `Chapter ${chapters.length + 1}`,
        content: currentContent.join('\n\n'),
        order: chapters.length + 1
      });
    }
    
    return chapters.length > 0 ? chapters : [{
      title: 'Chapter 1: Document Content',
      content: cleanedText.substring(0, 10000),
      order: 1
    }];
  }

  // Process each chapter
  chapterIndices.forEach((chapter, i) => {
    const start = chapter.index;
    const end = i < chapterIndices.length - 1 ? chapterIndices[i + 1].index : lines.length;
    const chapterContent = lines.slice(start, end).join('\n');
    
    // Clean up the chapter title
    let chapterTitle = chapter.line.trim();
    
    // Remove any numbering or special characters from the start
    chapterTitle = chapterTitle
      .replace(/^[^a-zA-Z\u0D80-\u0DFF\u0B80-\u0BFF]+/, '')
      .trim();
    
    // If title is too short or missing, generate one
    if (!chapterTitle || chapterTitle.length < 3) {
      chapterTitle = `Chapter ${i + 1}`;
    }
    
    // Limit title length
    if (chapterTitle.length > 100) {
      chapterTitle = chapterTitle.substring(0, 100) + '...';
    }
    
    // Add the chapter
    chapters.push({
      title: chapterTitle,
      content: chapterContent,
      order: i + 1
    });
  });

  // If we still don't have chapters, split the content by size
  if (chapters.length === 0) {
    console.log('Falling back to content-based splitting...');
    const chunkSize = 10000; // characters per chunk
    for (let i = 0; i < cleanedText.length; i += chunkSize) {
      const chunk = cleanedText.substring(i, i + chunkSize);
      chapters.push({
        title: `Chapter ${i / chunkSize + 1}`,
        content: chunk,
        order: i / chunkSize + 1
      });
    }
  }

  return chapters;
};

// Generate learning packs from chapters with better content organization
const generateLearningPacks = (chapters, language) => {
  if (!chapters || !Array.isArray(chapters) || chapters.length === 0) {
    console.error('Invalid or empty chapters array');
    return [{
      title: 'Learning Pack 1',
      description: 'Default learning pack',
      content: 'No content available',
      duration: 10,
      difficulty: 'Beginner',
      language: language || 'English',
      createdAt: new Date().toISOString()
    }];
  }

  const difficultyLevels = {
    English: ['Beginner', 'Intermediate', 'Advanced'],
    Sinhala: ['ආරම්භක', 'මධ්‍යම', 'උසස්'],
    Tamil: ['தொடக்கநிலை', 'இடைநிலை', 'மேம்பட்ட']
  };

  const difficulties = difficultyLevels[language] || difficultyLevels.English;
  const now = new Date().toISOString();
  
  return chapters.map((chapter, index) => {
    // Calculate content-based difficulty
    const content = chapter.content || '';
    const wordCount = content.split(/\s+/).length;
    const sentenceCount = (content.match(/[.!?]+/g) || []).length;
    const avgSentenceLength = wordCount / Math.max(1, sentenceCount);
    
    // Determine difficulty based on content metrics
    let difficultyIndex = 0;
    if (wordCount > 2000 || avgSentenceLength > 25) {
      difficultyIndex = 2; // Advanced
    } else if (wordCount > 1000 || avgSentenceLength > 15) {
      difficultyIndex = 1; // Intermediate
    }
    
    // Ensure we don't exceed array bounds
    difficultyIndex = Math.min(difficultyIndex, difficulties.length - 1);
    
    // Extract key topics (first few sentences)
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 10);
    const keyConcepts = sentences
      .slice(0, 3)
      .map(s => s.trim().substring(0, 50) + (s.length > 50 ? '...' : ''));
    
    return {
      id: `pack-${Date.now()}-${index}`,
      title: chapter.title || `Learning Pack ${index + 1}`,
      description: keyConcepts[0] || 'No description available',
      content: content.substring(0, 5000), // Limit content size
      duration: Math.max(5, Math.ceil(wordCount / 200) * 5), // 5 min per 200 words, min 5 min
      difficulty: difficulties[difficultyIndex],
      language: language || 'English',
      topics: keyConcepts,
      order: chapter.order || index + 1,
      createdAt: now,
      updatedAt: now
    };
  });
};
// --- File Text Extraction Functions ---

// pdf-parse extraction (Node ESM compatible)
// Clean text by removing non-printable characters and PDF artifacts
const cleanText = (text) => {
  if (!text) return '';
  
  // Remove PDF binary artifacts
  let cleaned = text
    .replace(/\s*\b(?:endobj|endstream|obj|stream|endstream|trailer|startxref|filter|flatedecode|length|\d+\s+\d+\s+[A-Za-z]+)\b\s*/g, ' ')
    .replace(/\b\d+\s+0\s+R\b/g, '')  // Remove PDF object references
    .replace(/\b\w+\s*<<[^>]*>>/g, '')  // Remove PDF dictionaries
    .replace(/[^\x00-\x7F]+/g, ' ')     // Remove non-ASCII characters
    .replace(/\s+/g, ' ')               // Normalize whitespace
    .trim();
    
  return cleaned;
};

const extractTextWithPDFParse = async (filePath) => {
  let pdf = null;
  
  try {
    // Read the PDF file
    const data = await fs.readFile(filePath);
    
    // Load the PDF document
    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(data),
      cMapUrl: '../../node_modules/pdfjs-dist/cmaps/',
      cMapPacked: true,
    });
    
    pdf = await loadingTask.promise;
    let fullText = '';
    
    // Extract text from each page
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map(item => item.str).join(' ');
      fullText += pageText + '\n\n';
      
      // Clean up page resources
      await page.cleanup();
    }
    
    if (!fullText.trim()) {
      throw new Error('No text content could be extracted from the PDF');
    }
    
    // Clean the extracted text
    const cleanedText = cleanText(fullText);
    
    if (!cleanedText || !cleanedText.trim()) {
      throw new Error('No text content found in PDF after cleaning');
    }
    
    return cleanedText;
  } catch (error) {
    console.error('PDF extraction error:', error);
    throw new Error(`Failed to extract text from PDF: ${error.message}`);
  } finally {
    // Clean up PDF document resources
    if (pdf) {
      try {
        await pdf.cleanup();
        await pdf.destroy();
      } catch (cleanupError) {
        console.error('Error cleaning up PDF resources:', cleanupError);
      }
    }
  }
};

// Enhanced PDF text extraction with better error handling
const extractTextFromPDF = async (filePath) => {
  console.log('[extractTextFromPDF] Attempting to extract text from PDF...');
  
  try {
    // First try pdf-parse
    try {
      const text = await extractTextWithPDFParse(filePath);
      if (text && text.trim()) {
        console.log('[extractTextFromPDF] Successfully extracted text using pdf-parse');
        return text;
      }
      console.log('[extractTextFromPDF] pdf-parse returned empty text');
    } catch (parseError) {
      console.warn('[extractTextFromPDF] pdf-parse failed:', parseError.message);
    }
    
    // If we get here, pdf-parse failed or returned empty text
    console.log('[extractTextFromPDF] Trying alternative extraction method...');
    
    // Try reading as plain text (some PDFs can be read this way)
    try {
      const buffer = await fs.readFile(filePath);
      const text = buffer.toString('utf8');
      // Check if we got any meaningful text (more than 100 non-whitespace chars)
      if (text && text.replace(/\s+/g, '').length > 100) {
        console.log('[extractTextFromPDF] Successfully extracted text as plain text');
        return text;
      }
    } catch (textError) {
      console.warn('[extractTextFromPDF] Plain text extraction failed:', textError.message);
    }
    
    throw new Error('Could not extract text from PDF using any method');
    
  } catch (error) {
    console.error('[extractTextFromPDF] Error processing PDF:', error.message);
    throw new Error(`Failed to process PDF: ${error.message}`);
  }
};

// Tesseract OCR extraction for images only (no PDF conversion)
const extractTextWithOCR = async (filePath, mimeType) => {
  // Only process image files, not PDFs
  if (mimeType === 'application/pdf') {
    throw new Error('PDF processing should be handled by extractTextFromPDF');
  }

  if (!['image/png', 'image/jpeg', 'image/jpg'].includes(mimeType)) {
    throw new Error('Unsupported file type for OCR');
  }

  console.log('[extractTextWithOCR] Initializing Tesseract worker for image OCR...');
  const worker = await createWorker('eng');
  
  try {
    console.log(`[extractTextWithOCR] Processing image: ${path.basename(filePath)}`);
    const result = await worker.recognize(filePath);
    
    if (!result?.data?.text?.trim()) {
      throw new Error('No text could be extracted from the image');
    }
    
    console.log(`[extractTextWithOCR] Successfully extracted ${result.data.text.length} characters`);
    return result.data.text.trim();
    
  } catch (error) {
    console.error('[extractTextWithOCR] Error during OCR processing:', error.message);
    throw new Error(`OCR processing failed: ${error.message}`);
  } finally {
    await worker.terminate().catch(e => 
      console.warn('[extractTextWithOCR] Error terminating worker:', e.message)
    );
  }
};

// Master function to extract text with fallback
const extractTextFromFile = async (filePath, mimeType) => {
  console.log(`[extractTextFromFile] Starting extraction for ${mimeType} file: ${filePath}`);
  
  try {
    // Handle PDF files
    if (mimeType === 'application/pdf') {
      return await extractTextFromPDF(filePath);
    }
    
    // Handle image files with OCR
    if (['image/png', 'image/jpeg', 'image/jpg'].includes(mimeType)) {
      return await extractTextWithOCR(filePath, mimeType);
    }
    
    // Handle Word documents
    if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        mimeType === 'application/msword') {
      console.log('[extractTextFromFile] Extracting text from Word document...');
      const result = await mammoth.extractRawText({ path: filePath });
      return result.value;
    }
    
    // Handle plain text files
    if (mimeType === 'text/plain') {
      console.log('[extractTextFromFile] Reading plain text file...');
      return await fs.readFile(filePath, 'utf-8');
    }
    
    throw new Error(`Unsupported file type: ${mimeType}`);
    
  } catch (error) {
    console.error('[extractTextFromFile] Extraction failed:', error.message);
    
    // If it's a PDF and the main method failed, try a last-ditch effort
    if (mimeType === 'application/pdf') {
      try {
        console.log('[extractTextFromFile] Trying fallback PDF text extraction...');
        const buffer = await fs.readFile(filePath);
        return buffer.toString('utf8');
      } catch (fallbackError) {
        console.error('[extractTextFromFile] Fallback extraction failed:', fallbackError.message);
      }
    }
    
    throw new Error(`Failed to extract text: ${error.message}`);
  }
};

// --- Multer Upload Config ---
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});

const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } });
const uploadMiddleware = upload.single('file');

// --- Handlers ---

const listLearningPacksHandler = async (req, res) => {
  try {
    const { subject_id } = req.query;
    if (subject_id) {
      const packs = await getLearningPacksBySubject(subject_id);
      return res.json({ success: true, data: packs });
    }

    const { supabaseAdmin } = await import('../config/supabaseClient.js');
    const { data, error } = await supabaseAdmin
      .from('learning_packs')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json({ success: true, data: data || [] });
  } catch (err) {
    console.error('[Backend] List learning packs error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

const getLearningPackHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const pack = await getLearningPackWithSubject(id);
    if (!pack) return res.status(404).json({ success: false, error: 'Learning pack not found' });
    res.json({ success: true, data: pack });
  } catch (err) {
    console.error('[Backend] Get learning pack error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

const createLearningPackHandler = async (req, res) => {
  try {
    const { subject_id, grade, title, title_si, title_ta, difficulty, description, is_active } = req.body;
    if (!subject_id || !grade || !title)
      return res.status(400).json({ success: false, error: 'subject_id, grade, and title are required' });

    const gradeNum = Number(grade);
    if (!Number.isInteger(gradeNum) || gradeNum < 6 || gradeNum > 11)
      return res.status(400).json({ success: false, error: 'grade must be an integer between 6 and 11' });

    const pack = await createLearningPack({
      subject_id,
      grade: gradeNum,
      title,
      title_si,
      title_ta,
      difficulty: difficulty || 'Medium',
      description: description || '',
      is_active: is_active !== false
    });

    res.status(201).json({ success: true, data: pack });
  } catch (err) {
    console.error('[Backend] Create learning pack error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

const analyzeDocumentHandler = async (req, res) => {
  await ensureUploadDir();
  uploadMiddleware(req, res, async (err) => {
    try {
      if (err) return res.status(400).json({ success: false, error: err.message });
      if (!req.file) return res.status(400).json({ success: false, error: 'No file uploaded' });

      // Direct-to-Gemini flow (Option A): send uploaded file to Gemini to generate a Learning Pack
      console.log('[Analyze] Preparing file for Gemini...');
      const fileBuffer = await fs.readFile(req.file.path);
      const base64Data = fileBuffer.toString('base64');
      const mimeType = req.file.mimetype;

      // Request multiple learning packs (one per detected chapter/section)
      console.log('[Analyze] Sending to Gemini for chapters...');
      const packs = await generateLearningPacksFromBase64(base64Data, mimeType);

      // Clean up the uploaded file
      await fs.unlink(req.file.path).catch(console.error);

      // Normalize and return packs only (no questions at this stage)
      const learningPacks = Array.isArray(packs) && packs.length > 0
        ? packs.map((p, i) => ({
            title: String(p.title || `Chapter ${i + 1}`),
            content: String(p.content || ''),
            order: p.order || (i + 1),
            language: p.language || 'English'
          }))
        : [{ title: 'Chapter 1: Document Content', content: 'No content available', order: 1, language: 'English' }];

      const language = learningPacks[0]?.language || 'English';

      res.json({
        success: true,
        data: learningPacks,
        language,
        stats: {
          chapters: learningPacks.length,
          learningPacks: learningPacks.length,
          totalWords: learningPacks.reduce((sum, p) => sum + (p.content?.split(/\s+/)?.length || 0), 0)
        }
      });
    } catch (error) {
      console.error('Document analysis error:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  });
};

// --- Exports ---
export {
  listLearningPacksHandler,
  getLearningPackHandler,
  createLearningPackHandler,
  analyzeDocumentHandler,
  generateQuestionsForPackHandler
};
