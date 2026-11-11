const db = require('../config/db');

exports.getActivities = async (req, res, next) => {
  try {
    const { case_id, action_type, entity_type, limit = 50, page = 1 } = req.query;
    const offset = (page - 1) * limit;
    const params = [];
    const whereConditions = [];

    if (req.user.role !== 'admin') {
      params.push(req.user.id);
      whereConditions.push(`(al.case_id IS NULL OR al.case_id IN (
        SELECT c.id FROM cases c 
        WHERE c.created_by = $${params.length} OR EXISTS (
          SELECT 1 FROM case_members cm WHERE cm.case_id = c.id AND cm.user_id = $${params.length}
        )
      ))`);
    }

    if (case_id) {
      params.push(case_id);
      whereConditions.push(`al.case_id = $${params.length}`);
    }

    if (action_type) {
      params.push(action_type);
      whereConditions.push(`al.action_type = $${params.length}`);
    }

    if (entity_type) {
      params.push(entity_type);
      whereConditions.push(`al.entity_type = $${params.length}`);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const countQuery = `SELECT COUNT(*) AS total FROM activity_logs al ${whereClause}`;
    const countRes = await db.query(countQuery, params);
    const total = parseInt(countRes.rows[0].total, 10);

    const dataQuery = `
      SELECT 
        al.*,
        u.full_name AS user_name,
        u.email AS user_email,
        u.role AS user_role,
        c.case_number,
        c.title AS case_title
      FROM activity_logs al
      LEFT JOIN users u ON al.user_id = u.id
      LEFT JOIN cases c ON al.case_id = c.id
      ${whereClause}
      ORDER BY al.created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;

    const dataRes = await db.query(dataQuery, [...params, limit, offset]);

    return res.json({
      success: true,
      activities: dataRes.rows,
      pagination: {
        total,
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    next(error);
  }
};
