/**
 * Vercel Serverless Function: POST /api/ai/weekly-review
 * Gemini-powered weekly review (3 actionable insights). Key stays server-side.
 */
import { handleWeeklyReview, type ApiRequest, type ApiResponse } from './_shared';

export const maxDuration = 60;

export default async function handler(req: ApiRequest, res: ApiResponse): Promise<void> {
  await handleWeeklyReview(req, res);
}
