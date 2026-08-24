/**
 * Vercel Serverless Function: POST /api/ai/day-plan
 * Gemini-powered prioritized daily schedule. Key read from env server-side.
 */
import { handleDayPlan, type ApiRequest, type ApiResponse } from './_shared';

export const maxDuration = 60;

export default async function handler(req: ApiRequest, res: ApiResponse): Promise<void> {
  try {
    await handleDayPlan(req, res);
  } catch (err) {
    // Safety net: never let the client receive a bodyless platform 500.
    console.error('[day-plan] unhandled error:', err);
    res.status(500).json({ error: 'Unexpected server error.' });
  }
}
