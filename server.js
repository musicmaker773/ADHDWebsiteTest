const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const SYSTEM_PROMPT = `Your job is to help a student break down their assignment into 6 - 12 steps. The user will provide a brief sentence describing the project and what it entails. What I want you to do with those steps is to put them in a list in JSON format.

Respond with a JSON in the following format:
{ "Steps": [
  "STEP 1",
  "STEP 2",
  …
] }
`;

function callOpenAI(payload, apiKey) {
  return new Promise((resolve, reject) => {
    const request = https.request('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    }, (response) => {
      let body = '';
      response.setEncoding('utf8');
      response.on('data', (chunk) => { body += chunk; });
      response.on('error', reject);
      response.on('end', () => {
        if (response.statusCode < 200 || response.statusCode >= 300) {
          const error = new Error('OpenAI request failed');
          error.status = response.statusCode;
          try {
            const details = JSON.parse(body).error || {};
            error.code = details.code;
            error.apiType = details.type;
          } catch (_) { /* Keep the HTTP status for non-JSON errors. */ }
          return reject(error);
        }
        try { resolve(JSON.parse(body)); } catch (error) { reject(error); }
      });
    });
    const timeout = setTimeout(() => request.destroy(Object.assign(new Error('OpenAI request timed out'), { code: 'ETIMEDOUT' })), 60000);
    request.on('close', () => clearTimeout(timeout));
    request.on('error', reject);
    request.end(JSON.stringify(payload));
  });
}

function parseSteps(response) {
  if (response.status !== 'completed') throw new Error('Incomplete response');
  const content = (response.output || []).filter((item) => item.type === 'message')
    .reduce((parts, item) => parts.concat(item.content || []), []);
  if (content.some((part) => part.type === 'refusal')) throw new Error('Refused response');
  const result = JSON.parse(content.filter((part) => part.type === 'output_text').map((part) => part.text).join(''));
  if (!result || !Array.isArray(result.Steps) || result.Steps.length < 6 || result.Steps.length > 12 ||
      result.Steps.some((step) => typeof step !== 'string' || !step.trim())) {
    throw new Error('Invalid steps');
  }
  return { Steps: result.Steps.map((step) => step.trim()) };
}

// Use fixed messages so upstream responses cannot expose credentials or prompt data.
function breakdownError(error) {
  if (error.status === 401) return 'OpenAI could not authenticate the API key. Check OPENAI_API_KEY and restart the server.';
  if (error.status === 403) return 'OpenAI denied access. Check the API key permissions and project access.';
  if (error.status === 429) {
    const billingCodes = ['insufficient_quota', 'credit_balance_exhausted', 'organization_spend_limit_exceeded', 'project_spend_limit_exceeded', 'organization_usage_limit_exceeded'];
    return billingCodes.includes(error.code) || error.apiType === 'insufficient_quota'
      ? 'OpenAI API credits or usage limits are exhausted. Check your API billing and project limits before retrying.'
      : 'OpenAI is rate limiting requests. Wait a moment, then try again.';
  }
  if (error.status === 404) return 'The configured OpenAI model or endpoint is unavailable. Check OPENAI_MODEL and model access.';
  if (error.status === 400) return 'OpenAI rejected the request configuration. The server model or JSON schema needs to be checked.';
  if (error.status >= 500) return 'OpenAI is temporarily unavailable. Please try again shortly.';
  if (error.code === 'ETIMEDOUT') return 'The connection to OpenAI timed out. Please try again.';
  if (['ENOTFOUND', 'EAI_AGAIN', 'ECONNRESET', 'ECONNREFUSED'].includes(error.code)) return 'The server could not connect to OpenAI. Check the internet connection and try again.';
  if (['CERT_HAS_EXPIRED', 'UNABLE_TO_VERIFY_LEAF_SIGNATURE', 'SELF_SIGNED_CERT_IN_CHAIN'].includes(error.code)) return 'The server could not verify the secure connection to OpenAI. Check the Node.js certificate configuration.';
  if (error.message === 'Refused response') return 'OpenAI could not help with that request. Try rephrasing the assignment.';
  if (error.message === 'Incomplete response') return 'OpenAI returned an incomplete response. Please try again.';
  if (error.message === 'Invalid steps' || error instanceof SyntaxError) return 'OpenAI returned an unexpected checklist format. Please try again.';
  return 'Unable to create steps right now. Please try again.';
}

const publicFiles = new Set(['index.html', 'task-one.html', 'task-two.html', 'task-three.html', 'script.js', 'styles.css']);
const contentTypes = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };

function createServer({ apiKey = process.env.OPENAI_API_KEY, model = process.env.OPENAI_MODEL || 'gpt-4o-mini', generate = callOpenAI } = {}) {
  return http.createServer(async (request, response) => {
    const json = (status, data) => {
      response.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      response.end(JSON.stringify(data));
    };
    const pathname = new URL(request.url, 'http://localhost').pathname;
    if (pathname === '/api/breakdown') {
      if (request.method !== 'POST') return json(405, { error: 'Use POST to create steps.' });
      if (request.headers.origin && request.headers.origin !== `http://${request.headers.host}` && request.headers.origin !== `https://${request.headers.host}`) {
        return json(403, { error: 'Request origin is not allowed.' });
      }
      let body = '';
      try {
        for await (const chunk of request) {
          body += chunk;
          if (Buffer.byteLength(body) > 20000) return json(413, { error: 'Assignment is too long.' });
        }
        let data;
        try { data = JSON.parse(body); } catch (_) { return json(400, { error: 'Send a valid JSON request.' }); }
        const assignment = data && typeof data.assignment === 'string' ? data.assignment.trim() : '';
        if (!assignment || assignment.length > 4000) return json(400, { error: 'Describe your assignment in 1–4,000 characters.' });
        if (!apiKey) return json(503, { error: 'The breakdown service needs an OpenAI API key configured on the server.' });
        const result = await generate({
          model,
          store: false,
          input: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: assignment },
          ],
          text: { format: {
            type: 'json_schema', name: 'assignment_steps', strict: true,
            schema: {
              type: 'object', additionalProperties: false, required: ['Steps'],
              properties: { Steps: { type: 'array', minItems: 6, maxItems: 12, items: { type: 'string' } } },
            },
          } },
        }, apiKey);
        return json(200, parseSteps(result));
      } catch (error) {
        return json(502, { error: breakdownError(error) });
      }
    }
    const file = pathname === '/' ? 'index.html' : pathname.slice(1);
    if (!['GET', 'HEAD'].includes(request.method) || !publicFiles.has(file)) {
      response.writeHead(404);
      return response.end('Not found');
    }
    fs.readFile(path.join(__dirname, file), (error, data) => {
      response.writeHead(error ? 500 : 200, { 'Content-Type': `${contentTypes[path.extname(file)]}; charset=utf-8`, 'X-Content-Type-Options': 'nosniff' });
      response.end(request.method === 'HEAD' ? undefined : error ? 'Unable to load page' : data);
    });
  });
}

if (require.main === module) {
  const port = process.env.PORT || 3000;
  createServer().listen(port, '127.0.0.1', () => console.log(`Open http://localhost:${port}/#breakdown`));
}

module.exports = { createServer, parseSteps, SYSTEM_PROMPT, breakdownError };
