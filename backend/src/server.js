import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import questionRoutes from './routes/question.routes.js';
import learningPackRoutes from './routes/learningPack.routes.js';
import subjectRoutes from './routes/subject.routes.js';
import contentRoutes from './routes/content.routes.js';
import analyticsRoutes from './routes/analytics.routes.js';
import geminiErrorRoutes from './routes/geminiErrors.routes.js';
import contentManagementRoute from './routes/contentManagement.routes.js'

// Load environment variables (Vercel will inject these automatically in production)
dotenv.config();

const app = express();

// === Vercel Optimization & Large File Handling ===
// CORS is generally handled by Vercel's routing/headers, but keeping cors() is safe.
app.use(cors());

// Increase body limits for file uploads (CRITICAL for 413 error)
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));
app.use(express.raw({ limit: '100mb' }));
// =======================================================


// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        message: 'Brain Coins Backend API is running (Vercel Serverless)',
        timestamp: new Date().toISOString()
    });
});

// API Routes
app.use('/api/questions', questionRoutes);
app.use('/api/learning-packs', learningPackRoutes);
app.use('/api/subjects', subjectRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/gemini-errors', geminiErrorRoutes);
app.use('/api/content-management', contentManagementRoute);

// --- REMOVED/ADJUSTED SECTIONS ---

// ⚠️ Remove the manual CORS headers (Vercel handles this via vercel.json)
// app.use((req, res, next) => { ... });

// 404 handler (Keep this last before the error handler)
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Endpoint not found'
    });
});

// Error handler (Must be the last middleware)
app.use((err, req, res, next) => {
    console.error('[Backend] Error:', err);
    res.status(500).json({
        success: false,
        error: err.message || 'Internal server error'
    });
});

// ❌ CRITICAL CHANGE: Remove the app.listen() block
// Vercel handles starting the server. This block is only for local development.
/*
app.listen(PORT, () => {
    console.log(`...`);
});
*/

// ✅ CRITICAL CHANGE: Export the app instance
// This is the entry point Vercel's serverless handler needs.
export default app;