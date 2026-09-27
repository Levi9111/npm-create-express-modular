import test, { mock } from 'node:test';
import assert from 'node:assert/strict';
import { reportInstall } from '../dist/telemetry.js';

test('reportInstall() skips sending when CEM_TELEMETRY=off', async () => {
  const originalEnv = process.env.CEM_TELEMETRY;
  process.env.CEM_TELEMETRY = 'off';

  let fetchCalled = false;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    fetchCalled = true;
    return new Response(JSON.stringify({ ok: true }));
  };

  try {
    await reportInstall('create');
    assert.equal(fetchCalled, false, 'fetch should not be called when CEM_TELEMETRY=off');
  } finally {
    globalThis.fetch = originalFetch;
    if (originalEnv === undefined) {
      delete process.env.CEM_TELEMETRY;
    } else {
      process.env.CEM_TELEMETRY = originalEnv;
    }
  }
});

test('reportInstall() sends expected payload and catches errors gracefully', async () => {
  const originalEnv = process.env.CEM_TELEMETRY;
  delete process.env.CEM_TELEMETRY;

  let requestBody = null;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    requestBody = JSON.parse(init.body);
    return new Response(JSON.stringify({ ok: true }));
  };

  try {
    await reportInstall('create', '1.0.0', 'npm');
    assert.ok(requestBody, 'fetch should have been called');
    assert.equal(requestBody.command, 'create');
    assert.equal(requestBody.cliVersion, '1.0.0');
    assert.equal(requestBody.packageManager, 'npm');
    assert.ok(requestBody.nodeVersion);
    assert.ok(requestBody.os);
    assert.ok(requestBody.anonId);
    assert.match(
      requestBody.anonId,
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      'anonId should be a valid UUID',
    );
  } finally {
    globalThis.fetch = originalFetch;
    if (originalEnv === undefined) {
      delete process.env.CEM_TELEMETRY;
    } else {
      process.env.CEM_TELEMETRY = originalEnv;
    }
  }
});

test('reportInstall() does not throw even if fetch rejects', async () => {
  const originalEnv = process.env.CEM_TELEMETRY;
  delete process.env.CEM_TELEMETRY;

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    throw new Error('Network error');
  };

  try {
    await assert.doesNotReject(async () => {
      await reportInstall('create');
    });
  } finally {
    globalThis.fetch = originalFetch;
    if (originalEnv === undefined) {
      delete process.env.CEM_TELEMETRY;
    } else {
      process.env.CEM_TELEMETRY = originalEnv;
    }
  }
});
