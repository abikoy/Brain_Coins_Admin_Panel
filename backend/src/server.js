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

// CORS Configuration - Allows dynamic origin matching for credentials
// This fix addresses the error: '...must not be the wildcard '*' when the request's credentials mode is 'include'.'
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:5174',
  process.env.FRONTEND_URL,
  // Explicitly allow your known primary Vercel domains if needed
  'https://brain-coins-admin-panel-a4or.vercel.app'
].filter(Boolean);

// Middleware
app.use(cors({
  origin: function(origin, callback) {
    // 1. Allow requests with no origin (e.g., Postman, server-to-server)
    if (!origin) return callback(null, true);
    
    // 2. Check for Whitelisted Domains or Vercel Domains
    const isAllowed = allowedOrigins.includes(origin) || origin.endsWith('.vercel.app');

    if (isAllowed) {
        // CRITICAL FIX: MUST return the specific origin when credentials: 'include' is used
      callback(null, origin); 
    } else {
      console.warn(`[CORS Blocked] Origin: ${origin}. Not in whitelist or Vercel pattern.`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE', // Ensure all methods are allowed
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.raw({ limit: '50mb' }));

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
║   CORS: Credentials-Safe Dynamic Origin Enabled            ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
  `);
});

export default app;
