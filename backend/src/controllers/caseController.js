const db = require('../config/db');
const { logActivity } = require('../services/auditService');

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

exports.getCaseById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const caseQuery = `
      SELECT
        c.*,
        u.full_name AS creator_name,
        u.email AS creator_email
      FROM cases c
      LEFT JOIN users u ON c.created_by = u.id
      WHERE c.id = $1
    `;
    const caseResult = await db.query(caseQuery, [id]);

    if (caseResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Case not found.' });
    }

    const caseData = caseResult.rows[0];
    const membersResult = await db.query(`
      SELECT cm.id, cm.role_in_case, cm.can_edit, cm.can_upload, cm.can_chat, cm.joined_at,
             u.id AS user_id, u.full_name, u.email, u.role, u.organization, u.avatar_url
      FROM case_members cm
      JOIN users u ON cm.user_id = u.id
      WHERE cm.case_id = $1
      ORDER BY cm.joined_at ASC
    `, [id]);

    const partiesResult = await db.query(`
      SELECT cp.id AS case_party_id, cp.party_role, cp.advocate_name, cp.legal_counsel_firm,
             p.id AS party_id, p.name, p.party_type, p.contact_email, p.contact_phone, p.address
      FROM case_parties cp
      JOIN parties p ON cp.party_id = p.id
      WHERE cp.case_id = $1
    `, [id]);

    const hearingsResult = await db.query(
      'SELECT * FROM hearings WHERE case_id = $1 ORDER BY hearing_date ASC',
      [id]
    );
    const docsResult = await db.query(`
      SELECT id, title, file_name, file_size_bytes, document_category, total_pages,
             processing_status, ocr_applied, summary_text, created_at
      FROM legal_documents
      WHERE case_id = $1
      ORDER BY created_at DESC
    `, [id]);

    return res.json({
      success: true,
      case: {
        ...caseData,
        members: membersResult.rows,
        parties: partiesResult.rows,
        hearings: hearingsResult.rows,
        documents: docsResult.rows
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.createCase = async (req, res, next) => {
  const client = await db.getClient();
  try {
    const {
      case_number,
      title,
      description,
      category,
      priority = 'medium',
      court_name,
      court_type = 'High Court',
      judge_name,
      filing_date,
      next_hearing_date,
      parties = []
    } = req.body;

    if (!case_number || !title || !category || !court_name) {
      return res.status(400).json({
        success: false,
        error: 'Case number, title, category, and court name are required fields.'
      });
    }

    const existingCase = await db.query(
      'SELECT id FROM cases WHERE case_number = $1',
      [case_number.trim()]
    );
    if (existingCase.rows.length > 0) {
      return res.status(409).json({ success: false, error: 'A case with this Case Number already exists.' });
    }

    await client.query('BEGIN');
    const insertCaseQuery = `
      INSERT INTO cases (
        case_number, title, description, category, priority,
        court_name, court_type, judge_name, filing_date, next_hearing_date, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `;
    const caseValues = [
      case_number.trim(),
      title.trim(),
      description || null,
      category,
      priority,
      court_name.trim(),
      court_type,
      judge_name || null,
      filing_date || null,
      next_hearing_date || null,
      req.user.id
    ];
    const caseResult = await client.query(insertCaseQuery, caseValues);
    const newCase = caseResult.rows[0];

    await client.query(
      `INSERT INTO case_members (case_id, user_id, role_in_case, can_edit, can_upload, can_chat)
       VALUES ($1, $2, 'lead_counsel', TRUE, TRUE, TRUE)
       ON CONFLICT DO NOTHING`,
      [newCase.id, req.user.id]
    );

    for (const party of parties) {
      if (party.name && party.party_role) {
        let partyId = party.party_id;
        if (!partyId) {
          const insertParty = await client.query(
            `INSERT INTO parties (name, party_type, contact_email, contact_phone, address)
             VALUES ($1, $2, $3, $4, $5) RETURNING id`,
            [
              party.name,
              party.party_type || 'individual',
              party.contact_email || null,
              party.contact_phone || null,
              party.address || null
            ]
          );
          partyId = insertParty.rows[0].id;
        }

        await client.query(
          `INSERT INTO case_parties (case_id, party_id, party_role, advocate_name, legal_counsel_firm)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT DO NOTHING`,
          [
            newCase.id,
            partyId,
            party.party_role,
            party.advocate_name || null,
            party.legal_counsel_firm || null
          ]
        );
      }
    }

    await client.query('COMMIT');
    await logActivity({
      caseId: newCase.id,
      userId: req.user.id,
      actionType: 'create',
      entityType: 'case',
      entityId: newCase.id,
      details: { case_number: newCase.case_number, title: newCase.title },
      ipAddress: req.ip
    });

    return res.status(201).json({
      success: true,
      message: 'Case created successfully.',
      case: newCase
    });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
};
