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
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// === FIX: Simplified CORS (Managed by vercel.json) ===
// We rely on the vercel.json file to set the CORS headers.
app.use(cors());


// === FIX FOR 413 ERROR: INCREASE BODY LIMITS TO 100MB ===
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));
// CRITICAL ADDITION: This is essential for large file data
app.use(express.raw({ limit: '100mb' }));
// =======================================================


// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        message: 'Brain Coins Backend API is running',
        timestamp: new Date().toISOString()
    });
});

// API Routes
app.use('/questions', questionRoutes);
app.use('/learning-packs', learningPackRoutes);
app.use('/subjects', subjectRoutes);
app.use('/content', contentRoutes);
app.use('/analytics', analyticsRoutes);
app.use('/gemini-errors', geminiErrorRoutes);
app.use('/content-management', contentManagementRoute);

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Endpoint not found'
    });
});

// Error handler
app.use((err, req, res, next) => {
    console.error('[Backend] Error:', err);
    res.status(500).json({
        success: false,
        error: err.message || 'Internal server error'
    });
});

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🎓 Brain Coins Backend API                             ║
║                                                           ║
║   Server running on: http://localhost:${PORT}              ║
║   Environment: ${process.env.NODE_ENV || 'development'}                        ║
║   CORS: Managed by Vercel | Files: 100MB                  ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
  `);
  });
}

export default app;
