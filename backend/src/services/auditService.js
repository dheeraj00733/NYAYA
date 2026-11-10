const db = require('../config/db');

const logActivity = async ({
  caseId,
  userId,
  actionType,
  entityType,
  entityId = null,
  details = {}
}) => {
  const query = `
    INSERT INTO activity_logs (case_id, user_id, action_type, entity_type, entity_id, details)
    VALUES ($1, $2, $3, $4, $5, $6)
  `;
  const values = [caseId, userId, actionType, entityType, entityId, JSON.stringify(details)];
  await db.query(query, values);
};

module.exports = {
  logActivity
};
