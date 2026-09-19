# ADHD Student Helper

Assignment Breakdown sends the textarea description to a JavaScript server, which calls the OpenAI Responses API using the supplied system prompt. Structured Outputs requests `{ "Steps": [...] }` with 6–12 strings. The server validates the result and the browser renders each string as a checklist item.

## Run locally

Install a supported Node.js LTS release. No npm dependencies are needed.

Set `OPENAI_API_KEY` in the server environment, then run `npm start`. Open http://localhost:3000/#breakdown and click **Break It Down**. Opening the HTML file directly or using a static-only server cannot run the API endpoint.

For example, enter the key privately in your terminal (Bash):

```bash
read -s -p 'OpenAI API key: ' OPENAI_API_KEY
export OPENAI_API_KEY
npm start
```

The default model is `gpt-4o-mini`; set `OPENAI_MODEL` to override it with a model supporting Structured Outputs. `PORT` defaults to `3000`. Environment files are ignored by Git but are not automatically loaded. Never put the key in browser JavaScript.

The server binds to localhost for local use. Public deployment needs a Node.js backend and appropriate access controls and rate limits for the paid endpoint.

Run `npm test` for mocked API integration tests. These do not spend API credits. A live generation requires your own configured API key.

API reference: [OpenAI Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs).
