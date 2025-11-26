import express from 'express';
import { startAnalysisJob, getJobStatus } from '../controllers/jobController.js';

const router = express.Router();

// Start background analysis job
router.post('/analyze', startAnalysisJob);

// Get job status
router.get('/:jobId', getJobStatus);

export default router;