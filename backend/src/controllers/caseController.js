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

    // Total count
    const countQuery = `SELECT COUNT(*) AS total FROM cases c ${whereClause}`;
    const countResult = await db.query(countQuery, params);
    const total = parseInt(countResult.rows[0].total, 10);

    // Data query with subquery aggregates
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

    // Fetch members
    const membersQuery = `
      SELECT cm.id, cm.role_in_case, cm.can_edit, cm.can_upload, cm.can_chat, cm.joined_at,
             u.id AS user_id, u.full_name, u.email, u.role, u.organization, u.avatar_url
      FROM case_members cm
      JOIN users u ON cm.user_id = u.id
      WHERE cm.case_id = $1
      ORDER BY cm.joined_at ASC
    `;
    const membersResult = await db.query(membersQuery, [id]);

    // Fetch parties
    const partiesQuery = `
      SELECT cp.id AS case_party_id, cp.party_role, cp.advocate_name, cp.legal_counsel_firm,
             p.id AS party_id, p.name, p.party_type, p.contact_email, p.contact_phone, p.address
      FROM case_parties cp
      JOIN parties p ON cp.party_id = p.id
      WHERE cp.case_id = $1
    `;
    const partiesResult = await db.query(partiesQuery, [id]);

    // Fetch recent hearings
    const hearingsQuery = `
      SELECT * FROM hearings WHERE case_id = $1 ORDER BY hearing_date ASC
    `;
    const hearingsResult = await db.query(hearingsQuery, [id]);

    // Fetch documents summary
    const docsQuery = `
      SELECT id, title, file_name, file_size_bytes, document_category, total_pages,
             processing_status, ocr_applied, summary_text, created_at
      FROM legal_documents WHERE case_id = $1 ORDER BY created_at DESC
    `;
    const docsResult = await db.query(docsQuery, [id]);

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

    // Check unique case number
    const existingCase = await db.query('SELECT id FROM cases WHERE case_number = $1', [case_number.trim()]);
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

    // Automatically enroll creator as lead_counsel in case_members
    await client.query(
      `INSERT INTO case_members (case_id, user_id, role_in_case, can_edit, can_upload, can_chat)
       VALUES ($1, $2, 'lead_counsel', TRUE, TRUE, TRUE)
       ON CONFLICT DO NOTHING`,
      [newCase.id, req.user.id]
    );

    // Process initial parties if provided
    for (const p of parties) {
      if (p.name && p.party_role) {
        let partyId = p.party_id;
        if (!partyId) {
          const insertParty = await client.query(
            `INSERT INTO parties (name, party_type, contact_email, contact_phone, address)
             VALUES ($1, $2, $3, $4, $5) RETURNING id`,
            [p.name, p.party_type || 'individual', p.contact_email || null, p.contact_phone || null, p.address || null]
          );
          partyId = insertParty.rows[0].id;
        }

        await client.query(
          `INSERT INTO case_parties (case_id, party_id, party_role, advocate_name, legal_counsel_firm)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT DO NOTHING`,
          [newCase.id, partyId, p.party_role, p.advocate_name || null, p.legal_counsel_firm || null]
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

exports.updateCase = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      category,
      status,
      priority,
      court_name,
      court_type,
      judge_name,
      filing_date,
      next_hearing_date,
      closure_date
    } = req.body;

    const updateQuery = `
      UPDATE cases
      SET 
        title = COALESCE($1, title),
        description = COALESCE($2, description),
        category = COALESCE($3, category),
        status = COALESCE($4, status),
        priority = COALESCE($5, priority),
        court_name = COALESCE($6, court_name),
        court_type = COALESCE($7, court_type),
        judge_name = COALESCE($8, judge_name),
        filing_date = COALESCE($9, filing_date),
        next_hearing_date = COALESCE($10, next_hearing_date),
        closure_date = COALESCE($11, closure_date),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $12
      RETURNING *
    `;

    const values = [
      title,
      description,
      category,
      status,
      priority,
      court_name,
      court_type,
      judge_name,
      filing_date,
      next_hearing_date,
      closure_date,
      id
    ];

    const result = await db.query(updateQuery, values);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Case not found.' });
    }

    await logActivity({
      caseId: id,
      userId: req.user.id,
      actionType: 'update',
      entityType: 'case',
      entityId: id,
      details: { updated_fields: Object.keys(req.body) },
      ipAddress: req.ip
    });

    return res.json({
      success: true,
      message: 'Case updated successfully.',
      case: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
};

exports.deleteCase = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Verify creator or admin
    const caseCheck = await db.query('SELECT id, created_by, case_number FROM cases WHERE id = $1', [id]);
    if (caseCheck.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Case not found.' });
    }

    const targetCase = caseCheck.rows[0];
    if (req.user.role !== 'admin' && targetCase.created_by !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Only the case creator or an administrator can permanently delete this case.'
      });
    }

    await db.query('DELETE FROM cases WHERE id = $1', [id]);

    await logActivity({
      caseId: id,
      userId: req.user.id,
      actionType: 'delete',
      entityType: 'case',
      entityId: id,
      details: { case_number: targetCase.case_number },
      ipAddress: req.ip
    });

    return res.json({
      success: true,
      message: 'Case and associated records deleted successfully.'
    });
  } catch (error) {
    next(error);
  }
};

