import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import questionRoutes from './routes/question.routes.js';
import learningPackRoutes from './routes/learningPack.routes.js';
import subjectRoutes from './routes/subject.routes.js';
import contentRoutes from './routes/content.routes.js';
import analyticsRoutes from './routes/analytics.routes.js';
import geminiErrorRoutes from './routes/geminiErrors.routes.js';
import contentManagementRoute  from './routes/contentManagement.routes.js'
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// ==========================================================
// *** AGGRESSIVE CORS FIX AND MAX FILE SIZE INCREASE ***
// ==========================================================

const VERIFIED_DOMAIN_ENDING = '.vercel.app'; 

// Middleware
app.use(cors({
  origin: function(origin, callback) {
    // 1. Allow requests with no origin (e.g., Postman, server-to-server)
    if (!origin) return callback(null, true);
    
    // 2. Check for Vercel Domains or localhost
    if (origin.endsWith(VERIFIED_DOMAIN_ENDING) || origin.includes('localhost')) {
        // CRITICAL FIX: Return the specific origin to allow credentials
        callback(null, origin); 
    } else {
        console.warn(`[CORS Blocked] Origin: ${origin}. Not recognized Vercel or localhost domain.`);
        callback(new Error('Not allowed by CORS policy'));
    }
  },
  credentials: true,
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE', // Ensure all methods are allowed
  allowedHeaders: 'Content-Type,Authorization', // Ensure essential headers are allowed
}));


// === FIX FOR 413 ERROR: INCREASE BODY LIMITS TO 100MB ===
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));
// CRITICAL ADDITION: Allow large raw body data (files)
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
app.use('/api/questions', questionRoutes);
app.use('/api/learning-packs', learningPackRoutes);
app.use('/api/subjects', subjectRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/gemini-errors', geminiErrorRoutes);
app.use('/api/content-management', contentManagementRoute);


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

// Start server
app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🎓 Brain Coins Backend API                             ║
║                                                           ║
║   Server running on: http://localhost:${PORT}              ║
║   Environment: ${process.env.NODE_ENV || 'development'}                        ║
║   CORS: Dynamic Origin | Files: 100MB                     ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
  `);
});

export default app;
