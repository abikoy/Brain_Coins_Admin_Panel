import express from 'express';
import { listSubjectsHandler, getSubjectHandler } from '../controllers/subjectController.js';

const router = express.Router();

router.get('/', listSubjectsHandler);
router.get('/:id', getSubjectHandler);

export default router;
