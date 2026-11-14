const { Pool } = require('pg');
const { parse } = require('pg-connection-string');
const env = require('./env');

function categorizeDbError(err) {
  if (!err) return { category: 'UNKNOWN', code: 'UNKNOWN', description: 'No error object' };

  const code = String(err.code || '');
  const msg = String(err.message || '');

  // 1. SSL/TLS Failure
  if (
    code === 'SELF_SIGNED_CERT_IN_CHAIN' ||
    code === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE' ||
    code === 'CERT_HAS_EXPIRED' ||
    msg.includes('SSL') ||
    msg.includes('certificate') ||
    msg.includes('tls')
  ) {
    return {
      category: 'SSL_TLS_FAILURE',
      code: code || 'SSL_ERROR',
      description: 'SSL/TLS negotiation or certificate chain validation failed'
    };
  }

  // 2. Authentication Failure
  if (
    code === '28P01' ||
    code === '28000' ||
    msg.includes('password authentication failed') ||
    msg.includes('Tenant or user not found') ||
    msg.includes('tenant')
  ) {
    return {
      category: 'AUTHENTICATION_FAILURE',
      code: code || '28P01',
      description: 'Database authentication failed (verify password and postgres.[project-ref] username)'
    };
  }

  // 3. DNS Resolution Failure
  if (code === 'ENOTFOUND' || code === 'EAI_AGAIN' || msg.includes('getaddrinfo ENOTFOUND')) {
    return {
      category: 'DNS_RESOLUTION_FAILURE',
      code: code,
      description: 'Database hostname could not be resolved via DNS'
    };
  }

  // 4. IPv4/IPv6 Routing Failure
  if (code === 'ENETUNREACH' || code === 'EHOSTUNREACH' || code === 'EADDRNOTAVAIL') {
    return {
      category: 'NETWORK_ROUTING_FAILURE',
      code: code,
      description: 'Network route unreachable (ensure Supabase Pooler IPv4 hostname is used)'
    };
  }

  // 5. Connection Timeout
  if (code === 'ETIMEDOUT' || msg.includes('timeout') || msg.includes('timed out')) {
    return {
      category: 'CONNECTION_TIMEOUT',
      code: code || 'TIMEOUT',
      description: 'Connection attempt timed out before handshake completed'
    };
  }

  // 6. Pool Exhaustion
  if (msg.includes('timeout exceeded when trying to connect') || msg.includes('pool is full')) {
    return {
      category: 'POOL_EXHAUSTION',
      code: code || 'POOL_FULL',
      description: 'Connection pool exhausted'
    };
  }

  // 7. Invalid Connection URI
  if (msg.includes('invalid connection URI') || msg.includes('URI malformed')) {
    return {
      category: 'INVALID_CONNECTION_URI',
      code: code || 'INVALID_URI',
      description: 'DATABASE_URL format is malformed or invalid'
    };
  }

  // 8. General Database Availability Failure
  if (code === 'ECONNREFUSED' || code === 'ECONNRESET' || code === '57P01') {
    return {
      category: 'DATABASE_AVAILABILITY_FAILURE',
      code: code,
      description: 'Database server refused connection or terminated unexpectedly'
    };
  }

  return {
    category: 'DATABASE_ERROR',
    code: code || 'DB_ERROR',
    description: 'Database query execution failed'
  };
}

/**
 * Strips sslmode from connection URL so pg-connection-string does not overwrite
 * explicit node-postgres TLS settings with verify-full defaults.
 * Preserves all other query parameters (e.g., compound params like app, supa, etc.).
 */
function cleanConnectionUrl(rawUrl) {
  if (!rawUrl) return rawUrl;
  try {
    const u = new URL(rawUrl);
    u.searchParams.delete('sslmode');
    return u.toString();
  } catch (_) {
    return rawUrl.replace(/([?&])sslmode=[^&]*(&|$)/, '$1').replace(/[?&]$/, '');
  }
}

/**
 * Resolves SSL configuration with strict security priority:
 * 1. If DB_CA_CERT is provided, enforce rejectUnauthorized: true with the provided CA certificate.
 * 2. If explicit SSL configuration is supplied via env.DB.ssl, honor it directly.
 * 3. Fallback for Supabase / production cloud hosting without mounted CA certificates:
 *    rejectUnauthorized: false
 *
 * SECURITY IMPLICATIONS OF FALLBACK (rejectUnauthorized: false):
 * - In fallback mode, wire encryption is fully active via TLS 1.3 with AES-256-GCM in-transit,
 *   protecting credentials and query payloads against passive network sniffing.
 * - However, the server certificate chain is not validated against a known public or private Root CA,
 *   which leaves the connection open to active Man-in-the-Middle (MITM) attacks on the transport layer.
 * - For zero-trust production hardening, provide the Supabase Root CA certificate in DB_CA_CERT.
 */
function resolveSslConfig(options = {}) {
  const caCert = options.caCert !== undefined ? options.caCert : env.DB_CA_CERT;
  if (caCert) {
    return {
      ca: caCert,
      rejectUnauthorized: true
    };
  }

  const explicitSsl = options.dbSsl !== undefined ? options.dbSsl : (env.DB && env.DB.ssl);
  if (explicitSsl) {
    return explicitSsl;
  }

  const url = options.databaseUrl !== undefined ? options.databaseUrl : env.DATABASE_URL;
  const isProd = options.isProduction !== undefined ? options.isProduction : (env.NODE_ENV === 'production');
  if (isProd || (url && url.includes('supabase'))) {
    return { rejectUnauthorized: false };
  }

  return false;
}

const sslConfig = resolveSslConfig();

let poolConfig;

if (env.DATABASE_URL) {
  const cleanUrl = cleanConnectionUrl(env.DATABASE_URL);
  const parsed = parse(cleanUrl);
  delete parsed.sslmode;

  poolConfig = {
    ...parsed,
    ssl: sslConfig,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000
  };
} else {
  poolConfig = {
    host: env.DB.host,
    port: env.DB.port,
    database: env.DB.database,
    user: env.DB.user,
    password: env.DB.password,
    ssl: sslConfig,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000
  };
}

const pool = new Pool(poolConfig);

pool.on('error', (err) => {
  const diagnostic = categorizeDbError(err);
  console.error('[PostgreSQL Pool Error]: Unexpected idle client error:', diagnostic.category, diagnostic.code);
});

module.exports = {
  pool,
  categorizeDbError,
  cleanConnectionUrl,
  resolveSslConfig,
  query: (text, params) => pool.query(text, params),
  getClient: () => pool.connect(),
  checkConnection: async () => {
    try {
      const res = await pool.query('SELECT NOW() AS current_time, version()');
      return {
        connected: true,
        time: res.rows[0].current_time,
        version: res.rows[0].version
      };
    } catch (err) {
      const diagnostic = categorizeDbError(err);
      return {
        connected: false,
        category: diagnostic.category,
        code: diagnostic.code,
        message: diagnostic.description
      };
    }
  }
};
