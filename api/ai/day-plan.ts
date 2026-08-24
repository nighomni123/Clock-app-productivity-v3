/**
 * Vercel Serverless Function: POST /api/ai/day-plan
 * Gemini-powered prioritized daily schedule. Key read from env server-side.
 */
import { handleDayPlan, type ApiRequest, type ApiResponse } from './_shared';

export const maxDuration = 60;

export default async function handler(req: ApiRequest, res: ApiResponse): Promise<void> {
  await handleDayPlan(req, res);
}
