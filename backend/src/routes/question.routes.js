/**
 * BACKEND - Question Routes
 * API endpoints for question management
 */

import express from 'express';
import { 
  generateQuestionsHandler, 
  generateQuestionsFromFileHandler,
  getAllQuestionsHandler,
  updateQuestionHandler,
  updateQuestionDifficultyHandler,
  deleteQuestionHandler
} from '../controllers/questionController.js';

const router = express.Router();

// POST /api/questions/generate - Generate questions from text
router.post('/generate', generateQuestionsHandler);

// POST /api/questions/generate-from-file - Generate questions from uploaded file
router.post('/generate-from-file', generateQuestionsFromFileHandler);

// GET /api/questions - Get all questions
router.get('/', getAllQuestionsHandler);

// PATCH /api/questions/:id - Update entire question
router.patch('/:id', updateQuestionHandler);

// PATCH /api/questions/:id/difficulty - Update only difficulty
router.patch('/:id/difficulty', updateQuestionDifficultyHandler);

// DELETE /api/questions/:id - Delete question
router.delete('/:id', deleteQuestionHandler);

export default router;
