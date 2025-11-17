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
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        message: 'Brain Coins Backend API is running',
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
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', 'http://localhost:3000');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    next();
});
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



export default app;