exports.addCaseMember = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { user_id, role_in_case = 'co_counsel', can_edit = true, can_upload = true, can_chat = true } = req.body;

    if (!user_id) {
      return res.status(400).json({ success: false, error: 'user_id is required.' });
    }

    const insertQuery = `
      INSERT INTO case_members (case_id, user_id, role_in_case, can_edit, can_upload, can_chat)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (case_id, user_id) 
      DO UPDATE SET role_in_case = EXCLUDED.role_in_case, can_edit = EXCLUDED.can_edit,
                    can_upload = EXCLUDED.can_upload, can_chat = EXCLUDED.can_chat
      RETURNING *
    `;

    const result = await db.query(insertQuery, [id, user_id, role_in_case, can_edit, can_upload, can_chat]);

    return res.status(201).json({
      success: true,
      message: 'Case member enrolled successfully.',
      member: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
};

exports.removeCaseMember = async (req, res, next) => {
  try {
    const { id, userId } = req.params;

    await db.query('DELETE FROM case_members WHERE case_id = $1 AND user_id = $2', [id, userId]);

    return res.json({
      success: true,
      message: 'Case member removed.'
    });
  } catch (error) {
    next(error);
  }
};

exports.addCaseParty = async (req, res, next) => {
  const client = await db.getClient();
  try {
    const { id } = req.params;
    const { name, party_type = 'individual', contact_email, contact_phone, address, party_role, advocate_name, legal_counsel_firm } = req.body;

    if (!name || !party_role) {
      return res.status(400).json({ success: false, error: 'Party name and party_role are required.' });
    }

    await client.query('BEGIN');

    // Create party entity
    const partyRes = await client.query(
      `INSERT INTO parties (name, party_type, contact_email, contact_phone, address)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [name, party_type, contact_email || null, contact_phone || null, address || null]
    );
    const partyId = partyRes.rows[0].id;

    // Link in case_parties
    const linkRes = await client.query(
      `INSERT INTO case_parties (case_id, party_id, party_role, advocate_name, legal_counsel_firm)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (case_id, party_id, party_role)
       DO UPDATE SET advocate_name = EXCLUDED.advocate_name, legal_counsel_firm = EXCLUDED.legal_counsel_firm
       RETURNING *`,
      [id, partyId, party_role, advocate_name || null, legal_counsel_firm || null]
    );

    await client.query('COMMIT');

    return res.status(201).json({
      success: true,
      message: 'Party added to case successfully.',
      case_party: linkRes.rows[0]
    });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
};
