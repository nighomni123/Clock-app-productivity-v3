/**
 * Shared glue for the Vercel Serverless Functions in api/ai/*.
 *
 * These handlers wrap the exact same Gemini logic used by the self-hosted
 * Express server (server/gemini.ts), so behavior is identical whether the
 * app runs full-stack locally or as static site + functions on Vercel.
 * The GEMINI_API_KEY comes from Vercel environment variables — never bundled.
 */
import {
  DayPlanRequestInput,
  MissingApiKeyError,
  WeeklyReviewRequestInput,
  generateDayPlan,
  generateWeeklyReview
} from '../../server/gemini';

/** Minimal structural types compatible with Vercel's Node.js request/response. */
export interface ApiRequest {
  method?: string;
  body?: unknown;
}

export interface ApiResponse {
  status(code: number): ApiResponse;
  json(payload: unknown): void;
}

function handleAiError(err: unknown, res: ApiResponse): void {
  if (err instanceof MissingApiKeyError) {
    res.status(503).json({ error: err.message });
    return;
  }
  console.error('[AI] request failed:', err);
  const message = err instanceof Error ? err.message : 'Unexpected server error.';
  res.status(502).json({ error: `Gemini request failed: ${message}` });
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

export async function handleDayPlan(req: ApiRequest, res: ApiResponse): Promise<void> {
  try {
    const body = (req.body ?? {}) as Partial<DayPlanRequestInput>;
    const context = body.context ?? ({} as Partial<DayPlanRequestInput['context']>);
    const input: DayPlanRequestInput = {
      tasks: asArray(body.tasks).map((t) => t as DayPlanRequestInput['tasks'][number]),
      journalEntries: asArray(body.journalEntries).map((j) => j as DayPlanRequestInput['journalEntries'][number]),
      context: {
        dayKey: String(context.dayKey ?? ''),
        nowISO: String(context.nowISO ?? new Date().toISOString()),
        defaultFocusMinutes: Number(context.defaultFocusMinutes) || 25,
        defaultBreakMinutes: Number(context.defaultBreakMinutes) || 5
      }
    };
    const plan = await generateDayPlan(input);
    res.status(200).json(plan);
  } catch (err) {
    handleAiError(err, res);
  }
}

export async function handleWeeklyReview(req: ApiRequest, res: ApiResponse): Promise<void> {
  try {
    const body = (req.body ?? {}) as Partial<WeeklyReviewRequestInput>;
    const input: WeeklyReviewRequestInput = {
      rangeLabel: String(body.rangeLabel ?? 'the last 7 days'),
      completedTasks: Number(body.completedTasks) || 0,
      openTasks: Number(body.openTasks) || 0,
      totalFocusMinutes: Math.round(Number(body.totalFocusMinutes)) || 0,
      sessionCount: Math.round(Number(body.sessionCount)) || 0,
      distractionCount: Math.round(Number(body.distractionCount)) || 0,
      dailyTargetMinutes: Math.round(Number(body.dailyTargetMinutes)) || 120,
      journalEntries: asArray(body.journalEntries).map((j) => j as WeeklyReviewRequestInput['journalEntries'][number])
    };
    const review = await generateWeeklyReview(input);
    res.status(200).json(review);
  } catch (err) {
    handleAiError(err, res);
  }
}
