import multer from 'multer';
import {
  getLearningPacksBySubject,
  getLearningPackWithSubject,
  createLearningPack
} from '../services/learningPackService.js';
import { generateLearningPacksFromBase64, generateQuestions } from '../services/geminiService.js';

// Multer configuration - Use memory storage for Vercel (serverless)
const upload = multer({
  storage: multer.memoryStorage(),
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
// In createLearningPackHandler, update the grade validation:
const createLearningPackHandler = async (req, res) => {
  try {
    const { subject_id, grade, title, title_si, title_ta, difficulty, description, is_active, language } = req.body;
    if (!subject_id || !grade || !title)
      return res.status(400).json({ success: false, error: 'subject_id, grade, and title are required' });
    console.log('Creating pack ', req.body);
    // ACCEPT STRING GRADES: "Grade 6", "Grade 7", etc.
    const validGrades = ['Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11'];

    if (!validGrades.includes(grade)) {
      return res.status(400).json({
        success: false,
        error: 'grade must be in format: Grade 6, Grade 7, ..., Grade 11'
      });
    }
    const validLanguages = ['en', 'si', 'ta'];
    const finalLanguage = validLanguages.includes(language) ? language : 'en';
    const pack = await createLearningPack({
      subject_id,
      grade: grade, // Store the string "Grade 11" directly

      title,
      title_si,
      title_ta,
      difficulty: difficulty || 'Easy',
      description: description || '',
      language: finalLanguage,
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
  try {
    const { file_url } = req.body;

    if (!file_url) {
      return res.status(400).json({ success: false, error: 'file_url is required' });
    }

    const t0 = Date.now();
    // Download the document from Supabase (or other storage) using the public URL
    const response = await fetch(file_url);
    const t1 = Date.now();

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      return res.status(400).json({
        success: false,
        error: `Failed to download file from URL: ${response.status}`,
        details: text?.slice(0, 200),
      });
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Data = buffer.toString('base64');
    const contentType = response.headers.get('content-type') || 'application/pdf';

    const t2 = Date.now();
    const packs = await generateLearningPacksFromBase64(base64Data, contentType);
    const t3 = Date.now();

    console.log('[AnalyzeDocument] Timings (ms):', {
      download: t1 - t0,
      bufferToBase64: t2 - t1,
      generateLearningPacks: t3 - t2,
      total: t3 - t0,
    });

    // Normalize packs with duration calculation and difficulty
    const learningPacks = Array.isArray(packs) && packs.length > 0
      ? packs.map((p, i) => {
        const content = String(p.content || '');
        const wordCount = content.split(/\s+/).filter(w => w.length > 0).length;
        // 5 minutes per 200 words, minimum 5 minutes
        const duration = Math.max(5, Math.ceil(wordCount / 200) * 5);

        return {
          title: String(p.title || `Learning Pack ${i + 1}`),
          content,
          order: p.order || (i + 1),
          language: p.language || 'English',
          difficulty: p.difficulty || 'Easy',
          duration,
        };
      })
      : [{
        title: 'Learning Pack 1: Document Content',
        content: 'No content available',
        order: 1,
        language: 'English',
        difficulty: 'Easy',
        duration: 10,
      }];

    res.json({
      success: true,
      data: learningPacks,
      language: learningPacks[0]?.language || 'English',
      stats: {
        chapters: learningPacks.length,
        learningPacks: learningPacks.length,
        totalWords: learningPacks.reduce(
          (sum, p) => sum + (p.content?.split(/\s+/)?.length || 0),
          0
        ),
      },
    });
  } catch (error) {
    console.error('Document analysis error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
};

// Start async document analysis job (short request)
const startAnalyzeDocumentHandler = async (req, res) => {
  try {
    const { file_url } = req.body || {};

    if (!file_url) {
      return res.status(400).json({ success: false, error: 'file_url is required' });
    }

    const { supabaseAdmin } = await import('../config/supabaseClient.js');

    const { data, error } = await supabaseAdmin
      .from('document_analysis_jobs')
      .insert([{
        file_url,
        status: 'pending',
        result: null,
        error: null,
      }])
      .select()
      .single();

    if (error) {
      throw error;
    }

    return res.json({ success: true, jobId: data.id });
  } catch (err) {
    console.error('[Backend] Start analyze document job error:', err);
    return res.status(500).json({ success: false, error: err.message || 'Failed to start analysis job' });
  }
};

// Get async document analysis job status/result
const getAnalyzeJobStatusHandler = async (req, res) => {
  try {
    const { id } = req.params || {};

    if (!id) {
      return res.status(400).json({ success: false, error: 'Job id is required' });
    }

    const { supabaseAdmin } = await import('../config/supabaseClient.js');

    const { data, error } = await supabaseAdmin
      .from('document_analysis_jobs')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      throw error;
    }

    if (!data) {
      return res.status(404).json({ success: false, error: 'Job not found' });
    }

    return res.json({
      success: true,
      status: data.status,
      result: data.result,
      error: data.error,
    });
  } catch (err) {
    console.error('[Backend] Get analyze document job status error:', err);
    return res.status(500).json({ success: false, error: err.message || 'Failed to fetch job status' });
  }
};

export {
  listLearningPacksHandler,
  getLearningPackHandler,
  createLearningPackHandler,
  analyzeDocumentHandler,
  startAnalyzeDocumentHandler,
  getAnalyzeJobStatusHandler,
  generateQuestionsForPackHandler
};