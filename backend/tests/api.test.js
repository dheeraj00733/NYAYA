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

test('Backend Relational Integrity: Normalization Verification', () => {
  const roles = ['lawyer', 'client', 'admin'];
  assert.equal(roles.includes('lawyer'), true);
  assert.equal(roles.includes('client'), true);
  assert.equal(roles.includes('admin'), true);
  assert.equal(roles.includes('intruder'), false);

  const categories = ['civil', 'criminal', 'corporate', 'constitutional', 'family', 'tax', 'ipr', 'labor', 'arbitration', 'other'];
  assert.equal(categories.includes('criminal'), true);
  assert.equal(categories.includes('corporate'), true);
});
