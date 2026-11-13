const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });

const isProduction = process.env.NODE_ENV === 'production';
const databaseUrl = process.env.DATABASE_URL;

// Configure SSL: Required by Supabase and cloud PostgreSQL
let dbSsl = false;
if (process.env.DB_SSL === 'true' || isProduction || (databaseUrl && databaseUrl.includes('supabase'))) {
  dbSsl = { rejectUnauthorized: false };
}

// In production, reject default/insecure secret
const jwtSecret = process.env.JWT_SECRET;
if (isProduction && (!jwtSecret || jwtSecret.includes('development'))) {
  throw new Error('[Security Alert]: A strong, random JWT_SECRET must be configured in production environment variables.');
}

module.exports = {
  PORT: process.env.PORT ? parseInt(process.env.PORT, 10) : 5001,
  NODE_ENV: process.env.NODE_ENV || 'development',
  JWT_SECRET: jwtSecret || 'nyayaflow_super_secret_jwt_key_development_2025',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  DATABASE_URL: databaseUrl,
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
