import express from 'express';
import { 
  listLearningPacksHandler,
  getLearningPackHandler,
  createLearningPackHandler,
  analyzeDocumentHandler
} from '../controllers/learningPackController.js';

const router = express.Router();

// List learning packs (optionally filtered by subject_id)
router.get('/', listLearningPacksHandler);

// Get a single learning pack by id (with subject details)
router.get('/:id', getLearningPackHandler);

// Create a new learning pack
router.post('/', createLearningPackHandler);

// Analyze document and suggest learning packs
router.post('/analyze-document', analyzeDocumentHandler);

export default router;
