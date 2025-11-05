import { promises as fs } from 'fs';
import path from 'path';
import multer from 'multer';
import { 
  getLearningPacksBySubject,
  getLearningPackWithSubject,
  createLearningPack
} from '../services/learningPackService.js';
import { generateLearningPacksFromBase64, generateQuestions } from '../services/geminiService.js';

const UPLOAD_DIR = path.join(process.cwd(), 'uploads');
const ensureUploadDir = () => fs.mkdir(UPLOAD_DIR, { recursive: true });

// Multer configuration
const upload = multer({ 
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOAD_DIR),
    filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
  }),
  limits: { fileSize: 50 * 1024 * 1024 }
});

// Generate questions from learning pack content
const generateQuestionsForPackHandler = async (req, res) => {
  try {
    const { content, language = 'English', count = 10, difficulty = 'Intermediate', types = ['MCQ', 'FIIB', 'TF', 'HOQ'], bloom_level = 'Understand' } = req.body;
    
    if (!content?.trim() || content.length < 20) {
      return res.status(400).json({ success: false, error: 'Invalid or missing learning pack content' });
    }

    const questions = await generateQuestions(content, { count, difficulty, types, language, bloom_level });
    res.json({ success: true, questions, stats: { questions: questions?.length || 0 } });
  } catch (err) {
    console.error('[Backend] Generate questions error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// List all learning packs
const listLearningPacksHandler = async (req, res) => {
  try {
    const { subject_id } = req.query;
    if (subject_id) {
      const packs = await getLearningPacksBySubject(subject_id);
      return res.json({ success: true, data: packs });
    }

    const { supabaseAdmin } = await import('../config/supabaseClient.js');
    const { data, error} = await supabaseAdmin
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

// Get single learning pack
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

// Create new learning pack
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

// Analyze document and generate learning packs using Gemini
const analyzeDocumentHandler = async (req, res) => {
  await ensureUploadDir();
  upload.single('file')(req, res, async (err) => {
    try {
      if (err) return res.status(400).json({ success: false, error: err.message });
      if (!req.file) return res.status(400).json({ success: false, error: 'No file uploaded' });

      const fileBuffer = await fs.readFile(req.file.path);
      const base64Data = fileBuffer.toString('base64');
      const packs = await generateLearningPacksFromBase64(base64Data, req.file.mimetype);

      // Clean up uploaded file
      await fs.unlink(req.file.path).catch(console.error);

      // Normalize packs with duration calculation
      const learningPacks = Array.isArray(packs) && packs.length > 0
        ? packs.map((p, i) => {
            const content = String(p.content || '');
            const wordCount = content.split(/\s+/).filter(w => w.length > 0).length;
            // Calculate duration: 5 minutes per 200 words, minimum 5 minutes
            const duration = Math.max(5, Math.ceil(wordCount / 200) * 5);
            
            return {
              title: String(p.title || `Chapter ${i + 1}`),
              content: content,
              order: p.order || (i + 1),
              language: p.language || 'English',
              duration: duration
            };
          })
        : [{ 
            title: 'Chapter 1: Document Content', 
            content: 'No content available', 
            order: 1, 
            language: 'English',
            duration: 10
          }];

      res.json({
        success: true,
        data: learningPacks,
        language: learningPacks[0]?.language || 'English',
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

export {
  listLearningPacksHandler,
  getLearningPackHandler,
  createLearningPackHandler,
  analyzeDocumentHandler,
  generateQuestionsForPackHandler
};