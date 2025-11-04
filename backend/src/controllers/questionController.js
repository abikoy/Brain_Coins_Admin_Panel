/**
 * BACKEND - Question Controller
 * Handles HTTP requests related to questions
 */

import { generateQuestions, generateQuestionsFromFile, generateSummaryFromFile } from '../services/geminiService.js';
import { 
  saveQuestions, 
  getAllQuestions, 
  updateQuestion,
  deleteQuestion,
  updateQuestionDifficulty
} from '../services/supabaseService.js';
import { getLearningPackWithSubject, createLearningPack } from '../services/learningPackService.js';
import { getSummaryByPack, upsertSummaryByPack } from '../services/supabaseService.js';

/**
 * POST /api/questions/generate
 * Generate questions using Gemini AI from text content
 */
export const generateQuestionsHandler = async (req, res) => {
  try {
    const { content, count, pack_id, difficulty, type } = req.body;

    if (!content || !pack_id) {
      return res.status(400).json({
        success: false,
        error: 'Content and pack_id are required'
      });
    }

    // Generate questions using AI
    const questions = await generateQuestions(content, {
      count: Math.min(parseInt(count) || 5, 20),
      difficulty: difficulty || 'Medium',
      type: type || 'MCQ'
    });

    // Add pack_id and other required fields to each question
    const questionsToSave = questions.map(q => ({
      ...q,
      pack_id,
      question_text: q.question,
      correct_answer: q.answer,
      display_order: 0,
      has_diagram: false,
      blooms_taxonomy: 'Remember',
      metadata: q.metadata || {}
    }));

    // Save questions to database
    const savedQuestions = await saveQuestions(questionsToSave);

    res.json({
      success: true,
      questions: savedQuestions,
      count: savedQuestions.length
    });

  } catch (error) {
    console.error('[Backend] Generate questions error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate questions',
      code: error.code || 'GENERATION_ERROR'
    });
  }
};

/**
 * POST /api/questions
 * Create a single manual question
 */
export const createQuestionHandler = async (req, res) => {
  try {
    const {
      pack_id,
      type = 'MCQ',
      difficulty = 'Medium',
      question = '',
      answer = '',
      options = [],
      language = 'English',
      blooms_taxonomy = 'Understand'
    } = req.body || {};

    if (!pack_id || !question) {
      return res.status(400).json({ success: false, error: 'pack_id and question are required' });
    }

    const qt = type || 'MCQ';
    const base = {
      pack_id,
      question_type: qt,
      options: Array.isArray(options) ? options : [],
      correct_answer: answer || '',
      explanation: req.body.explanation || '',
      explanation_si: req.body.explanation_si || null,
      explanation_ta: req.body.explanation_ta || null,
      has_diagram: false,
      diagram_path: null,
      blooms_taxonomy,
      display_order: req.body.display_order || 0,
      difficulty,
      generated: false
    };

    let row;
    if (language === 'Sinhala') {
      row = { ...base, question_text: '', question_text_si: question, question_text_ta: null };
    } else if (language === 'Tamil') {
      row = { ...base, question_text: '', question_text_si: null, question_text_ta: question };
    } else {
      row = { ...base, question_text: question, question_text_si: null, question_text_ta: null };
    }

    const [saved] = await saveQuestions([row]);

    return res.status(201).json({ success: true, question: saved });
  } catch (error) {
    console.error('[Backend] Create question error:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to create question' });
  }
};
/**
 * POST /api/questions/preview-from-file
 * Generate preview (questions + summary) from uploaded file without saving
 */
