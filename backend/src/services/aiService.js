const env = require('../config/env');

const AI_BASE_URL = env.AI_SERVICE_URL;

class AIService {
  static async checkHealth() {
    try {
      const response = await fetch(`${AI_BASE_URL}/health`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(3000)
      });
      if (!response.ok) throw new Error(`HTTP error ${response.status}`);
      return await response.json();
    } catch (err) {
      return { status: 'offline', error: err.message, fallback_active: true };
    }
  }

  static async getAvailableModels() {
    try {
      const response = await fetch(`${AI_BASE_URL}/models`, {
        method: 'GET',
        signal: AbortSignal.timeout(3000)
      });
      if (!response.ok) throw new Error(`HTTP error ${response.status}`);
      return await response.json();
    } catch (err) {
      return {
        available_models: ['qwen2.5:latest', 'llama3.2:latest', 'mistral:latest'],
        active_model: 'qwen2.5:latest',
        note: 'Default configuration (AI service offline)'
      };
    }
  }

  static async triggerDocumentProcessing(documentId, filePath, caseId) {
    try {
      const response = await fetch(`${AI_BASE_URL}/process-document`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          document_id: documentId,
          file_path: filePath,
          case_id: caseId
        }),
        signal: AbortSignal.timeout(120000) // 2 minutes for processing
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`AI Service Processing Failed: ${errorText}`);
      }

      return await response.json();
    } catch (err) {
      console.warn('[AIService Warning]: Document processing pipeline failed or offline:', err.message);
      return {
        status: 'queued_or_fallback',
        error: err.message,
        document_id: documentId
      };
    }
  }

  static async summarizeDocument(documentId, textContent = null) {
    try {
      const response = await fetch(`${AI_BASE_URL}/summarize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          document_id: documentId,
          text_content: textContent
        }),
        signal: AbortSignal.timeout(60000)
      });

      if (!response.ok) {
        throw new Error(`Summary generation error: ${response.statusText}`);
      }

      return await response.json();
    } catch (err) {
      console.warn('[AIService Warning]: Summarization error:', err.message);
      throw err;
    }
  }

  static async extractFacts(documentId, caseId) {
    try {
      const response = await fetch(`${AI_BASE_URL}/extract-facts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          document_id: documentId,
          case_id: caseId
        }),
        signal: AbortSignal.timeout(60000)
      });

      if (!response.ok) {
        throw new Error(`Fact extraction error: ${response.statusText}`);
      }

      return await response.json();
    } catch (err) {
      console.warn('[AIService Warning]: Fact extraction error:', err.message);
      throw err;
    }
  }

  static async queryRag({ query, caseId, documentId = null, topK = 4, model = 'qwen2.5:latest' }) {
    try {
      const response = await fetch(`${AI_BASE_URL}/rag/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          case_id: caseId,
          document_id: documentId,
          top_k: topK,
          model
        }),
        signal: AbortSignal.timeout(90000)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`RAG Query Error: ${errorText}`);
      }

      return await response.json();
    } catch (err) {
      console.warn('[AIService Warning]: RAG query error:', err.message);
      throw err;
    }
  }
}

module.exports = AIService;
