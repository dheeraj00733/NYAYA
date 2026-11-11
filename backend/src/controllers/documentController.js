const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const db = require('../config/db');
const AIService = require('../services/aiService');
const { logActivity } = require('../services/auditService');

exports.uploadDocument = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'PDF file is required for upload.' });
    }

    const { case_id, title, document_category = 'other' } = req.body;

    if (!case_id || !title) {
      // Remove uploaded file if validation fails
      if (req.file.path && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({ success: false, error: 'case_id and title are required.' });
    }

    // Verify case exists
    const caseCheck = await db.query('SELECT id, case_number FROM cases WHERE id = $1', [case_id]);
    if (caseCheck.rows.length === 0) {
      if (req.file.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      return res.status(404).json({ success: false, error: 'Associated case not found.' });
    }

    // Compute SHA256 checksum
    const fileBuffer = fs.readFileSync(req.file.path);
    const checksum = crypto.createHash('sha256').update(fileBuffer).digest('hex');

    const insertQuery = `
      INSERT INTO legal_documents (
        case_id, uploaded_by, title, file_name, file_path, file_size_bytes,
        mime_type, document_category, processing_status, checksum_sha256
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'processing', $9)
      RETURNING *
    `;

    const values = [
      case_id,
      req.user.id,
      title.trim(),
      req.file.originalname,
      req.file.path,
      req.file.size,
      req.file.mimetype || 'application/pdf',
      document_category,
      checksum
    ];

    const result = await db.query(insertQuery, values);
    const document = result.rows[0];

    await logActivity({
      caseId: case_id,
      userId: req.user.id,
      actionType: 'upload',
      entityType: 'document',
      entityId: document.id,
      details: { title: document.title, file_name: document.file_name, size: document.file_size_bytes },
      ipAddress: req.ip
    });

    // Trigger AI background processing (PyMuPDF extraction, chunking, embeddings, fact extraction)
    AIService.triggerDocumentProcessing(document.id, document.file_path, case_id)
      .then(async (procResult) => {
        console.log(`[Document Ingestion]: Document ${document.id} processed successfully`, procResult);
      })
      .catch((err) => {
        console.error(`[Document Ingestion]: Error processing document ${document.id}:`, err);
      });

    return res.status(201).json({
      success: true,
      message: 'Document uploaded successfully. AI processing initiated in background.',
      document
    });
  } catch (error) {
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    next(error);
  }
};