export const generatePreviewFromFileHandler = async (req, res) => {
  try {
    const { fileUrl, fileType, language, grade, subject, counts, difficulty, types, bloom_level } = req.body || {};

    if (!fileUrl || !fileType) {
      return res.status(400).json({ success: false, error: 'fileUrl and fileType are required' });
    }

    // Normalize per-type counts
    const allowedTypes = ['MCQ', 'FIIB', 'TF', 'HOQ'];
    // Use questionTypes if counts is not provided (for backward compatibility)
    const countsObj = (counts || req.body.questionTypes || {});
    
    // Debug log to see what we're receiving
    console.log('Received counts object:', counts);
    console.log('Parsed counts object:', countsObj);
    
    // Ensure we have valid counts for each type
    const normalizedCounts = {};
    let hasValidCounts = false;
    
    for (const type of allowedTypes) {
      const count = parseInt(countsObj[type], 10);
      if (!isNaN(count) && count > 0) {
        normalizedCounts[type] = count;
        hasValidCounts = true;
      } else {
        normalizedCounts[type] = 0;
      }
    }
    
    console.log('Normalized counts:', normalizedCounts);
    
    // Get requested types with counts > 0
    const requestedTypes = allowedTypes.filter(t => normalizedCounts[t] > 0);
    
    if (!hasValidCounts) {
      return res.status(400).json({
        success: false,
        error: 'At least one question type with count > 0 is required',
        receivedCounts: counts,
        normalizedCounts
      });
    }

    // Calculate total questions needed
    const totalRequested = requestedTypes.reduce((sum, t) => sum + normalizedCounts[t], 0);
    
    console.log('Requested types:', requestedTypes);
    console.log('Total questions requested:', totalRequested);
    
    // Generate questions with exact counts per type
    const gen = await generateQuestionsFromFile(fileUrl, fileType, {
      count: totalRequested, // Use exact count requested
      difficulty: difficulty || 'Medium',
      types: requestedTypes,
      counts: normalizedCounts, // Pass the exact counts per type
      language: language || 'English',
      grade: grade || 'Unknown',
      subject: subject || 'Unknown',
      bloom_level: bloom_level || 'Understand'
    });

    if (!Array.isArray(gen) || gen.length === 0) {
      return res.status(500).json({
        success: false,
        error: 'Failed to generate any questions. Please try again.'
      });
    }

    // Group questions by type
    const questionsByType = { MCQ: [], FIIB: [], TF: [], HOQ: [] };
    gen.forEach(question => {
      const type = (question.type || question.question_type || 'MCQ').toUpperCase();
      if (questionsByType[type]) {
        questionsByType[type].push(question);
      }
    });

    // Select the requested number of each type
    const selected = [];
    const typeStats = {};
    
    for (const type of requestedTypes) {
      const requestedCount = normalizedCounts[type];
      const available = questionsByType[type] || [];
      const countToTake = Math.min(available.length, requestedCount);
      
      selected.push(...available.slice(0, countToTake));
      typeStats[type] = {
        requested: requestedCount,
        generated: available.length,
        selected: countToTake
      };
      
      // Log if we couldn't get enough of this type
      if (countToTake < requestedCount) {
        console.warn(`[Backend] Could only generate ${countToTake} out of ${requestedCount} requested ${type} questions`);
      }
    }
    
    console.log('[Backend] Question generation stats:', typeStats);

    // Use provided metadata from request instead of extracting from questions
    const detected_metadata = {
      language: language || 'English',
      grade: grade || 'Unknown',
      subject: subject || 'Unknown',
      topics: []
    };
    
    console.log('[Backend] Using provided metadata:', detected_metadata);

    // Generate summary (preview)
    const summary_bullets = await generateSummaryFromFile(fileUrl, fileType, language || 'English');

    return res.json({
      success: true,
      preview: {
        detected_metadata,
        summary_bullets,
        counts: normalizedCounts,
        totals: {
          requested: totalRequested,
          generated: Array.isArray(gen) ? gen.length : 0,
          selected: selected.length
        },
        questions: selected
      }
    });
  } catch (error) {
    console.error('[Backend] Preview from file error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Failed to generate preview' });
  }
};

/**
 * POST /api/questions/generate-from-file
 * Generate questions from uploaded file using Gemini Vision API
 */
