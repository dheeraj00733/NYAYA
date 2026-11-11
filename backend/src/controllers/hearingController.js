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

exports.createHearing = async (req, res, next) => {
  const client = await db.getClient();
  try {
    const {
      case_id,
      hearing_date,
      hearing_time,
      court_room,
      purpose = 'preliminary',
      presiding_judge,
      outcome_summary,
      next_steps,
      status = 'scheduled'
    } = req.body;

    if (!case_id || !hearing_date) {
      return res.status(400).json({ success: false, error: 'case_id and hearing_date are required.' });
    }

    await client.query('BEGIN');

    const insertQuery = `
      INSERT INTO hearings (
        case_id, hearing_date, hearing_time, court_room,
        purpose, presiding_judge, outcome_summary, next_steps, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;

    const values = [
      case_id,
      hearing_date,
      hearing_time || null,
      court_room || null,
      purpose,
      presiding_judge || null,
      outcome_summary || null,
      next_steps || null,
      status
    ];

    const result = await client.query(insertQuery, values);
    const newHearing = result.rows[0];

    // If status is 'scheduled' and date is today or future, check if it's the next hearing date for the case
    if (status === 'scheduled') {
      await client.query(
        `UPDATE cases
         SET next_hearing_date = (
           SELECT MIN(hearing_date) FROM hearings
           WHERE case_id = $1 AND status = 'scheduled' AND hearing_date >= CURRENT_DATE
         )
         WHERE id = $1`,
        [case_id]
      );
    }

    await client.query('COMMIT');

    await logActivity({
      caseId: case_id,
      userId: req.user.id,
      actionType: 'create',
      entityType: 'hearing',
      entityId: newHearing.id,
      details: { hearing_date, purpose, court_room },
      ipAddress: req.ip
    });

    return res.status(201).json({
      success: true,
      message: 'Hearing scheduled successfully.',
      hearing: newHearing
    });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
};

