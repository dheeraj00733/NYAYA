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

exports.updateHearing = async (req, res, next) => {
  const client = await db.getClient();
  try {
    const { id } = req.params;
    const {
      hearing_date,
      hearing_time,
      court_room,
      purpose,
      presiding_judge,
      outcome_summary,
      next_steps,
      status
    } = req.body;

    await client.query('BEGIN');

    const updateQuery = `
      UPDATE hearings
      SET 
        hearing_date = COALESCE($1, hearing_date),
        hearing_time = COALESCE($2, hearing_time),
        court_room = COALESCE($3, court_room),
        purpose = COALESCE($4, purpose),
        presiding_judge = COALESCE($5, presiding_judge),
        outcome_summary = COALESCE($6, outcome_summary),
        next_steps = COALESCE($7, next_steps),
        status = COALESCE($8, status),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $9
      RETURNING *
    `;

    const values = [
      hearing_date,
      hearing_time,
      court_room,
      purpose,
      presiding_judge,
      outcome_summary,
      next_steps,
      status,
      id
    ];

    const result = await client.query(updateQuery, values);
    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, error: 'Hearing not found.' });
    }

    const updatedHearing = result.rows[0];

    // Recalculate next hearing date on case
    await client.query(
      `UPDATE cases 
       SET next_hearing_date = (
         SELECT MIN(hearing_date) FROM hearings 
         WHERE case_id = $1 AND status = 'scheduled' AND hearing_date >= CURRENT_DATE
       )
       WHERE id = $1`,
      [updatedHearing.case_id]
    );

    await client.query('COMMIT');

    await logActivity({
      caseId: updatedHearing.case_id,
      userId: req.user.id,
      actionType: 'update',
      entityType: 'hearing',
      entityId: id,
      details: { status: updatedHearing.status, outcome: updatedHearing.outcome_summary },
      ipAddress: req.ip
    });

    return res.json({
      success: true,
      message: 'Hearing record updated.',
      hearing: updatedHearing
    });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
};

exports.deleteHearing = async (req, res, next) => {
  try {
    const { id } = req.params;

    const hearingCheck = await db.query('SELECT id, case_id FROM hearings WHERE id = $1', [id]);
    if (hearingCheck.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Hearing not found.' });
    }

    const { case_id } = hearingCheck.rows[0];
    await db.query('DELETE FROM hearings WHERE id = $1', [id]);

    // Recalculate next hearing date
    await db.query(
      `UPDATE cases 
       SET next_hearing_date = (
         SELECT MIN(hearing_date) FROM hearings 
         WHERE case_id = $1 AND status = 'scheduled' AND hearing_date >= CURRENT_DATE
       )
       WHERE id = $1`,
      [case_id]
    );

    return res.json({
      success: true,
      message: 'Hearing record removed.'
    });
  } catch (error) {
    next(error);
  }
};