export const generateQuestionsFromFileHandler = async (req, res) => {
  try {
    const { fileUrl, fileType, pack_id, count, difficulty, types, language, bloom_level } = req.body;

    // Validate file inputs
    if (!fileUrl || !fileType) {
      return res.status(400).json({
        success: false,
        error: 'fileUrl and fileType are required'
      });
    }

    let effectivePackId = pack_id;
    let learningPack;

    // If no pack_id is provided, attempt to create a learning pack from payload
    if (!effectivePackId) {
      const { subject_id, grade, pack_title, pack_description, pack_difficulty } = req.body;

      if (!subject_id || !grade) {
        return res.status(400).json({
          success: false,
          error: 'Either pack_id must be provided, or subject_id and grade are required to create a learning pack'
        });
      }

      const title = pack_title || `Auto Pack - ${new Date().toLocaleDateString()}`;

      const createdPack = await createLearningPack({
        subject_id,
        grade,
        title,
        description: pack_description || 'Auto-created for AI question generation',
        difficulty: pack_difficulty || difficulty || 'Medium',
        is_active: true
      });

      effectivePackId = createdPack.id;
      learningPack = await getLearningPackWithSubject(effectivePackId);
    } else {
      // Verify the provided learning pack exists
      learningPack = await getLearningPackWithSubject(effectivePackId);
      if (!learningPack) {
        return res.status(404).json({
          success: false,
          error: 'Learning pack not found'
        });
      }
    }

    console.log('[Backend] Generating questions from file:', { fileUrl, fileType });

    // Generate questions from file
    const allowedTypes = ['MCQ','FIIB','TF','HOQ'];
    const reqTypes = Array.isArray(types) && types.length ? types : allowedTypes;
    const filteredTypes = reqTypes.filter(t => allowedTypes.includes(t));

    const questions = await generateQuestionsFromFile(fileUrl, fileType, {
      count: Math.min(parseInt(count) || 5, 20),
      difficulty: difficulty || learningPack.difficulty || 'Medium',
      types: filteredTypes.length ? filteredTypes : allowedTypes,
      language,
      bloom_level
    });

    // Add pack_id and other required fields to each question
    const questionsToSave = questions.map((q, idx) => {
      const qt = q.type || q.question_type || 'MCQ';
      const base = {
        pack_id: effectivePackId,
        question_type: qt,
        options: Array.isArray(q.options) ? q.options : [],
        correct_answer: q.answer || q.correct_answer || '',
        explanation: q.explanation || q.reasoning || '',
        explanation_si: q.explanation_si || null,
        explanation_ta: q.explanation_ta || null,
        has_diagram: false,
        diagram_path: null,
        blooms_taxonomy: q.blooms_taxonomy || bloom_level || 'Understand',
        display_order: idx + 1,
        difficulty: q.difficulty || difficulty || learningPack.difficulty || 'Medium',
        generated: true
      };
      // Language-specific question text fields
      if (language === 'Sinhala') {
        return { ...base, question_text: '', question_text_si: q.question || q.question_text || '', question_text_ta: null };
      } else if (language === 'Tamil') {
        return { ...base, question_text: '', question_text_si: null, question_text_ta: q.question || q.question_text || '' };
      }
      return { ...base, question_text: q.question || q.question_text || '', question_text_si: null, question_text_ta: null };
    });

    // Save questions to database
    const savedQuestions = await saveQuestions(questionsToSave);

    // Generate 5-8 bullet summary based on uploaded file
    const summary_bullets = await generateSummaryFromFile(fileUrl, fileType, language || 'English');

    // Persist summary into pack_sections (section_type='summary') if we have bullets
    let saved_summary = null;
    if (Array.isArray(summary_bullets) && summary_bullets.length) {
      try {
        saved_summary = await upsertSummaryByPack(effectivePackId, summary_bullets);
      } catch (e) {
        console.error('[Backend] Persist summary error:', e);
      }
    }

    res.json({
      success: true,
      questions: savedQuestions,
      summary_bullets,
      saved_summary,
      count: savedQuestions.length,
      pack_id: effectivePackId,
      subject_id: learningPack.subject_id,
      source: 'file',
      fileType
    });

  } catch (error) {
    console.error('[Backend] Generate from file error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate questions from file',
      code: error.code || 'FILE_PROCESSING_ERROR'
    });
  }
};

