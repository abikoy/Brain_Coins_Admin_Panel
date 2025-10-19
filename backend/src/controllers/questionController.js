/**
 * BACKEND - Question Controller
 * Handles HTTP requests related to questions
 */

import { generateQuestions, generateQuestionsFromFile } from '../services/geminiService.js';
import { 
  saveQuestions, 
  getAllQuestions, 
  updateQuestion,
  updateQuestionDifficulty, 
  deleteQuestion 
} from '../services/supabaseService.js';

/**
 * POST /api/questions/generate
 * Generate questions using Gemini AI from text content
 */
export const generateQuestionsHandler = async (req, res) => {
  try {
    const { content, count, difficulty, types } = req.body;

    if (!content) {
      return res.status(400).json({
        success: false,
        error: 'Content is required'
      });
    }

    const questions = await generateQuestions(content, {
      count: count || 5,
      difficulty: difficulty || 'Intermediate',
      types: types || ['MCQ', 'FIIB', 'TF', 'HOQ', 'Summary']
    });

    res.json({
      success: true,
      questions,
      count: questions.length
    });

  } catch (error) {
    console.error('[Backend] Generate questions error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate questions'
    });
  }
};

/**
 * POST /api/questions/generate-from-file
 * Generate questions from uploaded file using Gemini Vision API
 */
export const generateQuestionsFromFileHandler = async (req, res) => {
  try {
    const { fileUrl, fileType, count, difficulty, types } = req.body;

    // Validate required fields
    if (!fileUrl) {
      return res.status(400).json({
        success: false,
        error: 'File URL is required'
      });
    }

    if (!fileType) {
      return res.status(400).json({
        success: false,
        error: 'File type is required'
      });
    }

    console.log('[Backend] Generating questions from file:', { fileUrl, fileType });

    // Generate questions from file
    const questions = await generateQuestionsFromFile(fileUrl, fileType, {
      count: count || 5,
      difficulty: difficulty || 'Intermediate',
      types: types || ['MCQ', 'FIIB', 'TF', 'HOQ', 'Summary']
    });

    // Save questions to database
    const savedQuestions = await saveQuestions(questions);

    res.json({
      success: true,
      questions: savedQuestions,
      count: savedQuestions.length,
      source: 'file',
      fileType,
      saved: true
    });

  } catch (error) {
    console.error('[Backend] Generate from file error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate questions from file'
    });
  }
};

/**
 * GET /api/questions
 * Get all questions
 */
export const getAllQuestionsHandler = async (req, res) => {
  try {
    const { type, difficulty } = req.query;
    const questions = await getAllQuestions({ type, difficulty });
    
    res.json({
      success: true,
      questions,
      count: questions.length
    });
  } catch (error) {
    console.error('[Backend] Get questions error:', error);
    res.status(500).json({
      success: false,
      error: error.message
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

    console.log('[Backend] Updating question:', id);

    const updatedQuestion = await updateQuestion(id, updates);

    res.json({
      success: true,
      question: updatedQuestion
    });
  } catch (error) {
    console.error('[Backend] Update question error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update question'
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

export default {
  generateQuestionsHandler,
  generateQuestionsFromFileHandler,
  getAllQuestionsHandler,
  updateQuestionHandler,
  updateQuestionDifficultyHandler,
  deleteQuestionHandler
};
