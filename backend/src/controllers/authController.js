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

exports.getMe = async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT u.id, u.email, u.full_name, u.role, u.phone, u.bar_council_id, u.organization, u.avatar_url, u.created_at,
              (SELECT COUNT(*) FROM case_members cm WHERE cm.user_id = u.id) AS assigned_cases_count
       FROM users u WHERE u.id = $1`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found.' });
    }

    return res.json({
      success: true,
      user: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
};

exports.updateProfile = async (req, res, next) => {
  try {
    const { full_name, phone, organization, bar_council_id, avatar_url } = req.body;

    const query = `
      UPDATE users
      SET full_name = COALESCE($1, full_name),
          phone = COALESCE($2, phone),
          organization = COALESCE($3, organization),
          bar_council_id = COALESCE($4, bar_council_id),
          avatar_url = COALESCE($5, avatar_url),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $6
      RETURNING id, email, full_name, role, phone, bar_council_id, organization, avatar_url, updated_at
    `;
    const values = [full_name, phone, organization, bar_council_id, avatar_url, req.user.id];
    const result = await db.query(query, values);

    await logActivity({
      userId: req.user.id,
      actionType: 'update',
      entityType: 'user',
      entityId: req.user.id,
      details: { updated_fields: Object.keys(req.body) },
      ipAddress: req.ip
    });

    return res.json({
      success: true,
      message: 'Profile updated successfully.',
      user: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
};

exports.getAllUsers = async (req, res, next) => {
  try {
    const { role, search } = req.query;
    let query = 'SELECT id, email, full_name, role, organization, bar_council_id FROM users WHERE is_active = TRUE';
    const params = [];

    if (role) {
      params.push(role);
      query += ` AND role = $${params.length}`;
    }

    if (search) {
      params.push(`%${search}%`);
      query += ` AND (full_name ILIKE $${params.length} OR email ILIKE $${params.length} OR organization ILIKE $${params.length})`;
    }

    query += ' ORDER BY full_name ASC LIMIT 50';

    const result = await db.query(query, params);
    return res.json({
      success: true,
      users: result.rows
    });
  } catch (error) {
    next(error);
  }
};
