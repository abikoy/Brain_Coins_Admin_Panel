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
  deleteQuestionHandler,
  createQuestionHandler,
  getSummaryByPackHandler,
  upsertSummaryByPackHandler,
  generatePreviewFromFileHandler,
  approveFromPreviewHandler
} from '../controllers/questionController.js';

const router = express.Router();

// POST /api/questions/generate - Generate questions from text
router.post('/generate', generateQuestionsHandler);

// POST /api/questions/preview-from-file - Preview generation (no DB writes)
router.post('/preview-from-file', generatePreviewFromFileHandler);

// POST /api/questions/generate-from-file - Generate questions from uploaded file
router.post('/generate-from-file', generateQuestionsFromFileHandler);

// POST /api/questions/approve-from-preview - Approve and save previewed questions
router.post('/approve-from-preview', approveFromPreviewHandler);


// GET /api/questions - Get all questions
router.get('/', getAllQuestionsHandler);

// POST /api/questions - Create a single manual question
router.post('/', createQuestionHandler);

// PATCH /api/questions/:id - Update entire question
router.patch('/:id', updateQuestionHandler);

// PATCH /api/questions/:id/difficulty - Update only difficulty
router.patch('/:id/difficulty', updateQuestionDifficultyHandler);

// DELETE /api/questions/:id - Delete question
router.delete('/:id', deleteQuestionHandler);

// Summaries
router.get('/summaries/:pack_id', getSummaryByPackHandler);
router.put('/summaries/:pack_id', upsertSummaryByPackHandler);

export default router;
