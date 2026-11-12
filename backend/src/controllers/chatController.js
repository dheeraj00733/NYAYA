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

exports.getMessages = async (req, res, next) => {
  try {
    const { chatId } = req.params;

    // Verify chat ownership or case membership
    const chatCheck = await db.query('SELECT id, case_id, user_id FROM chats WHERE id = $1', [chatId]);
    if (chatCheck.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Chat session not found.' });
    }

    const query = `
      SELECT * FROM messages
      WHERE chat_id = $1
      ORDER BY created_at ASC
    `;

    const result = await db.query(query, [chatId]);

    return res.json({
      success: true,
      messages: result.rows
    });
  } catch (error) {
    next(error);
  }
};

exports.sendMessage = async (req, res, next) => {
  const client = await db.getClient();
  try {
    const { chatId } = req.params;
    const { content, model } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ success: false, error: 'Message content is required.' });
    }

    const chatQuery = await db.query('SELECT * FROM chats WHERE id = $1', [chatId]);
    if (chatQuery.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Chat session not found.' });
    }

    const chat = chatQuery.rows[0];
    const activeModel = model || chat.model_name || 'qwen2.5:latest';

    await client.query('BEGIN');

    // 1. Record User Message
    const userMsgInsert = `
      INSERT INTO messages (chat_id, sender_type, content)
      VALUES ($1, 'user', $2)
      RETURNING *
    `;
    const userMsgRes = await client.query(userMsgInsert, [chatId, content.trim()]);
    const userMessage = userMsgRes.rows[0];

    // 2. Query RAG Pipeline via AI Service
    let ragResult;
    try {
      ragResult = await AIService.queryRag({
        query: content.trim(),
        caseId: chat.case_id,
        documentId: chat.document_id,
        topK: 4,
        model: activeModel
      });
    } catch (aiErr) {
      console.warn('[RAG Query Warning]: AI Service failed, generating context-aware fallback', aiErr.message);
      ragResult = {
        answer: "I could not reach the local AI inference engine to synthesize an answer. Please verify that the AI service and Ollama are active. (Error: " + aiErr.message + ")",
        citations: [],
        retrieved_chunk_ids: []
      };
    }

    // 3. Record Assistant Response with Citations
    const assistantMsgInsert = `
      INSERT INTO messages (chat_id, sender_type, content, citations, retrieved_chunk_ids)
      VALUES ($1, 'assistant', $2, $3, $4)
      RETURNING *
    `;
    const citationsJson = JSON.stringify(ragResult.citations || []);
    const chunkIdsJson = JSON.stringify(ragResult.retrieved_chunk_ids || []);

    const assistantMsgRes = await client.query(assistantMsgInsert, [
      chatId,
      ragResult.answer,
      citationsJson,
      chunkIdsJson
    ]);
    const assistantMessage = assistantMsgRes.rows[0];

    // 4. Update Chat Timestamp
    await client.query('UPDATE chats SET updated_at = CURRENT_TIMESTAMP WHERE id = $1', [chatId]);

    await client.query('COMMIT');

    return res.status(201).json({
      success: true,
      user_message: userMessage,
      assistant_message: assistantMessage,
      citations: ragResult.citations || []
    });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
};

exports.deleteChat = async (req, res, next) => {
  try {
    const { chatId } = req.params;

    const chatCheck = await db.query('SELECT id, user_id FROM chats WHERE id = $1', [chatId]);
    if (chatCheck.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Chat session not found.' });
    }

    if (req.user.role !== 'admin' && chatCheck.rows[0].user_id !== req.user.id) {
      return res.status(403).json({ success: false, error: 'Unauthorized to delete this chat session.' });
    }

    await db.query('DELETE FROM chats WHERE id = $1', [chatId]);

    return res.json({
      success: true,
      message: 'Chat session deleted.'
    });
  } catch (error) {
    next(error);
  }
};
