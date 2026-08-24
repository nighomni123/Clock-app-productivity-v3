/**
 * Server-side Gemini integration (never imported by client code).
 *
 * Single source of truth: api/_lib/gemini.ts — kept inside the Vercel `api/`
 * tree so serverless file tracing always bundles it. The self-hosted Express
 * server (server/index.ts) imports this re-export shim, so both entrypoints
 * share identical behavior. The API key is read from process.env only.
 */
export * from '../api/_lib/gemini';
