const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const env = require('./config/env');
const db = require('./config/db');
const AIService = require('./services/aiService');
const errorHandler = require('./middleware/errorHandler');

// Route Imports
const authRoutes = require('./routes/authRoutes');
const caseRoutes = require('./routes/caseRoutes');
const documentRoutes = require('./routes/documentRoutes');
const factRoutes = require('./routes/factRoutes');
const hearingRoutes = require('./routes/hearingRoutes');
const chatRoutes = require('./routes/chatRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const activityRoutes = require('./routes/activityRoutes');

const app = express();

// Security & Parsing Middleware
app.use(helmet({
  crossOriginResourcePolicy: false // Allows PDF streaming to frontend viewers
}));
app.use(cors({
  origin: env.CORS_ORIGIN && env.CORS_ORIGIN !== '*' 
    ? (env.CORS_ORIGIN.includes(',') ? env.CORS_ORIGIN.split(',').map(s => s.trim()) : env.CORS_ORIGIN)
    : '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
if (env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Global System Healthcheck
app.get('/health', async (req, res) => {
  const dbHealth = await db.checkConnection();
  const aiHealth = await AIService.checkHealth();

  const isHealthy = dbHealth.connected;
  return res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'healthy' : 'degraded',
    service: 'nyayaflow-backend',
    timestamp: new Date().toISOString(),
    database: dbHealth,
    ai_service: aiHealth
  });
});

// Mount API Routes
app.use('/api/auth', authRoutes);
app.use('/api/cases', caseRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/facts', factRoutes);
app.use('/api/hearings', hearingRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/activities', activityRoutes);

// AI Model Capabilities Route (Proxy)
app.get('/api/ai/models', async (req, res) => {
  const models = await AIService.getAvailableModels();
  return res.json({ success: true, ...models });
});

// Centralized Error Handler
app.use(errorHandler);

// Only listen when not required by test runner
if (process.env.NODE_ENV !== 'test') {
  const host = '0.0.0.0';
  const server = app.listen(env.PORT, host, () => {
    console.log(`=======================================================`);
    console.log(`  NyayaFlow Core Backend Online`);
    console.log(`  Listening on Host: ${host}`);
    console.log(`  Listening on Port: ${env.PORT}`);
    console.log(`  Environment:       ${env.NODE_ENV}`);
    console.log(`  Health Check:      http://${host}:${env.PORT}/health`);
    console.log(`=======================================================`);
  });

  const gracefulShutdown = async () => {
    console.log('\n[NyayaFlow Backend]: Received shutdown signal, closing server & pool...');
    server.close(() => {
      db.pool.end(() => {
        console.log('[NyayaFlow Backend]: Database pool closed. Exiting process.');
        process.exit(0);
      });
    });
  };

  process.on('SIGTERM', gracefulShutdown);
  process.on('SIGINT', gracefulShutdown);
}

module.exports = app;
