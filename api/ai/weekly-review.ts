/**
 * Vercel Serverless Function: POST /api/ai/weekly-review
 * Gemini-powered weekly review (3 actionable insights). Key stays server-side.
 */
import { handleWeeklyReview, type ApiRequest, type ApiResponse } from './_shared.js';

export const maxDuration = 60;

export default async function handler(req: ApiRequest, res: ApiResponse): Promise<void> {
  try {
    await handleWeeklyReview(req, res);
  } catch (err) {
    // Safety net: never let the client receive a bodyless platform 500.
    console.error('[weekly-review] unhandled error:', err);
    res.status(500).json({ error: 'Unexpected server error.' });
  }
}
