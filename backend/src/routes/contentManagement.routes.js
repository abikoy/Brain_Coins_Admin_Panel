// routes/contentManagementRoutes.js
import express from 'express';
import contentManagementController from '../controllers/contentManagementController.js';

const router = express.Router();

// HIERARCHICAL FILTERING ROUTE
router.get('/hierarchy', contentManagementController.getContentHierarchy);

// SUBJECTS ROUTES
router.get('/subjects', contentManagementController.getSubjects);
router.patch('/subjects/:id/status', contentManagementController.toggleSubjectStatus);

// LEARNING PACKS ROUTES
router.get('/learning-packs', contentManagementController.getLearningPacks);
router.patch('/learning-packs/:id/status', contentManagementController.toggleLearningPackStatus);
router.patch('/learning-packs/:id/premium', contentManagementController.toggleLearningPackPremium);
router.put('/learning-packs/:id', contentManagementController.updateLearningPack);
router.delete('/learning-packs/:id', contentManagementController.deleteLearningPack);

// QUESTIONS ROUTES
router.get('/questions', contentManagementController.getQuestions);
router.patch('/questions/:id/status', contentManagementController.toggleQuestionStatus);
router.put('/questions/:id', contentManagementController.updateQuestion);
router.delete('/questions/:id', contentManagementController.deleteQuestion);

// BULK OPERATIONS ROUTES
router.patch('/questions/bulk/status', contentManagementController.bulkToggleQuestions);
router.patch('/learning-packs/bulk/status', contentManagementController.bulkToggleLearningPacks);
router.patch('/learning-packs/bulk/premium', contentManagementController.bulkToggleLearningPacksPremium);

export default router;