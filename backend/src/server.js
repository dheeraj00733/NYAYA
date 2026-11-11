const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const env = require('./config/env');
const db = require('./config/db');
const AIService = require('./services/aiService');
const errorHandler = require('./middleware/errorHandler');

// Implemented Route Imports
const authRoutes = require('./routes/authRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const activityRoutes = require('./routes/activityRoutes');

const app = express();

// Security & Parsing Middleware
app.use(helmet({
  crossOriginResourcePolicy: false
}));
app.use(cors({
  origin: '*',
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

// Mount Implemented API Routes
app.use('/api/auth', authRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/activities', activityRoutes);

// AI Model Capabilities Route (Proxy)
app.get('/api/ai/models', async (req, res) => {
  const models = await AIService.getAvailableModels();
  return res.json({ success: true, ...models });
});

// Centralized Error Handler
app.use(errorHandler);

if (process.env.NODE_ENV !== 'test') {
  const server = app.listen(env.PORT, () => {
    console.log(`NyayaFlow Core Backend listening on port ${env.PORT}`);
  });

  const gracefulShutdown = async () => {
    server.close(() => {
      db.pool.end(() => process.exit(0));
    });
  };

  process.on('SIGTERM', gracefulShutdown);
  process.on('SIGINT', gracefulShutdown);
}

module.exports = app;
