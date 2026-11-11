const jwt = require('jsonwebtoken');
const env = require('../config/env');
const db = require('../config/db');

const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = (authHeader && authHeader.split(' ')[1]) || req.query.token;

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Authentication token missing. Please log in.'
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired session token. Please re-authenticate.'
      });
    }

    // Verify active status in DB
    const result = await db.query(
      'SELECT id, email, full_name, role, organization, bar_council_id, is_active FROM users WHERE id = $1',
      [decoded.userId || decoded.id]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'User account not found.'
      });
    }

    const user = result.rows[0];
    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        error: 'Your account has been deactivated. Contact an administrator.'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('[Auth Middleware Error]:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal authentication validation failure.'
    });
  }
};

module.exports = {
  authenticateToken
};
