const db = require('../config/db');
const { logActivity } = require('../services/auditService');

exports.getHearings = async (req, res, next) => {
  try {
    const { case_id, from_date, to_date, status } = req.query;
    const params = [];
    const whereConditions = [];

    // Authorization
    if (req.user.role !== 'admin') {
      params.push(req.user.id);
      whereConditions.push(`EXISTS (
        SELECT 1 FROM cases c
        WHERE c.id = h.case_id AND (
          c.created_by = $${params.length} OR
          EXISTS (SELECT 1 FROM case_members cm WHERE cm.case_id = c.id AND cm.user_id = $${params.length})
        )
      )`);
    }

    if (case_id) {
      params.push(case_id);
      whereConditions.push(`h.case_id = $${params.length}`);
    }

    if (status) {
      params.push(status);
      whereConditions.push(`h.status = $${params.length}`);
    }

    if (from_date) {
      params.push(from_date);
      whereConditions.push(`h.hearing_date >= $${params.length}`);
    }

    if (to_date) {
      params.push(to_date);
      whereConditions.push(`h.hearing_date <= $${params.length}`);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const query = `
      SELECT
        h.*,
        c.case_number,
        c.title AS case_title,
        c.court_name,
        c.category AS case_category
      FROM hearings h
      JOIN cases c ON h.case_id = c.id
      ${whereClause}
      ORDER BY h.hearing_date ASC, h.hearing_time ASC
    `;

    const result = await db.query(query, params);

    return res.json({
      success: true,
      hearings: result.rows
    });
  } catch (error) {
    next(error);
  }
};

