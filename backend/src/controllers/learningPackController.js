// Core Node.js modules
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Third-party imports
import fetch from 'node-fetch';
import mammoth from 'mammoth';
import multer from 'multer';
import { createWorker } from 'tesseract.js';

// Local imports
import { 
  getLearningPacksBySubject,
  getLearningPackWithSubject,
  createLearningPack
} from '../services/learningPackService.js';

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

// Simple language detector
const detectLanguage = (text) => {
  const tamilChars = text.match(/[\u0B80-\u0BFF]/g) || [];
  const sinhalaChars = text.match(/[\u0D80-\u0DFF]/g) || [];
  if (tamilChars.length > sinhalaChars.length && tamilChars.length > 10) return 'Tamil';
  else if (sinhalaChars.length > 10) return 'Sinhala';
  return 'English';
};

// Enhanced document structure analysis
const analyzeDocumentStructure = (text, language) => {
  const maxTextLength = 100000; // Increased limit for better content handling
  const limitedText = text.length > maxTextLength 
    ? text.substring(0, maxTextLength) + '... [content truncated]' 
    : text;

  // Common patterns for chapter/section headers
  const chapterPatterns = [
    /^(chapter|unit|section|part)[\s:]+(\d+|[IVXLCDM]+)/i,  // Chapter 1, Unit I, etc.
    /^\d+[\s\.]\s*[A-Z][^\n]{5,}/,  // 1. Introduction
    /^[A-Z][A-Z\s]{10,}$/  // UPPERCASE HEADER
  ];

  const lines = limitedText.split('\n');
  const chapters = [];
  let currentChapter = null;
  let currentContent = [];

  const addChapter = (title, content) => {
    if (title && content.trim()) {
      // Extract topics from content
      const topicPattern = /^\s*(\d+\.\d+|\(?[a-z]\)|[-•*])\s*([^\n]+)/gmi;
      const topics = [];
      let topicMatch;
      
      while ((topicMatch = topicPattern.exec(content)) !== null) {
        topics.push({
          title: topicMatch[2].trim(),
          content: ''
        });
      }

      chapters.push({
        title: title.trim(),
        content: content.trim(),
        topics: topics.length > 0 ? topics : undefined,
        order: chapters.length + 1
      });
    }
  };

  for (const line of lines) {
    const isChapter = chapterPatterns.some(pattern => pattern.test(line));
    
    if (isChapter) {
      if (currentChapter) {
        addChapter(currentChapter, currentContent.join('\n'));
      }
      currentChapter = line;
      currentContent = [];
    } else if (currentChapter) {
      currentContent.push(line);
    }
  }

  // Add the last chapter
  if (currentChapter) {
    addChapter(currentChapter, currentContent.join('\n'));
  }

  // If no chapters found, create a single chapter with the whole content
  if (chapters.length === 0) {
    addChapter(
      language === 'Sinhala' ? 'ප්‍රධාන අංග' :
      language === 'Tamil' ? 'முக்கிய பகுதி' : 
      'Document Content',
      limitedText.substring(0, 2000)
    );
  }

  return chapters;
};

// Generate learning packs from chapters with better content organization
const generateLearningPacks = (chapters, language) => {
  const difficultyLevels = {
    English: ['Beginner', 'Intermediate', 'Advanced'],
    Sinhala: ['ආරම්භක', 'මධ්‍යම', 'උසස්'],
    Tamil: ['தொடக்கநிலை', 'இடைநிலை', 'மேம்பட்ட']
  };

  const difficulties = difficultyLevels[language] || difficultyLevels.English;
  const now = Date.now();

  return chapters.map((chapter, index) => {
    const difficultyIndex = Math.min(
      Math.floor(index / Math.max(1, Math.ceil(chapters.length / 3))), 
      difficulties.length - 1
    );
    const difficulty = difficulties[difficultyIndex];

    // Extract key concepts from chapter content
    const content = chapter.content.toLowerCase();
    const commonWords = new Set(['the', 'and', 'for', 'are', 'with', 'this', 'that', 'from', 'have', 'which']);
    const wordFreq = {};
    
    // Simple word frequency analysis
    content.split(/\s+/).forEach(word => {
      word = word.replace(/[^\w]/g, '');
      if (word.length > 4 && !commonWords.has(word)) {
        wordFreq[word] = (wordFreq[word] || 0) + 1;
      }
    });

    // Get top 5 most frequent meaningful words as key concepts
    const keyConcepts = Object.entries(wordFreq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([word]) => word.charAt(0).toUpperCase() + word.slice(1));

    // Use topics if available, otherwise generate from content
    const topics = chapter.topics?.map(t => t.title) || 
      content.split('.')
        .slice(0, 3)
        .map(s => s.trim())
        .filter(s => s.length > 10 && s.length < 150);

    return {
      id: `pack-${now}-${index}`,
      title: chapter.title,
      description: keyConcepts.length > 0 
        ? `Covers: ${keyConcepts.join(', ')}`
        : `Learning pack for ${chapter.title}`,
      duration: Math.max(10, Math.min(60, Math.ceil(chapter.content.length / 1000) * 2)), // 2 min per 1000 chars
      topics: topics.length > 0 ? topics : [chapter.title],
      difficulty,
      order: index + 1,
      language,
      contentPreview: chapter.content.substring(0, 250).trim() + (chapter.content.length > 250 ? '...' : ''),
      totalChapters: chapters.length,
      chapterNumber: index + 1
    };
  });
};

// --- File Text Extraction Functions ---

// pdf-parse extraction (Node ESM compatible)
const extractTextWithPDFParse = async (filePath) => {
  const pdfParseModule = await import('pdf-parse');
  const pdfParse = pdfParseModule.default || pdfParseModule;
  const dataBuffer = await fs.readFile(filePath);

  const data = await pdfParse(dataBuffer);
  if (data.text && data.text.trim()) return data.text;

  throw new Error('No text content found in PDF');
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

      const text = await extractTextFromFile(req.file.path, req.file.mimetype);
      const language = detectLanguage(text);
      const chapters = analyzeDocumentStructure(text, language);
      const learningPacks = generateLearningPacks(chapters, language);

      await fs.unlink(req.file.path).catch(() => {});
      res.json({ success: true, data: learningPacks, language });
    } catch (error) {
      console.error('[Backend] Document analysis error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });
};

// --- Exports ---
export {
  listLearningPacksHandler,
  getLearningPackHandler,
  createLearningPackHandler,
  analyzeDocumentHandler
};
