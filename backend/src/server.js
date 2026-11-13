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

// Lightweight Liveness Healthcheck (for Render / orchestrator process monitoring)
// Immediately returns 200 OK to confirm the Node.js process is alive and accepting traffic
app.get('/health', (req, res) => {
  return res.status(200).json({
    status: 'healthy',
    service: 'nyayaflow-backend',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    environment: env.NODE_ENV
  });
});

// Comprehensive Dependency Readiness Check (inspects database & downstream connectivity)
// Reports genuine dependency status with safe, sanitized public responses (no internal leakage)
app.get(['/ready', '/health/ready'], async (req, res) => {
  try {
    const dbHealth = await db.checkConnection();
    let aiHealth = null;

    try {
      aiHealth = await AIService.checkHealth();
    } catch (e) {
      aiHealth = { status: 'offline', error: e.message };
    }

    const isDbConnected = Boolean(dbHealth && dbHealth.connected);
    const isAiConnected = Boolean(aiHealth && (aiHealth.status === 'healthy' || aiHealth.status === 'connected'));

    // Server-side audit log for operational visibility without credential exposure
    if (!isDbConnected) {
      const sanitizedError = (dbHealth?.error || 'Unknown error').replace(/:[^:@]*@/, ':****@');
      console.error('[Readiness Audit Error]: Database check failed:', sanitizedError);
    }
    if (!isAiConnected && aiHealth?.error) {
      const sanitizedAiError = (aiHealth.error || '').replace(/:[^:@]*@/, ':****@');
      console.warn('[Readiness Audit Warning]: AI Service check issue:', sanitizedAiError);
    }

    // Public sanitized payload: never leak raw stack traces, connection strings, or system versions
    const publicResponse = {
      status: isDbConnected ? 'ready' : 'not_ready',
      service: 'nyayaflow-backend',
      timestamp: new Date().toISOString(),
      dependencies: {
        database: {
          status: isDbConnected ? 'connected' : 'disconnected',
          message: isDbConnected ? 'Database service operational' : 'Database service unavailable'
        },
        ai_service: {
          status: isAiConnected ? 'connected' : 'offline',
          message: isAiConnected ? 'AI microservice operational' : 'AI microservice unreachable'
        }
      }
    };

    return res.status(isDbConnected ? 200 : 503).json(publicResponse);
  } catch (err) {
    const sanitizedCatchError = (err.message || 'Internal failure').replace(/:[^:@]*@/, ':****@');
    console.error('[Readiness Audit Failure]: Unexpected exception:', sanitizedCatchError);

    return res.status(503).json({
      status: 'not_ready',
      service: 'nyayaflow-backend',
      timestamp: new Date().toISOString(),
      dependencies: {
        database: {
          status: 'error',
          message: 'Unable to evaluate database readiness'
        }
      }
    });
  }
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
    console.log(`  Readiness Check:   http://${host}:${env.PORT}/ready`);
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
