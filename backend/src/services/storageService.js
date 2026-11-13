const env = require('../config/env');

class StorageService {
  static get bucket() {
    return 'legal-documents';
  }

  static isConfigured() {
    return !!(env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY);
  }

  static getHeaders() {
    return {
      'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      'apikey': env.SUPABASE_SERVICE_ROLE_KEY
    };
  }

  /**
   * Uploads a PDF buffer to private Supabase Storage
   * @param {Buffer} fileBuffer 
   * @param {string} storagePath - E.g. 'cases/<case_id>/<doc_uuid>.pdf'
   */
  static async uploadPdf(fileBuffer, storagePath) {
    if (!this.isConfigured()) {
      throw new Error('Supabase Storage is not configured. Provide SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
    }

    const cleanPath = storagePath.replace(/^\/+/, '');
    const url = `${env.SUPABASE_URL}/storage/v1/object/${this.bucket}/${cleanPath}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        ...this.getHeaders(),
        'Content-Type': 'application/pdf',
        'x-upsert': 'true'
      },
      body: fileBuffer
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Supabase Storage upload failed (${response.status}): ${errText}`);
    }

    return {
      bucket: this.bucket,
      path: cleanPath,
      fullPath: `${this.bucket}/${cleanPath}`
    };
  }

  /**
   * Generates a time-limited signed URL for private document retrieval
   * @param {string} storagePath 
   * @param {number} expiresIn - Seconds (default 3600 = 1 hour)
   */
  static async createSignedUrl(storagePath, expiresIn = 3600) {
    if (!this.isConfigured()) {
      throw new Error('Supabase Storage is not configured.');
    }

    const cleanPath = storagePath.replace(/^\/+/, '');
    const url = `${env.SUPABASE_URL}/storage/v1/object/sign/${this.bucket}/${cleanPath}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        ...this.getHeaders(),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ expiresIn })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Failed to create signed URL (${response.status}): ${errText}`);
    }

    const data = await response.json();
    const signedPath = data.signedURL || data.signedUrl;
    if (!signedPath) {
      throw new Error('Supabase Storage did not return a signed URL path.');
    }

    // Combine base URL with signed path
    const fullUrl = signedPath.startsWith('http')
      ? signedPath
      : `${env.SUPABASE_URL}/storage/v1${signedPath}`;

    return fullUrl;
  }

  /**
   * Fetches the file stream/buffer from Supabase Storage securely using service key
   * @param {string} storagePath 
   */
  static async getFileStream(storagePath) {
    if (!this.isConfigured()) {
      throw new Error('Supabase Storage is not configured.');
    }

    const cleanPath = storagePath.replace(/^\/+/, '');
    const url = `${env.SUPABASE_URL}/storage/v1/object/authenticated/${this.bucket}/${cleanPath}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders()
    });

    if (!response.ok) {
      throw new Error(`Failed to download from Supabase Storage (${response.status}): ${response.statusText}`);
    }

    return response;
  }

  /**
   * Deletes an object from private Supabase Storage
   * @param {string} storagePath 
   */
  static async deleteFile(storagePath) {
    if (!this.isConfigured()) return false;

    try {
      const cleanPath = storagePath.replace(/^\/+/, '');
      const url = `${env.SUPABASE_URL}/storage/v1/object/${this.bucket}`;

      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          ...this.getHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ prefixes: [cleanPath] })
      });

      return response.ok;
    } catch (err) {
      console.warn('[StorageService Warning]: Failed to delete file from Supabase Storage:', err.message);
      return false;
    }
  }
}

module.exports = StorageService;

