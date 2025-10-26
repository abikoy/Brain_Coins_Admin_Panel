import express from 'express';
import { structuredFromFileHandler } from '../controllers/contentController.js';

const router = express.Router();

router.post('/structured-from-file', structuredFromFileHandler);

export default router;
