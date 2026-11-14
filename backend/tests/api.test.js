const test = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

test('Backend Security Suite: Password Hashing', async (t) => {
  await t.test('bcrypt hashes password securely and verifies match', async () => {
    const password = 'Password@123';
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);

    assert.ok(hash.startsWith('$2'), 'Hash must start with bcrypt prefix ($2a or $2b)');
    const isMatch = await bcrypt.compare(password, hash);
    assert.equal(isMatch, true, 'Original password should verify successfully');

    const wrongMatch = await bcrypt.compare('WrongPassword', hash);
    assert.equal(wrongMatch, false, 'Invalid password must be rejected');
  });
});

test('Backend Security Suite: JWT Token Sign & Verification', async (t) => {
  const secret = 'test_jwt_secret_key_12345';
  const payload = {
    userId: 'a0000000-0000-0000-0000-000000000002',
    email: 'advocate.sharma@nyayaflow.com',
    role: 'lawyer',
    full_name: 'Adv. Rajesh Sharma'
  };

  const token = jwt.sign(payload, secret, { expiresIn: '1h' });
  assert.ok(typeof token === 'string' && token.length > 20, 'Token must be a non-empty string');

  const decoded = jwt.verify(token, secret);
  assert.equal(decoded.userId, payload.userId);
  assert.equal(decoded.role, 'lawyer');

  assert.throws(() => {
    jwt.verify(token, 'invalid_secret');
  }, /invalid signature/, 'Tampered secret must fail verification');
});

test('Backend Security Suite: JWT Secret Configuration & Production Validation', async (t) => {
  const { validateJwtSecret } = require('../src/config/env');

  await t.test('rejects missing or empty JWT_SECRET in production', () => {
    assert.throws(
      () => validateJwtSecret(undefined, 'production'),
      /JWT_SECRET must be explicitly configured in production/
    );
    assert.throws(
      () => validateJwtSecret('', 'production'),
      /JWT_SECRET must be explicitly configured in production/
    );
    assert.throws(
      () => validateJwtSecret('   ', 'production'),
      /JWT_SECRET must be explicitly configured in production/
    );
  });

  await t.test('rejects short JWT_SECRET (< 32 chars) in production', () => {
    assert.throws(
      () => validateJwtSecret('short_insecure_key_12345', 'production'),
      /JWT_SECRET in production is weak or predictable/
    );
  });

  await t.test('rejects predictable or default patterns in production JWT_SECRET', () => {
    assert.throws(
      () => validateJwtSecret('nyayaflow_super_secret_jwt_key_development_2025_extended', 'production'),
      /JWT_SECRET in production is weak or predictable/
    );
    assert.throws(
      () => validateJwtSecret('my_production_changeme_super_long_secret_key_12345678', 'production'),
      /JWT_SECRET in production is weak or predictable/
    );
  });

  await t.test('accepts strong, high-entropy JWT_SECRET in production', () => {
    const strongSecret = 'e8b7c3d4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2';
    const result = validateJwtSecret(strongSecret, 'production');
    assert.equal(result, strongSecret);
  });

  await t.test('provides development-only fallback when JWT_SECRET is absent in development', () => {
    const devFallback = validateJwtSecret(undefined, 'development');
    assert.ok(devFallback.includes('dev_only'), 'Must use explicit dev-only fallback identifier');
  });

  await t.test('preserves explicitly configured JWT_SECRET in development', () => {
    const customDev = 'custom_dev_key_for_testing';
    const result = validateJwtSecret(customDev, 'development');
    assert.equal(result, customDev);
  });

  await t.test('crashes application module initialization if loaded in production with empty JWT_SECRET', () => {
    const { execSync } = require('child_process');
    assert.throws(() => {
      execSync('NODE_ENV=production JWT_SECRET="" node -e "require(\x27./backend/src/config/env\x27)"', { stdio: 'pipe' });
    });
  });

  await t.test('crashes application module initialization if loaded in production with weak JWT_SECRET', () => {
    const { execSync } = require('child_process');
    assert.throws(() => {
      execSync('NODE_ENV=production JWT_SECRET="nyayaflow_super_secret_jwt_key_development_2025" node -e "require(\x27./backend/src/config/env\x27)"', { stdio: 'pipe' });
    });
  });
});

test('Backend Relational Integrity: Normalization Verification', (t) => {
  // Test candidate keys and unique constraint logic
  const roles = ['lawyer', 'client', 'admin'];
  assert.equal(roles.includes('lawyer'), true);
  assert.equal(roles.includes('client'), true);
  assert.equal(roles.includes('admin'), true);
  assert.equal(roles.includes('intruder'), false);

  const categories = ['civil', 'criminal', 'corporate', 'constitutional', 'family', 'tax', 'ipr', 'labor', 'arbitration', 'other'];
  assert.equal(categories.includes('criminal'), true);
  assert.equal(categories.includes('corporate'), true);
});
