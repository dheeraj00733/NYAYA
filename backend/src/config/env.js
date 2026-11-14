const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });

const nodeEnv = process.env.NODE_ENV || 'development';
const isProduction = nodeEnv === 'production';
const databaseUrl = process.env.DATABASE_URL;

/**
 * Validates JWT_SECRET against security standards.
 * - In production: rejects missing, empty, short (< 32 chars), or predictable/default secrets.
 * - In development/test: falls back to a development-only secret if not provided.
 */
function validateJwtSecret(secret, envMode) {
  const isProd = envMode === 'production';
  if (isProd) {
    if (!secret || typeof secret !== 'string' || !secret.trim()) {
      throw new Error('[Security Alert]: JWT_SECRET must be explicitly configured in production environment variables.');
    }
    const trimmed = secret.trim();
    const weakPatterns = ['development', 'secret', 'changeme', 'nyayaflow', '123456', 'password', 'default'];
    const isPredictable = weakPatterns.some((pattern) => trimmed.toLowerCase().includes(pattern));
    if (trimmed.length < 32 || isPredictable) {
      throw new Error('[Security Alert]: JWT_SECRET in production is weak or predictable. It must be at least 32 characters long and cannot contain default keywords.');
    }
    return trimmed;
  }
  // Development / Test fallback only
  return secret || 'nyayaflow_dev_only_jwt_secret_not_for_production';
}

// Validate JWT Secret: In production, enforce high-entropy secret; fail startup if missing or weak
const jwtSecret = validateJwtSecret(process.env.JWT_SECRET, nodeEnv);

// Configure SSL: Required by Supabase and cloud PostgreSQL
let dbSsl = false;
const caCert = process.env.DB_CA_CERT;
if (caCert) {
  // Explicit Root CA provided: enforce full certificate chain verification
  dbSsl = { ca: caCert, rejectUnauthorized: true };
} else if (process.env.DB_SSL === 'true' || isProduction || (databaseUrl && databaseUrl.includes('supabase'))) {
  // Fallback for cloud environments where custom CA certificates are not mounted
  dbSsl = { rejectUnauthorized: false };
}

module.exports = {
  PORT: process.env.PORT ? parseInt(process.env.PORT, 10) : 5001,
  NODE_ENV: nodeEnv,
  JWT_SECRET: jwtSecret,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  DATABASE_URL: databaseUrl,
  DB_CA_CERT: caCert,
  validateJwtSecret,
  DB: {
    connectionString: databaseUrl,
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME || 'nyayaflow_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    ssl: dbSsl
  },
  AI_SERVICE_URL: process.env.AI_SERVICE_URL || 'http://localhost:8000',
  CORS_ORIGIN: process.env.CORS_ORIGIN || '*',
  STORAGE_DIR: process.env.STORAGE_DIR ? path.resolve(__dirname, '../../..', process.env.STORAGE_DIR) : path.resolve(__dirname, '../../../storage/uploads'),
  MAX_FILE_SIZE_MB: parseInt(process.env.MAX_FILE_SIZE_MB || '50', 10),
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY
};
