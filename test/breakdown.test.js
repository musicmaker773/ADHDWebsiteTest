const assert = require('assert');
const http = require('http');
const { createServer, parseSteps, SYSTEM_PROMPT, breakdownError } = require('../server');

const Steps = ['Read requirements', 'Gather sources', 'Make an outline', 'Write a draft', 'Review the draft', 'Submit the assignment'];
const output = (value) => ({ status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify(value) }] }] });

function request(server, method, pathname, data) {
  return new Promise((resolve, reject) => {
    const req = http.request({ hostname: '127.0.0.1', port: server.address().port, path: pathname, method }, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, body }));
    });
    req.on('error', reject);
    req.end(data === undefined ? undefined : JSON.stringify(data));
  });
}

(async () => {
  assert.deepStrictEqual(parseSteps(output({ Steps })), { Steps });
  for (const [error, expected] of [
    [{ status: 401 }, /authenticate/],
    [{ status: 429, code: 'insufficient_quota' }, /billing/],
    [{ status: 429, code: 'credit_balance_exhausted' }, /billing/],
    [{ status: 429 }, /rate limiting/],
    [{ status: 400 }, /configuration/],
    [{ status: 403 }, /permissions/],
    [{ status: 404 }, /model/],
    [{ status: 503 }, /temporarily unavailable/],
    [{ code: 'ENOTFOUND' }, /connect/],
    [{ code: 'ETIMEDOUT' }, /timed out/],
    [new Error('Invalid steps'), /format/],
  ]) assert(expected.test(breakdownError(error)));
  assert(!breakdownError(new Error('secret upstream error')).includes('secret'));
  for (const invalid of [{ Steps: ['One'] }, { steps: Steps }, { Steps: [...Steps, ''] }, { Steps: Array(13).fill('Step') }, { Steps: [...Steps, 7] }]) {
    assert.throws(() => parseSteps(output(invalid)));
  }
  assert.throws(() => parseSteps({ status: 'incomplete', output: [] }));
  assert.throws(() => parseSteps({ status: 'completed', output: [{ type: 'message', content: [{ type: 'refusal' }] }] }));
  let calls = 0;
  const server = createServer({ apiKey: 'test-key', generate: async (payload, key) => {
    calls++;
    assert.strictEqual(key, 'test-key');
    assert.deepStrictEqual(payload.input, [{ role: 'system', content: SYSTEM_PROMPT }, { role: 'user', content: 'Write a history paper' }]);
    assert.strictEqual(payload.text.format.strict, true);
    assert.deepStrictEqual(payload.text.format.schema.required, ['Steps']);
    return output({ Steps });
  } });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  try {
    const result = await request(server, 'POST', '/api/breakdown', { assignment: 'Write a history paper' });
    assert.strictEqual(result.status, 200);
    assert.deepStrictEqual(JSON.parse(result.body), { Steps });
    for (const assignment of ['', ' '.repeat(5), 'x'.repeat(4001), 123]) {
      assert.strictEqual((await request(server, 'POST', '/api/breakdown', { assignment })).status, 400);
    }
    assert.strictEqual(calls, 1);
    assert.strictEqual((await request(server, 'GET', '/api/breakdown')).status, 405);
    assert.strictEqual((await request(server, 'GET', '/')).status, 200);
    for (const file of ['/server.js', '/.env', '/.git/config']) assert.strictEqual((await request(server, 'GET', file)).status, 404);
  } finally { await new Promise((resolve) => server.close(resolve)); }

  for (const config of [{ apiKey: '' }, { apiKey: 'test', generate: async () => output({ Steps: [] }) }, { apiKey: 'test', generate: async () => { throw new Error('secret upstream error'); } }]) {
    const service = createServer(config);
    await new Promise((resolve) => service.listen(0, '127.0.0.1', resolve));
    try {
      const result = await request(service, 'POST', '/api/breakdown', { assignment: 'A paper' });
      assert.strictEqual(result.status, config.apiKey ? 502 : 503);
      assert(!result.body.includes('secret'));
    } finally { await new Promise((resolve) => service.close(resolve)); }
  }
  console.log('Passed: steps validation, API payload and checklist JSON, input errors, missing key, upstream failures, and private file protection.');
})().catch((error) => { console.error(error); process.exitCode = 1; });
