import express from 'express';
import reportsController from '../controllers/reportsController.js';

const router = express.Router();

// All reports routes
router.get('/', reportsController.getAllReports);
router.get('/stats', reportsController.getReportsStats);
router.patch('/:id/status', reportsController.updateReportStatus);

export default router;
