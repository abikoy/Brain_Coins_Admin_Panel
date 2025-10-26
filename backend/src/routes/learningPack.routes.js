import express from 'express';
import { 
  listLearningPacksHandler,
  getLearningPackHandler,
  createLearningPackHandler
} from '../controllers/learningPackController.js';

const router = express.Router();

// List learning packs (optionally filtered by subject_id)
router.get('/', listLearningPacksHandler);

// Get a single learning pack by id (with subject details)
router.get('/:id', getLearningPackHandler);

// Create a new learning pack
router.post('/', createLearningPackHandler);

export default router;
