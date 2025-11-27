import express from 'express';
import { 
  listLearningPacksHandler,
  getLearningPackHandler,
  createLearningPackHandler,
  analyzeDocumentHandler,
  startAnalyzeDocumentHandler,
  getAnalyzeJobStatusHandler
} from '../controllers/learningPackController.js';

const router = express.Router();

// List learning packs (optionally filtered by subject_id)
router.get('/', listLearningPacksHandler);

// Get a single learning pack by id (with subject details)
router.get('/:id', getLearningPackHandler);

// Create a new learning pack
router.post('/', createLearningPackHandler);

// Analyze document and suggest learning packs (synchronous, may time out on large files)
router.post('/analyze-document', analyzeDocumentHandler);

// Async document analysis job endpoints
// Start a background analysis job (quick response with jobId)
router.post('/analyze-document/start', startAnalyzeDocumentHandler);

// Get status/result of an analysis job
router.get('/analyze-document/job/:id', getAnalyzeJobStatusHandler);

export default router;
