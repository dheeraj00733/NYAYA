const db = require('../config/db');
const AIService = require('../services/aiService');
const { logActivity } = require('../services/auditService');

exports.getChats = async (req, res, next) => {
  try {
    const { case_id, document_id } = req.query;
    const params = [req.user.id];
    const whereConditions = ['ch.user_id = $1'];

    if (case_id) {
      params.push(case_id);
      whereConditions.push(`ch.case_id = $${params.length}`);
    }

    if (document_id) {
      params.push(document_id);
      whereConditions.push(`ch.document_id = $${params.length}`);
    }

    const whereClause = `WHERE ${whereConditions.join(' AND ')}`;

    const query = `
      SELECT
        ch.*,
        c.case_number,
        c.title AS case_title,
        ld.title AS document_title,
        (SELECT COUNT(*) FROM messages m WHERE m.chat_id = ch.id) AS message_count,
        (SELECT content FROM messages m WHERE m.chat_id = ch.id ORDER BY m.created_at DESC LIMIT 1) AS last_message
      FROM chats ch
      JOIN cases c ON ch.case_id = c.id
      LEFT JOIN legal_documents ld ON ch.document_id = ld.id
      ${whereClause}
      ORDER BY ch.updated_at DESC
    `;

    const result = await db.query(query, params);

    return res.json({
      success: true,
      chats: result.rows
    });
  } catch (error) {
    next(error);
  }
};

exports.createChat = async (req, res, next) => {
  try {
    const { case_id, document_id, title, model_name = 'qwen2.5:latest' } = req.body;

    if (!case_id) {
      return res.status(400).json({ success: false, error: 'case_id is required.' });
    }

    // Default title from case or doc
    let chatTitle = title;
    if (!chatTitle) {
      const caseInfo = await db.query('SELECT case_number FROM cases WHERE id = $1', [case_id]);
      chatTitle = `Session - ${caseInfo.rows[0]?.case_number || 'Legal Matter'}`;
    }

    const insertQuery = `
      INSERT INTO chats (case_id, document_id, user_id, title, model_name)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;

    const result = await db.query(insertQuery, [
      case_id,
      document_id || null,
      req.user.id,
      chatTitle.trim(),
      model_name
    ]);

    const newChat = result.rows[0];

    await logActivity({
      caseId: case_id,
      userId: req.user.id,
      actionType: 'chat',
      entityType: 'chat',
      entityId: newChat.id,
      details: { title: newChat.title, model: newChat.model_name },
      ipAddress: req.ip
    });

    return res.status(201).json({
      success: true,
      message: 'Chat session created.',
      chat: newChat
    });
  } catch (error) {
    next(error);
  }
};

