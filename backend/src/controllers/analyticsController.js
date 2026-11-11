const db = require('../config/db');

exports.getDashboardAnalytics = async (req, res, next) => {
  try {
    const isSpecialAdmin = req.user.role === 'admin';
    const userId = req.user.id;

    const caseScopeFilter = isSpecialAdmin
      ? ''
      : `WHERE (c.created_by = '${userId}' OR EXISTS (SELECT 1 FROM case_members cm WHERE cm.case_id = c.id AND cm.user_id = '${userId}'))`;

    // 1. Core Summary Metrics
    const countsQuery = `
      SELECT
        COUNT(*) AS total_cases,
        COUNT(*) FILTER (WHERE c.status IN ('filed', 'pending', 'hearing')) AS active_cases,
        COUNT(*) FILTER (WHERE c.status IN ('decided', 'closed')) AS closed_cases,
        (
          SELECT COUNT(*) FROM legal_documents ld
          JOIN cases c_sub ON ld.case_id = c_sub.id
          ${isSpecialAdmin ? '' : `WHERE (c_sub.created_by = '${userId}' OR EXISTS (SELECT 1 FROM case_members cm_sub WHERE cm_sub.case_id = c_sub.id AND cm_sub.user_id = '${userId}'))`}
        ) AS total_documents,
        (
          SELECT COUNT(*) FROM hearings h
          JOIN cases c_h ON h.case_id = c_h.id
          WHERE h.status = 'scheduled' AND h.hearing_date >= CURRENT_DATE
          ${isSpecialAdmin ? '' : `AND (c_h.created_by = '${userId}' OR EXISTS (SELECT 1 FROM case_members cm_h WHERE cm_h.case_id = c_h.id AND cm_h.user_id = '${userId}'))`}
        ) AS upcoming_hearings,
        (
          SELECT COUNT(*) FROM extracted_facts ef
          JOIN cases c_ef ON ef.case_id = c_ef.id
          ${isSpecialAdmin ? '' : `WHERE (c_ef.created_by = '${userId}' OR EXISTS (SELECT 1 FROM case_members cm_ef WHERE cm_ef.case_id = c_ef.id AND cm_ef.user_id = '${userId}'))`}
        ) AS total_facts
      FROM cases c
      ${caseScopeFilter}
    `;
    const countsRes = await db.query(countsQuery);
    const counts = countsRes.rows[0];

    // 2. Case Status Distribution (for charts)
    const statusQuery = `
      SELECT c.status, COUNT(*) AS count
      FROM cases c
      ${caseScopeFilter}
      GROUP BY c.status
      ORDER BY count DESC
    `;
    const statusRes = await db.query(statusQuery);

    // 3. Case Category Distribution (for charts)
    const categoryQuery = `
      SELECT c.category, COUNT(*) AS count
      FROM cases c
      ${caseScopeFilter}
      GROUP BY c.category
      ORDER BY count DESC
    `;
    const categoryRes = await db.query(categoryQuery);

    // 4. Priority Breakdown
    const priorityQuery = `
      SELECT c.priority, COUNT(*) AS count
      FROM cases c
      ${caseScopeFilter}
      GROUP BY c.priority
      ORDER BY count DESC
    `;
    const priorityRes = await db.query(priorityQuery);

    // 5. Recent Documents
    const recentDocsQuery = `
      SELECT 
        ld.id, ld.title, ld.file_name, ld.file_size_bytes, ld.document_category,
        ld.processing_status, ld.total_pages, ld.created_at,
        c.id AS case_id, c.case_number, c.title AS case_title
      FROM legal_documents ld
      JOIN cases c ON ld.case_id = c.id
      ${caseScopeFilter}
      ORDER BY ld.created_at DESC
      LIMIT 5
    `;
    const recentDocsRes = await db.query(recentDocsQuery);

    // 6. Upcoming Hearings
    const upcomingHearingsQuery = `
      SELECT 
        h.id, h.hearing_date, h.hearing_time, h.court_room, h.purpose,
        h.presiding_judge, h.status,
        c.id AS case_id, c.case_number, c.title AS case_title, c.court_name
      FROM hearings h
      JOIN cases c ON h.case_id = c.id
      WHERE h.status = 'scheduled' AND h.hearing_date >= CURRENT_DATE
      ${isSpecialAdmin ? '' : `AND (c.created_by = '${userId}' OR EXISTS (SELECT 1 FROM case_members cm WHERE cm.case_id = c.id AND cm.user_id = '${userId}'))`}
      ORDER BY h.hearing_date ASC, h.hearing_time ASC
      LIMIT 5
    `;
    const upcomingHearingsRes = await db.query(upcomingHearingsQuery);

    // 7. Recent AI Conversations
    const recentChatsQuery = `
      SELECT 
        ch.id, ch.title, ch.model_name, ch.updated_at,
        c.id AS case_id, c.case_number, c.title AS case_title,
        (SELECT COUNT(*) FROM messages m WHERE m.chat_id = ch.id) AS message_count
      FROM chats ch
      JOIN cases c ON ch.case_id = c.id
      WHERE ch.user_id = $1
      ORDER BY ch.updated_at DESC
      LIMIT 5
    `;
    const recentChatsRes = await db.query(recentChatsQuery, [userId]);

    // 8. Recent Activity Logs
    const recentActivitiesQuery = `
      SELECT 
        al.id, al.action_type, al.entity_type, al.entity_id, al.details, al.created_at,
        u.full_name AS user_name, u.role AS user_role,
        c.case_number, c.title AS case_title
      FROM activity_logs al
      LEFT JOIN users u ON al.user_id = u.id
      LEFT JOIN cases c ON al.case_id = c.id
      ${isSpecialAdmin ? '' : `WHERE (al.case_id IS NULL OR al.case_id IN (
        SELECT c_sub.id FROM cases c_sub 
        WHERE c_sub.created_by = '${userId}' OR EXISTS (SELECT 1 FROM case_members cm_sub WHERE cm_sub.case_id = c_sub.id AND cm_sub.user_id = '${userId}')
      ))`}
      ORDER BY al.created_at DESC
      LIMIT 8
    `;
    const recentActivitiesRes = await db.query(recentActivitiesQuery);

    return res.json({
      success: true,
      data: {
        counts: {
          total_cases: parseInt(counts.total_cases || 0, 10),
          active_cases: parseInt(counts.active_cases || 0, 10),
          closed_cases: parseInt(counts.closed_cases || 0, 10),
          total_documents: parseInt(counts.total_documents || 0, 10),
          upcoming_hearings: parseInt(counts.upcoming_hearings || 0, 10),
          total_facts: parseInt(counts.total_facts || 0, 10)
        },
        status_distribution: statusRes.rows.map(r => ({ status: r.status, count: parseInt(r.count, 10) })),
        category_distribution: categoryRes.rows.map(r => ({ category: r.category, count: parseInt(r.count, 10) })),
        priority_distribution: priorityRes.rows.map(r => ({ priority: r.priority, count: parseInt(r.count, 10) })),
        recent_documents: recentDocsRes.rows,
        upcoming_hearings: upcomingHearingsRes.rows,
        recent_chats: recentChatsRes.rows,
        recent_activities: recentActivitiesRes.rows
      }
    });
  } catch (error) {
    next(error);
  }
};
