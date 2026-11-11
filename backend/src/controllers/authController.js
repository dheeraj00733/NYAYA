const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const env = require('../config/env');
const { logActivity } = require('../services/auditService');

const generateToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      userId: user.id,
      email: user.email,
      role: user.role,
      full_name: user.full_name
    },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN }
  );
};

exports.register = async (req, res, next) => {
  try {
    const { email, password, full_name, role = 'lawyer', phone, bar_council_id, organization } = req.body;

    if (!email || !password || !full_name) {
      return res.status(400).json({ success: false, error: 'Email, password, and full name are required.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, error: 'Password must be at least 6 characters long.' });
    }

    const validRoles = ['lawyer', 'client', 'admin'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ success: false, error: `Role must be one of: ${validRoles.join(', ')}` });
    }

    // Check existing email
    const existing = await db.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase().trim()]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ success: false, error: 'An account with this email address already exists.' });
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    const insertQuery = `
      INSERT INTO users (
        email, password_hash, full_name, role, phone, bar_council_id, organization
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, email, full_name, role, phone, bar_council_id, organization, avatar_url, created_at
    `;
    const values = [
      email.toLowerCase().trim(),
      password_hash,
      full_name.trim(),
      role,
      phone || null,
      bar_council_id || null,
      organization || null
    ];

    const result = await db.query(insertQuery, values);
    const user = result.rows[0];
    const token = generateToken(user);

    await logActivity({
      userId: user.id,
      actionType: 'create',
      entityType: 'user',
      entityId: user.id,
      details: { email: user.email, role: user.role },
      ipAddress: req.ip
    });

    return res.status(201).json({
      success: true,
      message: 'User registered successfully.',
      user,
      token
    });
  } catch (error) {
    next(error);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password are required.' });
    }

    const result = await db.query(
      'SELECT id, email, password_hash, full_name, role, phone, bar_council_id, organization, avatar_url, is_active FROM users WHERE email = $1',
      [email.toLowerCase().trim()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, error: 'Invalid email or password.' });
    }

    const user = result.rows[0];

    if (!user.is_active) {
      return res.status(403).json({ success: false, error: 'Account has been deactivated. Please contact support.' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ success: false, error: 'Invalid email or password.' });
    }

    const token = generateToken(user);

    // Remove password_hash from response
    delete user.password_hash;

    await logActivity({
      userId: user.id,
      actionType: 'view',
      entityType: 'user',
      entityId: user.id,
      details: { action: 'user_login' },
      ipAddress: req.ip
    });

    return res.json({
      success: true,
      message: 'Login successful.',
      user,
      token
    });
  } catch (error) {
    next(error);
  }
};

