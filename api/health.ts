/**
 * Vercel Serverless Function: GET /api/health
 * Diagnostic parity with the Express server's /api/health — lets you verify
 * function deployment and env-var wiring independently of Gemini calls.
 */
interface ApiResponse {
  status(code: number): ApiResponse;
  json(payload: unknown): void;
}

export default async function handler(_req: unknown, res: ApiResponse): Promise<void> {
  res.status(200).json({
    ok: true,
    aiConfigured: Boolean(process.env.GEMINI_API_KEY),
    runtime: 'vercel-serverless'
  });
}
