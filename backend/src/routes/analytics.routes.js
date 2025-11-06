import express from 'express';
import analyticsController from '../controllers/analyticsController.js';

const router = express.Router();

// All analytics routes
router.get('/stats', analyticsController.getRealTimeStats);
router.get('/dashboard', analyticsController.getDashboardOverview);
router.get('/students', analyticsController.getStudents);
router.get('/progress', analyticsController.getStudentProgress);
router.get('/premium', analyticsController.getPremiumAnalytics);
router.get('/logs', analyticsController.getSystemLogs)
router.get('/students/:id', analyticsController.getStudentDetails);
router.patch('/students/:id/premium', analyticsController.updateStudentPremiumStatus);
router.post('/students/:id/subscription', analyticsController.createManualSubscription);

export default router;