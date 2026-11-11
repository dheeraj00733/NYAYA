const { Pool } = require('pg');
const env = require('./env');

const pool = new Pool({
  host: env.DB.host,
  port: env.DB.port,
  database: env.DB.database,
  user: env.DB.user,
  password: env.DB.password,
  ssl: env.DB.ssl,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000
});

pool.on('error', (err) => {
  console.error('[PostgreSQL Pool Error]: Unexpected idle client error', err);
});

module.exports = {
  pool,
  query: (text, params) => pool.query(text, params),
  getClient: () => pool.connect(),
  checkConnection: async () => {
    try {
      const res = await pool.query('SELECT NOW() AS current_time, version()');
      return { connected: true, time: res.rows[0].current_time, version: res.rows[0].version };
    } catch (err) {
      return { connected: false, error: err.message };
    }
  }
};
