const fs = require('fs');
const path = require('path');
const db = require('../config/db');

async function runMigrations() {
  console.log('[NyayaFlow Migration Runner]: Starting database migrations...');
  const migrationPath = path.resolve(__dirname, '../../../database/migrations/001_initial_schema.sql');

  if (!fs.existsSync(migrationPath)) {
    console.error(`Migration file missing at: ${migrationPath}`);
    process.exit(1);
  }

  const sql = fs.readFileSync(migrationPath, 'utf8');
  const client = await db.getClient();

  try {
    console.log('[NyayaFlow Migration Runner]: Executing 001_initial_schema.sql...');
    await client.query(sql);
    console.log('✅ [NyayaFlow Migration Runner]: All 12 tables, indexes, and pgvector extension initialized successfully.');
  } catch (err) {
    console.error('❌ [NyayaFlow Migration Runner Error]:', err);
    process.exit(1);
  } finally {
    client.release();
    await db.pool.end();
  }
}

if (require.main === module) {
  runMigrations();
}

module.exports = runMigrations;
