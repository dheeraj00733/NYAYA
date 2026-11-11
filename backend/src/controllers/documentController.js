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

