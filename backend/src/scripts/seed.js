const fs = require('fs');
const path = require('path');
const db = require('../config/db');

async function runSeeds() {
  console.log('[NyayaFlow Seed Runner]: Seeding synthetic legal demo data...');
  const seedPath = path.resolve(__dirname, '../../../database/seeds/001_seed_demo_data.sql');

  if (!fs.existsSync(seedPath)) {
    console.error(`Seed file missing at: ${seedPath}`);
    process.exit(1);
  }

  const sql = fs.readFileSync(seedPath, 'utf8');
  const client = await db.getClient();

  try {
    console.log('[NyayaFlow Seed Runner]: Executing 001_seed_demo_data.sql...');
    await client.query(sql);
    console.log('✅ [NyayaFlow Seed Runner]: Synthetic users, cases, parties, documents, facts, and hearings seeded.');
  } catch (err) {
    console.error('❌ [NyayaFlow Seed Runner Error]:', err);
    process.exit(1);
  } finally {
    client.release();
    await db.pool.end();
  }
}

if (require.main === module) {
  runSeeds();
}

module.exports = runSeeds;
