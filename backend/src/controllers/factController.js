const db = require('../config/db');
const { logActivity } = require('../services/auditService');

exports.getFacts = async (req, res, next) => {
  try {
    const { case_id, document_id, fact_type, is_verified } = req.query;
    const params = [];
    const whereConditions = [];

    // Authorization
    if (req.user.role !== 'admin') {
      params.push(req.user.id);
      whereConditions.push(`EXISTS (
        SELECT 1 FROM cases c
        WHERE c.id = ef.case_id AND (
          c.created_by = $${params.length} OR
          EXISTS (SELECT 1 FROM case_members cm WHERE cm.case_id = c.id AND cm.user_id = $${params.length})
        )
      )`);
    }

    if (case_id) {
      params.push(case_id);
      whereConditions.push(`ef.case_id = $${params.length}`);
    }

    if (document_id) {
      params.push(document_id);
      whereConditions.push(`ef.document_id = $${params.length}`);
    }

    if (fact_type) {
      params.push(fact_type);
      whereConditions.push(`ef.fact_type = $${params.length}`);
    }

    if (is_verified !== undefined && is_verified !== '') {
      params.push(is_verified === 'true');
      whereConditions.push(`ef.is_verified = $${params.length}`);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const query = `
      SELECT
        ef.*,
        c.case_number,
        c.title AS case_title,
        ld.title AS document_title,
        ld.file_name AS document_file_name,
        u.full_name AS verifier_name
      FROM extracted_facts ef
      JOIN cases c ON ef.case_id = c.id
      LEFT JOIN legal_documents ld ON ef.document_id = ld.id
      LEFT JOIN users u ON ef.verified_by = u.id
      ${whereClause}
      ORDER BY ef.created_at DESC
    `;

    const result = await db.query(query, params);

    return res.json({
      success: true,
      facts: result.rows
    });
  } catch (error) {
    next(error);
  }
};

exports.createFact = async (req, res, next) => {
  try {
    const {
      case_id,
      document_id,
      fact_type,
      key_field,
      fact_value,
      source_page = 1,
      excerpt,
      confidence_score = 1.0
    } = req.body;

    if (!case_id || !fact_type || !key_field || !fact_value) {
      return res.status(400).json({
        success: false,
        error: 'case_id, fact_type, key_field, and fact_value are required.'
      });
    }

    const insertQuery = `
      INSERT INTO extracted_facts (
        case_id, document_id, fact_type, key_field, fact_value,
        source_page, excerpt, confidence_score, is_verified, verified_by, verified_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE, $9, CURRENT_TIMESTAMP)
      RETURNING *
    `;

    const values = [
      case_id,
      document_id || null,
      fact_type,
      key_field.trim(),
      fact_value.trim(),
      parseInt(source_page, 10) || 1,
      excerpt || null,
      parseFloat(confidence_score) || 1.0,
      req.user.id
    ];

    const result = await db.query(insertQuery, values);
    const fact = result.rows[0];

    await logActivity({
      caseId: case_id,
      userId: req.user.id,
      actionType: 'create',
      entityType: 'fact',
      entityId: fact.id,
      details: { key_field: fact.key_field, fact_value: fact.fact_value },
      ipAddress: req.ip
    });

    return res.status(201).json({
      success: true,
      message: 'Fact recorded successfully.',
      fact
    });
  } catch (error) {
    next(error);
  }
};

exports.verifyFact = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { is_verified = true, corrected_value, key_field } = req.body;

    const factCheck = await db.query('SELECT * FROM extracted_facts WHERE id = $1', [id]);
    if (factCheck.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Fact not found.' });
    }

    const currentFact = factCheck.rows[0];
    const newFactValue = corrected_value !== undefined ? corrected_value.trim() : currentFact.fact_value;
    const newKeyField = key_field !== undefined ? key_field.trim() : currentFact.key_field;

    const updateQuery = `
      UPDATE extracted_facts
      SET
        fact_value = $1,
        key_field = $2,
        is_verified = $3,
        verified_by = $4,
        verified_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $5
      RETURNING *
    `;

    const result = await db.query(updateQuery, [
      newFactValue,
      newKeyField,
      is_verified,
      req.user.id,
      id
    ]);

    await logActivity({
      caseId: currentFact.case_id,
      userId: req.user.id,
      actionType: 'verify',
      entityType: 'fact',
      entityId: id,
      details: {
        is_verified,
        was_corrected: newFactValue !== currentFact.fact_value,
        original_value: currentFact.fact_value,
        new_value: newFactValue
      },
      ipAddress: req.ip
    });

    return res.json({
      success: true,
      message: 'Fact reviewed and updated successfully.',
      fact: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
};

exports.deleteFact = async (req, res, next) => {
  try {
    const { id } = req.params;

    const factCheck = await db.query('SELECT id, case_id, key_field FROM extracted_facts WHERE id = $1', [id]);
    if (factCheck.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Fact not found.' });
    }

    await db.query('DELETE FROM extracted_facts WHERE id = $1', [id]);

    await logActivity({
      caseId: factCheck.rows[0].case_id,
      userId: req.user.id,
      actionType: 'delete',
      entityType: 'fact',
      entityId: id,
      details: { key_field: factCheck.rows[0].key_field },
      ipAddress: req.ip
    });

    return res.json({
      success: true,
      message: 'Extracted fact deleted.'
    });
  } catch (error) {
    next(error);
  }
};
