const db = require('../config/db');

const logActivity = async ({ caseId, userId, actionType, entityType, entityId = null }) => {
  const query = `
    INSERT INTO activity_logs (case_id, user_id, action_type, entity_type, entity_id)
    VALUES ($1, $2, $3, $4, $5)
  `;
  const values = [caseId, userId, actionType, entityType, entityId];
  await db.query(query, values);
};

module.exports = {
  logActivity
};
