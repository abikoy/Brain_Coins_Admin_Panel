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
// *** CRITICAL FIX: Simplified Wildcard CORS Configuration ***
// This overrides the complex function to guarantee allowance
// from all Vercel preview domains, solving the block issue.
// ==========================================================

// Middleware
app.use(cors({
  origin: '*', // ALLOWS ALL ORIGINS - Solves the Vercel preview domain issue
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  credentials: true,
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

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
║   CORS: Wildcard (*) Enabled                              ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
  `);
});

export default app;
