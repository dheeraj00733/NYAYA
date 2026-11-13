const { test, describe, before, after } = require('node:test');
const assert = require('node:assert');
const StorageService = require('../src/services/storageService');
const env = require('../src/config/env');

describe('StorageService Integration & Security Suite', () => {
  const originalUrl = env.SUPABASE_URL;
  const originalKey = env.SUPABASE_SERVICE_ROLE_KEY;
  const originalNodeEnv = env.NODE_ENV;

  after(() => {
    env.SUPABASE_URL = originalUrl;
    env.SUPABASE_SERVICE_ROLE_KEY = originalKey;
    env.NODE_ENV = originalNodeEnv;
  });

  test('isConfigured returns false when Supabase credentials are missing', () => {
    env.SUPABASE_URL = undefined;
    env.SUPABASE_SERVICE_ROLE_KEY = undefined;
    assert.strictEqual(StorageService.isConfigured(), false);
  });

  test('isConfigured returns true when Supabase credentials are provided', () => {
    env.SUPABASE_URL = 'https://dummy-project.supabase.co';
    env.SUPABASE_SERVICE_ROLE_KEY = 'dummy-service-role-key';
    assert.strictEqual(StorageService.isConfigured(), true);
  });

  test('bucket name is strictly legal-documents', () => {
    assert.strictEqual(StorageService.bucket, 'legal-documents');
  });

  test('uploadPdf throws clear error when Supabase is unconfigured', async () => {
    env.SUPABASE_URL = undefined;
    env.SUPABASE_SERVICE_ROLE_KEY = undefined;
    await assert.rejects(
      async () => {
        await StorageService.uploadPdf(Buffer.from('%PDF-1.4 test'), 'cases/case-1/test.pdf');
      },
      /Supabase Storage is not configured/
    );
  });

  test('createSignedUrl handles relative signedURL paths from Supabase without exposing keys', async () => {
    env.SUPABASE_URL = 'https://xyzcompany.supabase.co';
    env.SUPABASE_SERVICE_ROLE_KEY = 'test-key-secret-123';

    // Mock global.fetch
    const originalFetch = global.fetch;
    global.fetch = async (url, options) => {
      assert.strictEqual(url, 'https://xyzcompany.supabase.co/storage/v1/object/sign/legal-documents/cases/c1/doc.pdf');
      assert.strictEqual(options.method, 'POST');
      assert.strictEqual(options.headers['apikey'], 'test-key-secret-123');
      return {
        ok: true,
        json: async () => ({ signedURL: '/object/sign/legal-documents/cases/c1/doc.pdf?token=temporary_token_abc' })
      };
    };

    try {
      const signedUrl = await StorageService.createSignedUrl('cases/c1/doc.pdf', 3600);
      assert.strictEqual(
        signedUrl,
        'https://xyzcompany.supabase.co/storage/v1/object/sign/legal-documents/cases/c1/doc.pdf?token=temporary_token_abc'
      );
      // Ensure the secret service key is NOT in the signed URL
      assert.strictEqual(signedUrl.includes('test-key-secret-123'), false);
    } finally {
      global.fetch = originalFetch;
    }
  });

  test('deleteFile sends correct deletion request for legal-documents bucket', async () => {
    env.SUPABASE_URL = 'https://xyzcompany.supabase.co';
    env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';

    const originalFetch = global.fetch;
    let deletedPrefix = null;

    global.fetch = async (url, options) => {
      assert.strictEqual(url, 'https://xyzcompany.supabase.co/storage/v1/object/legal-documents');
      assert.strictEqual(options.method, 'DELETE');
      const body = JSON.parse(options.body);
      deletedPrefix = body.prefixes[0];
      return { ok: true, json: async () => [{ name: 'doc.pdf' }] };
    };

    try {
      const ok = await StorageService.deleteFile('cases/c1/doc.pdf');
      assert.strictEqual(ok, true);
      assert.strictEqual(deletedPrefix, 'cases/c1/doc.pdf');
    } finally {
      global.fetch = originalFetch;
    }
  });

  test('getFileStream downloads securely from authenticated endpoint', async () => {
    env.SUPABASE_URL = 'https://xyzcompany.supabase.co';
    env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';

    const originalFetch = global.fetch;
    global.fetch = async (url, options) => {
      assert.strictEqual(url, 'https://xyzcompany.supabase.co/storage/v1/object/authenticated/legal-documents/cases/c1/doc.pdf');
      assert.strictEqual(options.method, 'GET');
      assert.strictEqual(options.headers['Authorization'], 'Bearer test-key');
      return {
        ok: true,
        arrayBuffer: async () => Buffer.from('%PDF-1.4 synthetic')
      };
    };

    try {
      const res = await StorageService.getFileStream('cases/c1/doc.pdf');
      assert.strictEqual(res.ok, true);
      const buf = await res.arrayBuffer();
      assert.strictEqual(buf.toString(), '%PDF-1.4 synthetic');
    } finally {
      global.fetch = originalFetch;
    }
  });
});
