const db = require('../config/db');

exports.getCases = async (req, res, next) => {
  try {
    const { search, status, category, priority, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;
    const params = [];

    let whereConditions = [];

    // Authorization filter: Admins see all, others see cases they created or are members of
    if (req.user.role !== 'admin') {
      params.push(req.user.id);
      whereConditions.push(`(c.created_by = $${params.length} OR EXISTS (
        SELECT 1 FROM case_members cm WHERE cm.case_id = c.id AND cm.user_id = $${params.length}
      ))`);
    }

    if (search) {
      params.push(`%${search}%`);
      whereConditions.push(`(c.title ILIKE $${params.length} OR c.case_number ILIKE $${params.length} OR c.court_name ILIKE $${params.length} OR c.description ILIKE $${params.length})`);
    }

    if (status) {
      params.push(status);
      whereConditions.push(`c.status = $${params.length}`);
    }

    if (category) {
      params.push(category);
      whereConditions.push(`c.category = $${params.length}`);
    }

    if (priority) {
      params.push(priority);
      whereConditions.push(`c.priority = $${params.length}`);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    const countQuery = `SELECT COUNT(*) AS total FROM cases c ${whereClause}`;
    const countResult = await db.query(countQuery, params);
    const total = parseInt(countResult.rows[0].total, 10);

    const dataQuery = `
      SELECT
        c.id, c.case_number, c.title, c.description, c.category, c.status, c.priority,
        c.court_name, c.court_type, c.judge_name, c.filing_date, c.next_hearing_date,
        c.created_by, c.created_at, c.updated_at,
        u.full_name AS creator_name,
        (SELECT COUNT(*) FROM legal_documents ld WHERE ld.case_id = c.id) AS documents_count,
        (SELECT COUNT(*) FROM hearings h WHERE h.case_id = c.id) AS hearings_count,
        (SELECT COUNT(*) FROM case_members cm WHERE cm.case_id = c.id) AS members_count,
        (SELECT COUNT(*) FROM extracted_facts ef WHERE ef.case_id = c.id) AS facts_count
      FROM cases c
      LEFT JOIN users u ON c.created_by = u.id
      ${whereClause}
      ORDER BY c.updated_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;

    const dataParams = [...params, limit, offset];
    const dataResult = await db.query(dataQuery, dataParams);

    return res.json({
      success: true,
      cases: dataResult.rows,
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
