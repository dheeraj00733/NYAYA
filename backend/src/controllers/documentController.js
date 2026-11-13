const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const env = require('../config/env');
const db = require('../config/db');
const AIService = require('../services/aiService');
const StorageService = require('../services/storageService');
const { logActivity } = require('../services/auditService');

exports.uploadDocument = async (req, res, next) => {
  let uploadedCloudPath = null;
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'PDF file is required for upload.' });
    }

    const { case_id, title, document_category = 'other' } = req.body;

    if (!case_id || !title) {
      // Remove temporary uploaded file if validation fails
      if (req.file.path && fs.existsSync(req.file.path)) {
        try { fs.unlinkSync(req.file.path); } catch (_) {}
      }
      return res.status(400).json({ success: false, error: 'case_id and title are required.' });
    }

    // Guard: In production, never silently fall back to local disk storage
    if (env.NODE_ENV === 'production' && !StorageService.isConfigured()) {
      if (req.file.path && fs.existsSync(req.file.path)) {
        try { fs.unlinkSync(req.file.path); } catch (_) {}
      }
      return res.status(500).json({
        success: false,
        error: '[Configuration Error]: Supabase Storage credentials (SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY) are required in production mode.'
      });
    }

    // Verify case exists
    const caseCheck = await db.query('SELECT id, case_number FROM cases WHERE id = $1', [case_id]);
    if (caseCheck.rows.length === 0) {
      if (req.file.path && fs.existsSync(req.file.path)) {
        try { fs.unlinkSync(req.file.path); } catch (_) {}
      }
      return res.status(404).json({ success: false, error: 'Associated case not found.' });
    }

    const fileBuffer = fs.readFileSync(req.file.path);
    const checksum = crypto.createHash('sha256').update(fileBuffer).digest('hex');

    let storedPath = req.file.path;
    let aiProcessingTarget = req.file.path;

    // Supabase Storage Integration (Production & Cloud Mode)
    if (StorageService.isConfigured()) {
      const docUuid = crypto.randomUUID();
      const safeFilename = path.basename(req.file.originalname).replace(/[^a-zA-Z0-9._-]/g, '_');
      const cloudStoragePath = `cases/${case_id}/${docUuid}-${safeFilename}`;

      await StorageService.uploadPdf(fileBuffer, cloudStoragePath);
      uploadedCloudPath = cloudStoragePath;
      storedPath = `supabase://${StorageService.bucket}/${cloudStoragePath}`;

      // Generate a 1-hour secure signed URL for the AI Service
      aiProcessingTarget = await StorageService.createSignedUrl(cloudStoragePath, 3600);

      // Clean up local temp file safely
      try {
        if (fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
      } catch (cleanupErr) {
        console.warn('[Storage Cleanup]: Error unlinking temp file:', cleanupErr.message);
      }
    }

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
      storedPath,
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

    // Trigger AI background processing with secure signed URL or local path
    AIService.triggerDocumentProcessing(document.id, aiProcessingTarget, case_id)
      .then(async (procResult) => {
        console.log(`[Document Ingestion]: Document ${document.id} processing status:`, procResult?.status || 'initiated');
      })
      .catch((err) => {
        console.error(`[Document Ingestion]: Error processing document ${document.id}:`, err.message);
      });

    return res.status(201).json({
      success: true,
      message: 'Document uploaded successfully. AI processing initiated in background.',
      document
    });
  } catch (error) {
    // Safe cleanup: delete orphaned cloud storage object if database insert failed
    if (uploadedCloudPath && StorageService.isConfigured()) {
      try {
        await StorageService.deleteFile(uploadedCloudPath);
      } catch (cleanupErr) {
        console.warn('[Orphan Cleanup Error]:', cleanupErr.message);
      }
    }
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      try { fs.unlinkSync(req.file.path); } catch (_) {}
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

    if (search && search.trim()) {
      params.push(`%${search.trim()}%`);
      whereConditions.push(`(ld.title ILIKE $${params.length} OR ld.file_name ILIKE $${params.length})`);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const query = `
      SELECT 
        ld.*,
        c.case_number,
        c.title AS case_title,
        u.full_name AS uploader_name
      FROM legal_documents ld
      JOIN cases c ON ld.case_id = c.id
      LEFT JOIN users u ON ld.uploaded_by = u.id
      ${whereClause}
      ORDER BY ld.created_at DESC
    `;

    const result = await db.query(query, params);
    return res.json({ success: true, count: result.rows.length, documents: result.rows });
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

    // 1. Supabase Storage download/streaming
    if (file_path.startsWith('supabase://')) {
      const cloudStoragePath = file_path.replace(/^supabase:\/\/[^/]+\//, '');
      if (StorageService.isConfigured()) {
        try {
          const storageResponse = await StorageService.getFileStream(cloudStoragePath);
          res.setHeader('Content-Type', mime_type || 'application/pdf');
          res.setHeader('Content-Disposition', `inline; filename="${file_name}"`);
          const arrayBuffer = await storageResponse.arrayBuffer();
          return res.send(Buffer.from(arrayBuffer));
        } catch (fetchErr) {
          return res.status(502).json({
            success: false,
            error: `Failed to retrieve document from cloud storage: ${fetchErr.message}`
          });
        }
      } else {
        return res.status(503).json({
          success: false,
          error: 'Supabase Storage credentials not configured on server to retrieve cloud file.'
        });
      }
    }

    // 2. Local filesystem download/streaming (development mode)
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

    // Remove from private storage
    if (document.file_path.startsWith('supabase://')) {
      const cloudStoragePath = document.file_path.replace(/^supabase:\/\/[^/]+\//, '');
      await StorageService.deleteFile(cloudStoragePath);
    } else if (fs.existsSync(document.file_path)) {
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
      entityId: document.id,
      details: { title: document.title, file_name: document.file_name },
      ipAddress: req.ip
    });

    return res.json({ success: true, message: 'Document and associated vector chunks deleted successfully.' });
  } catch (error) {
    next(error);
  }
};

exports.summarizeDocument = async (req, res, next) => {
  try {
    const { id } = req.params;

    const docQuery = await db.query('SELECT * FROM legal_documents WHERE id = $1', [id]);
    if (docQuery.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Document not found.' });
    }

    const document = docQuery.rows[0];

    // Fetch chunks
    const chunksRes = await db.query(
      'SELECT content FROM document_chunks WHERE document_id = $1 ORDER BY chunk_index ASC LIMIT 5',
      [id]
    );

    const textContent = chunksRes.rows.map(c => c.content).join('\n\n');

    const summaryResult = await AIService.summarizeDocument(id, textContent);

    // Update document with new summary
    if (summaryResult && summaryResult.summary) {
      await db.query(
        'UPDATE legal_documents SET summary_text = $1, summary_generated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [summaryResult.summary, id]
      );
    }

    await logActivity({
      caseId: document.case_id,
      userId: req.user.id,
      actionType: 'summarize',
      entityType: 'document',
      entityId: document.id,
      details: { title: document.title, generator: summaryResult.generator },
      ipAddress: req.ip
    });

    return res.json({
      success: true,
      summary: summaryResult.summary,
      generator: summaryResult.generator
    });
  } catch (error) {
    next(error);
  }
};
