const test = require('node:test');
const assert = require('node:assert/strict');

const { createDatabase } = require('./server.js');

test('database queue waits for available slot instead of throwing under concurrency', async () => {
  let inflight = 0;
  let maxInflight = 0;
  const fetchCalls = [];
  const database = createDatabase({
    postgrestUrl: 'http://localhost:3000',
    maxConnections: 2,
    delayMs: 0,
    fetchImpl: async (url, options) => {
      inflight += 1;
      maxInflight = Math.max(maxInflight, inflight);
      fetchCalls.push({ url, options });
      await Promise.resolve();
      inflight -= 1;
      return {
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ ok: true }),
      };
    },
  });

  await Promise.all([
    database('/products?select=*'),
    database('/products?select=*'),
    database('/products?select=*'),
  ]);

  assert.equal(maxInflight, 2, 'the database limiter should cap concurrency at the configured pool size');
  assert.equal(fetchCalls.length, 3, 'all queued requests should complete successfully');
});