/**
 * GET /api/questions
 * Get all questions
 */
export const getAllQuestionsHandler = async (req, res) => {
  try {
    const { 
      pack_id, 
      subject_id, 
      type, 
      difficulty, 
      page = 1, 
      limit = 20 
    } = req.query;

    const { data: questions, count } = await getAllQuestions({
      pack_id,
      subject_id,
      type,
      difficulty,
      page: parseInt(page),
      limit: Math.min(parseInt(limit), 100)
    });
    
    res.json({
      success: true,
      data: questions,
      pagination: {
        page: parseInt(page),
        limit: Math.min(parseInt(limit), 100),
        total: count,
        pages: Math.ceil(count / Math.min(parseInt(limit), 100))
      }
    });
  } catch (error) {
    console.error('[Backend] Get questions error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      code: error.code || 'FETCH_ERROR'
    });
  }
};

/**
 * PATCH /api/questions/:id
 * Update entire question
 */
export const updateQuestionHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Remove non-updatable fields and strip UI-only fields
    const {
      id: _ignore,
      created_at,
      pack_id,
      question: uiQuestion,
      answer: uiAnswer,
      type: uiType,
      ...rest
    } = updates;

    // Map UI fields to DB columns and avoid passing unknown columns
    const { type: _dropType, ...restWithoutType } = rest;
    const mappedUpdates = {
      ...restWithoutType,
      ...(uiQuestion && { question_text: uiQuestion }),
      ...(uiAnswer && { correct_answer: uiAnswer }),
      ...(uiType && { question_type: uiType })
    };

    const updatedQuestion = await updateQuestion(id, mappedUpdates);

    res.json({
      success: true,
      question: updatedQuestion
    });
  } catch (error) {
    console.error(`[Backend] Update question ${req.params.id} error:`, error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update question',
      code: error.code || 'UPDATE_ERROR'
    });
  }
};

/**
 * PATCH /api/questions/:id/difficulty
 * Update question difficulty only
 */
export const updateQuestionDifficultyHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const { difficulty } = req.body;

    if (!difficulty) {
      return res.status(400).json({
        success: false,
        error: 'Difficulty is required'
      });
    }

    console.log('[Backend] Updating difficulty:', id, difficulty);

    const updatedQuestion = await updateQuestionDifficulty(id, difficulty);

    res.json({
      success: true,
      question: updatedQuestion
    });
  } catch (error) {
    console.error('[Backend] Update difficulty error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update difficulty'
    });
  }
};

/**
 * DELETE /api/questions/:id
 * Delete question
 */
export const deleteQuestionHandler = async (req, res) => {
  try {
    const { id } = req.params;

    console.log('[Backend] Deleting question:', id);

    await deleteQuestion(id);

    res.json({
      success: true,
      message: 'Question deleted successfully'
    });
  } catch (error) {
    console.error('[Backend] Delete question error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to delete question'
    });
  }
};

// Note: default export moved to the end of file after all handlers are defined

/**
 * GET /api/summaries/:pack_id
 */
export const getSummaryByPackHandler = async (req, res) => {
  try {
    const { pack_id } = req.params;
    if (!pack_id) return res.status(400).json({ success: false, error: 'pack_id is required' });
    const data = await getSummaryByPack(pack_id);
    res.json({ success: true, data: data || { pack_id, bullets: [] } });
  } catch (error) {
    console.error('[Backend] Get summary error:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to fetch summary' });
  }
};

