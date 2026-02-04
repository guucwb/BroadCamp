// backend/src/index.js
const path = require('path');
const fs = require('fs');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

// Import middleware
const { apiLimiter, webhookLimiter } = require('./middleware/rateLimiter');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const logger = require('./utils/logger');
// const { authenticateToken } = require('./middleware/auth'); // Uncomment when auth is implemented

const app = express();

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Security middleware
app.use(helmet());

// CORS configuration
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']
};
app.use(cors(corsOptions));

// Body parsing middleware
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: false }));

// Request logging middleware
app.use((req, res, next) => {
  logger.info('Incoming request', {
    method: req.method,
    path: req.path,
    ip: req.ip,
    userAgent: req.get('user-agent')
  });
  next();
});

// Health check (no rate limiting)
app.get('/health', (_req, res) => {
  res.json({
    ok: true,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Public routes (no authentication required)
app.use('/inbound/webhook', webhookLimiter, require('./routes/inbound'));

// API routes (with rate limiting)
app.use('/api', apiLimiter); // Apply rate limiting to all API routes

// API endpoints
app.use('/api/send', require('./routes/send'));
app.use('/api/history', require('./routes/history'));
app.use('/api/templates', require('./routes/templateRoutes'));
app.use('/api/campaign', require('./routes/campaignRoutes'));
app.use('/api/ai', require('./routes/suggestCopy'));
app.use('/api/template-guard', require('./routes/templateGuardHybrid'));
app.use('/api/dev', require('./routes/devProxy'));
app.use('/api/journeys', require('./routes/journeysRoutes'));
app.use('/api/runs', require('./routes/runsRoutes'));

// Protected routes (uncomment when authentication is implemented)
// app.use('/api/*', authenticateToken);

// 404 handler for undefined routes
app.use(notFoundHandler);

// Global error handler (MUST be last)
app.use(errorHandler);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  logger.info(`Backend server started`, {
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
    nodeVersion: process.version
  });
  console.log(`✅ Backend running on port ${PORT}`);
  console.log(`📝 Logs: ${logsDir}`);
  console.log(`🔒 CORS: ${corsOptions.origin}`);
});