exports.getDocuments = async (req, res, next) => {
  try {
    const { case_id, category, search, status } = req.query;
    const params = [];
    const whereConditions = [];

    // Authorization check: Admins see all, others see cases they have access to
    if (req.user.role !== 'admin') {
      params.push(req.user.id);
      whereConditions.push(`EXISTS (
        SELECT 1 FROM cases c
        WHERE c.id = ld.case_id AND (
          c.created_by = $${params.length} OR
          EXISTS (SELECT 1 FROM case_members cm WHERE cm.case_id = c.id AND cm.user_id = $${params.length})
        )
      )`);
    }

    if (case_id) {
      params.push(case_id);
      whereConditions.push(`ld.case_id = $${params.length}`);
    }

    if (category) {
      params.push(category);
      whereConditions.push(`ld.document_category = $${params.length}`);
    }

    if (status) {
      params.push(status);
      whereConditions.push(`ld.processing_status = $${params.length}`);
    }

    if (search) {
      params.push(`%${search}%`);
      whereConditions.push(`(ld.title ILIKE $${params.length} OR ld.file_name ILIKE $${params.length})`);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const query = `
      SELECT
        ld.*,
        c.case_number,
        c.title AS case_title,
        u.full_name AS uploader_name,
        (SELECT COUNT(*) FROM document_chunks dc WHERE dc.document_id = ld.id) AS chunks_count,
        (SELECT COUNT(*) FROM extracted_facts ef WHERE ef.document_id = ld.id) AS facts_count
      FROM legal_documents ld
      JOIN cases c ON ld.case_id = c.id
      LEFT JOIN users u ON ld.uploaded_by = u.id
      ${whereClause}
      ORDER BY ld.created_at DESC
    `;

    const result = await db.query(query, params);

    return res.json({
      success: true,
      documents: result.rows
    });
  } catch (error) {
    next(error);
  }
};

exports.getDocumentById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const docQuery = `
      SELECT
        ld.*,
        c.case_number,
        c.title AS case_title,
        c.court_name,
        u.full_name AS uploader_name
      FROM legal_documents ld
      JOIN cases c ON ld.case_id = c.id
      LEFT JOIN users u ON ld.uploaded_by = u.id
      WHERE ld.id = $1
    `;
    const docResult = await db.query(docQuery, [id]);

    if (docResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Document not found.' });
    }

    const document = docResult.rows[0];

    // Fetch facts associated with this document
    const factsQuery = `
      SELECT * FROM extracted_facts WHERE document_id = $1 ORDER BY source_page ASC, confidence_score DESC
    `;
    const factsResult = await db.query(factsQuery, [id]);

    // Fetch chunks count
    const chunksCountResult = await db.query(
      'SELECT COUNT(*) AS total_chunks FROM document_chunks WHERE document_id = $1',
      [id]
    );

    return res.json({
      success: true,
      document: {
        ...document,
        facts: factsResult.rows,
        chunks_count: parseInt(chunksCountResult.rows[0].total_chunks, 10)
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.downloadDocument = async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await db.query('SELECT file_path, file_name, mime_type FROM legal_documents WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Document not found.' });
    }

    const { file_path, file_name, mime_type } = result.rows[0];

    const resolvedPath = path.isAbsolute(file_path)
      ? file_path
      : path.resolve(__dirname, '../../../', file_path);

    if (!fs.existsSync(resolvedPath)) {
      return res.status(404).json({
        success: false,
        error: 'The requested physical document file is missing or has been relocated.'
      });
    }

    res.setHeader('Content-Type', mime_type || 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${file_name}"`);

    const fileStream = fs.createReadStream(resolvedPath);
    fileStream.pipe(res);
  } catch (error) {
    next(error);
  }
};

exports.deleteDocument = async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      'SELECT id, case_id, file_path, file_name, title FROM legal_documents WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Document not found.' });
    }

    const document = result.rows[0];

    // Remove database record (cascades to chunks and facts)
    await db.query('DELETE FROM legal_documents WHERE id = $1', [id]);

    // Remove local file
    if (fs.existsSync(document.file_path)) {
      try {
        fs.unlinkSync(document.file_path);
      } catch (err) {
        console.warn('[File Deletion Warning]: Could not unlink file', err.message);
      }
    }

    await logActivity({
      caseId: document.case_id,
      userId: req.user.id,
      actionType: 'delete',
      entityType: 'document',
      entityId: id,
      details: { title: document.title, file_name: document.file_name },
      ipAddress: req.ip
    });

    return res.json({
      success: true,
      message: 'Document and its vector embeddings deleted successfully.'
    });
  } catch (error) {
    next(error);
  }
};

exports.summarizeDocument = async (req, res, next) => {
  try {
    const { id } = req.params;

    const docCheck = await db.query(
      'SELECT id, case_id, file_path, title, summary_text FROM legal_documents WHERE id = $1',
      [id]
    );

    if (docCheck.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Document not found.' });
    }

    const document = docCheck.rows[0];

    // Invoke AI service
    const summaryResponse = await AIService.summarizeDocument(document.id);

    // Save summary in legal_documents
    const summaryText = typeof summaryResponse === 'string' ? summaryResponse : summaryResponse.summary || JSON.stringify(summaryResponse);

    await db.query(
      `UPDATE legal_documents
       SET summary_text = $1, summary_generated_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [summaryText, id]
    );

    await logActivity({
      caseId: document.case_id,
      userId: req.user.id,
      actionType: 'summarize',
      entityType: 'document',
      entityId: id,
      details: { title: document.title },
      ipAddress: req.ip
    });

    return res.json({
      success: true,
      message: 'Summary generated successfully.',
      summary: summaryText,
      structured_data: summaryResponse.structured_data || null
    });
  } catch (error) {
    next(error);
  }
};

