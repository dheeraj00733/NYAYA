const db = require('../config/db');

const logActivity = async ({ caseId, userId, actionType, entityType }) => {
  const query = `
    INSERT INTO activity_logs (case_id, user_id, action_type, entity_type)
    VALUES ($1, $2, $3, $4)
  `;
  const values = [caseId, userId, actionType, entityType];
  await db.query(query, values);
};

module.exports = {
  logActivity
};