/**
 * PUT /api/summaries/:pack_id
 * Body: { bullets: string[] }
 */
export const upsertSummaryByPackHandler = async (req, res) => {
  try {
    const { pack_id } = req.params;
    const { bullets } = req.body || {};
    if (!pack_id) return res.status(400).json({ success: false, error: 'pack_id is required' });
    if (!Array.isArray(bullets)) {
      return res.status(400).json({ success: false, error: 'bullets must be an array of strings' });
    }
    // Normalize and cap to 20
    const normalized = bullets
      .map(b => (typeof b === 'string' ? b.trim() : ''))
      .filter(Boolean)
      .slice(0, 20);
    const data = await upsertSummaryByPack(pack_id, normalized);
    res.json({ success: true, data });
  } catch (error) {
    console.error('[Backend] Upsert summary error:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to save summary' });
  }
};

/**
 * POST /api/questions/approve-from-preview
 * Save questions that were previously previewed
 */
export const approveFromPreviewHandler = async (req, res) => {
  console.log('[Backend] Approving questions from preview:', {
    pack_id: req.body.pack_id,
    questions_count: req.body.questions?.length || 0,
    has_summary: !!req.body.summary
  });

  try {
    const { pack_id, questions, summary } = req.body;

    if (!pack_id) {
      console.error('[Backend] Missing pack_id in request body');
      return res.status(400).json({
        success: false,
        error: 'pack_id is required'
      });
    }

    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      console.error('[Backend] No valid questions array provided');
      return res.status(400).json({
        success: false,
        error: 'questions array is required and must not be empty'
      });
    }

    console.log(`[Backend] Preparing to save ${questions.length} questions for pack ${pack_id}`);
    
    // Format questions for saving with all required fields
    const questionsToSave = questions.map((q, index) => {
      const questionData = {
        pack_id,
        question_type: q.question_type || 'MCQ',
        question_text: q.question || `Question ${index + 1}`,
        correct_answer: q.answer || '',
        options: Array.isArray(q.options) ? q.options : [],
        explanation: q.explanation || '',
        has_diagram: false,
        diagram_path: null,
        blooms_taxonomy: q.bloom || 'Remember',
        display_order: index,
        difficulty: q.difficulty || 'Medium',
        generated: true,
        created_at: new Date().toISOString(),
        metadata: q.metadata || {}
      };
      
      // Log first question for debugging
      if (index === 0) {
        console.log('[Backend] First question to save (sample):', {
          pack_id: questionData.pack_id,
          question_type: questionData.question_type,
          question_text: questionData.question_text.substring(0, 50) + '...',
          correct_answer: questionData.correct_answer ? '***' : 'MISSING',
          options_count: questionData.options.length,
          difficulty: questionData.difficulty
        });
      }
      
      return questionData;
    });

    console.log('[Backend] Saving questions to database...');
    const savedQuestions = await saveQuestions(questionsToSave);
    console.log(`[Backend] Successfully saved ${savedQuestions.length} questions`);

    // Save summary if provided
    if (summary && Array.isArray(summary) && summary.length > 0) {
      console.log('[Backend] Saving summary with', summary.length, 'bullets');
      await upsertSummaryByPack(pack_id, summary);
    }

    // Prepare response to match frontend expectations
    const response = {
      success: true,
      questions: savedQuestions,
      count: savedQuestions.length,
      pack_id: pack_id
    };

    // Include summary in response if it was saved
    if (summary && Array.isArray(summary) && summary.length > 0) {
      response.saved_summary = {
        bullets: summary,
        pack_id: pack_id
      };
    }

    res.status(201).json(response);
  } catch (error) {
    console.error('[Backend] Approve from preview error:', {
      message: error.message,
      stack: error.stack,
      response: error.response?.data
    });
    
    res.status(500).json({
      success: false,
      error: 'Failed to approve questions',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

