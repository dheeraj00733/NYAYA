const db = require('../config/db');

/**
 * Persists an immutable record in activity_logs.
 */
const logActivity = async ({
  caseId,
  userId,
  actionType,
  entityType,
  entityId = null,
  details = {},
  ipAddress = null
}) => {
  try {
    const query = `
      INSERT INTO activity_logs (
        case_id, user_id, action_type, entity_type, entity_id, details, ip_address
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, created_at
    `;
    const values = [
      caseId,
      userId,
      actionType,
      entityType,
      entityId,
      JSON.stringify(details),
      ipAddress
    ];
    const result = await db.query(query, values);
    return result.rows[0];
  } catch (error) {
    console.error('[AuditService Error]: Failed to record activity log', error);
    return null;
  }
};

module.exports = {
  logActivity
};
