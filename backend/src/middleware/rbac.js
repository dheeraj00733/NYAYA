const db = require('../config/db');

/**
 * Restrict endpoint to specific system roles (e.g. 'lawyer', 'admin')
 */
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized.' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: `Access denied. Requires one of roles: ${roles.join(', ')}.`
      });
    }
    next();
  };
};

/**
 * Enforces Case-Based Access Control (CBAC)
 * Verifies if the authenticated user has rights to the specified case
 */
const requireCaseAccess = (permissionType = 'view') => {
  return async (req, res, next) => {
    try {
      const caseId = req.params.caseId || req.params.id || req.body.case_id || req.query.case_id;

      if (!caseId) {
        return res.status(400).json({ success: false, error: 'Case identifier required for authorization check.' });
      }

      // System admins bypass case-specific restrictions
      if (req.user.role === 'admin') {
        req.caseRole = 'admin';
        return next();
      }

      // Check if user is creator
      const caseCheck = await db.query('SELECT id, created_by FROM cases WHERE id = $1', [caseId]);
      if (caseCheck.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Case not found.' });
      }

      if (caseCheck.rows[0].created_by === req.user.id) {
        req.caseRole = 'creator';
        return next();
      }

      // Check membership in case_members
      const memberQuery = await db.query(
        'SELECT role_in_case, can_edit, can_upload, can_chat FROM case_members WHERE case_id = $1 AND user_id = $2',
        [caseId, req.user.id]
      );

      if (memberQuery.rows.length === 0) {
        return res.status(403).json({
          success: false,
          error: 'Access restricted. You are not an assigned member of this legal matter.'
        });
      }

      const membership = memberQuery.rows[0];

      if (permissionType === 'edit' && !membership.can_edit) {
        return res.status(403).json({ success: false, error: 'You do not have permission to modify this case.' });
      }
      if (permissionType === 'upload' && !membership.can_upload) {
        return res.status(403).json({ success: false, error: 'You do not have permission to upload documents to this case.' });
      }
      if (permissionType === 'chat' && !membership.can_chat) {
        return res.status(403).json({ success: false, error: 'You do not have permission to initiate AI chat sessions in this case.' });
      }

      req.caseRole = membership.role_in_case;
      next();
    } catch (err) {
      console.error('[Case Access Middleware Error]:', err);
      return res.status(500).json({ success: false, error: 'Error verifying case authorization.' });
    }
  };
};

module.exports = {
  requireRole,
  requireCaseAccess
};
