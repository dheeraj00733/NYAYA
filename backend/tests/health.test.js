process.env.NODE_ENV = 'test';

const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');
const net = require('net');
const app = require('../src/server');
const db = require('../src/config/db');
const AIService = require('../src/services/aiService');

// In-memory HTTP dispatcher utilizing native Node.js HTTP prototypes
function dispatch(method, url) {
  return new Promise((resolve, reject) => {
    const socket = new net.Socket();
    const req = new http.IncomingMessage(socket);
    req.method = method;
    req.url = url;
    req.headers = { host: 'localhost', 'user-agent': 'test-agent' };

    const res = new http.ServerResponse(req);
    let output = '';

    res.write = (chunk) => {
      output += chunk.toString();
      return true;
    };

    res.end = (chunk) => {
      if (chunk) output += chunk.toString();
      let parsed = null;
      try {
        parsed = JSON.parse(output);
      } catch (_) {
        parsed = output;
      }
      resolve({ status: res.statusCode, body: parsed });
    };

    try {
      app.handle(req, res, (err) => {
        if (err) reject(err);
      });
    } catch (err) {
      reject(err);
    }
  });
}

describe('Backend Liveness & Readiness Suite', () => {
  let originalCheckConnection;
  let originalCheckHealth;

  before(() => {
    originalCheckConnection = db.checkConnection;
    originalCheckHealth = AIService.checkHealth;

    // Mock AI Service health check in tests
    AIService.checkHealth = async () => ({ status: 'healthy', provider: 'groq' });
  });

  after(() => {
    db.checkConnection = originalCheckConnection;
    AIService.checkHealth = originalCheckHealth;
  });

  test('GET /health returns HTTP 200 and healthy status (Liveness check for Render)', async () => {
    const res = await dispatch('GET', '/health');
    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'healthy');
    assert.equal(res.body.service, 'nyayaflow-backend');
    assert.ok(typeof res.body.uptime === 'number');
    assert.ok(res.body.timestamp);
    assert.ok(res.body.environment);
  });

  test('GET /health remains 200 even if database connection fails', async () => {
    // Mock db.checkConnection to simulate database outage
    db.checkConnection = async () => ({ connected: false, error: 'Simulated connection failure' });

    const res = await dispatch('GET', '/health');
    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'healthy');
    assert.equal(res.body.service, 'nyayaflow-backend');
  });

  test('GET /ready returns HTTP 200 and sanitized status when database is healthy', async () => {
    db.checkConnection = async () => ({ connected: true, time: new Date().toISOString(), version: 'PostgreSQL 16' });

    const res = await dispatch('GET', '/ready');
    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'ready');
    assert.equal(res.body.dependencies.database.status, 'connected');
    assert.equal(res.body.dependencies.database.message, 'Database service operational');
    // Ensure raw PostgreSQL version banner is not leaked
    assert.equal(res.body.version, undefined);
    assert.equal(res.body.database, undefined);
  });

  test('GET /ready returns HTTP 503 and safe generic message when database is disconnected (no info leakage)', async () => {
    const rawSensitiveError = 'getaddrinfo ENOTFOUND sensitive-db-host.internal with password secret_pass_123';
    db.checkConnection = async () => ({ connected: false, error: rawSensitiveError });

    const res = await dispatch('GET', '/ready');
    assert.equal(res.status, 503);
    assert.equal(res.body.status, 'not_ready');
    assert.equal(res.body.dependencies.database.status, 'disconnected');
    assert.equal(res.body.dependencies.database.message, 'Database service unavailable');

    // Strict security check: raw exception/host/credential strings must NEVER be in response
    const jsonString = JSON.stringify(res.body);
    assert.equal(jsonString.includes('sensitive-db-host'), false, 'Must not leak hostnames');
    assert.equal(jsonString.includes('secret_pass'), false, 'Must not leak credentials');
    assert.equal(jsonString.includes('getaddrinfo'), false, 'Must not leak system call details');
  });

  test('GET /health/ready is supported as an alias for /ready', async () => {
    db.checkConnection = async () => ({ connected: true, time: new Date().toISOString() });

    const res = await dispatch('GET', '/health/ready');
    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'ready');
    assert.equal(res.body.dependencies.database.status, 'connected');
  });
});
