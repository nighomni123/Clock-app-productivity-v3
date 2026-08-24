/**
 * Server-side Gemini integration (never imported by client code).
 *
 * The API key is read from process.env — loaded from .env by dotenv in
 * server/index.ts — and is therefore never bundled into the Vite client.
 */
import { GoogleGenAI } from '@google/genai';

const MODEL = 'gemini-3.6-flash';
const REQUEST_TIMEOUT_MS = 60_000;

export class MissingApiKeyError extends Error {
  constructor() {
    super('GEMINI_API_KEY is not configured on the server. Add it to .env and restart the server.');
    this.name = 'MissingApiKeyError';
  }
}

// ---------------------------------------------------------------------------
// Request payload shapes (validated before use)
// ---------------------------------------------------------------------------

export interface PlanTaskInput {
  title: string;
  priority?: string;
  estimatedMinutes?: number;
  complete?: boolean;
  dueDate?: string;
}

export interface PlanJournalInput {
  title: string;
  category?: string;
  notes?: string;
  durationMinutes?: number;
}

export interface DayPlanRequestInput {
  tasks: PlanTaskInput[];
  journalEntries: PlanJournalInput[];
  context: {
    dayKey: string;
    nowISO: string;
    defaultFocusMinutes: number;
    defaultBreakMinutes: number;
  };
}

export interface WeeklyReviewRequestInput {
  rangeLabel: string;
  completedTasks: number;
  openTasks: number;
  totalFocusMinutes: number;
  sessionCount: number;
  distractionCount: number;
  dailyTargetMinutes: number;
  journalEntries: PlanJournalInput[];
}

// ---------------------------------------------------------------------------
// Response shapes returned to the client
// ---------------------------------------------------------------------------

export interface PlannedBlockOutput {
  title: string;
  priority: 'high' | 'medium' | 'low';
  focusMinutes: number;
  breakMinutes: number;
  startMinutesFromNow?: number;
  rationale?: string;
}

export interface DayPlanOutput {
  overview: string;
  totalFocusMinutes: number;
  blocks: PlannedBlockOutput[];
}

export type InsightCategory = 'focus' | 'consistency' | 'wellbeing' | 'tasks';

export interface WeeklyInsightOutput {
  title: string;
  detail: string;
  category: InsightCategory;
}

export interface WeeklyReviewOutput {
  summary: string;
  insights: WeeklyInsightOutput[];
}

// ---------------------------------------------------------------------------
// Gemini client
// ---------------------------------------------------------------------------

let cachedClient: GoogleGenAI | null = null;

function getClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new MissingApiKeyError();
  if (!cachedClient) cachedClient = new GoogleGenAI({ apiKey });
  return cachedClient;
}

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`Gemini request timed out after ${Math.round(ms / 1000)}s`)), ms);
      })
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/** Extract the model's JSON payload, tolerating markdown fences. */
function parseModelJson(text: string | undefined): Record<string, unknown> {
  const raw = (text ?? '').trim();
  if (!raw) throw new Error('Gemini returned an empty response.');
  const withoutFences = raw
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```\s*$/, '')
    .trim();
  try {
    return JSON.parse(withoutFences) as Record<string, unknown>;
  } catch {
    throw new Error('Gemini returned malformed JSON.');
  }
}

// ---------------------------------------------------------------------------
// Sanitizers — never trust model output blindly
// ---------------------------------------------------------------------------

function clampInt(value: unknown, fallback: number, min: number, max: number): number {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function clampString(value: unknown, maxLength: number): string {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function coercePriority(value: unknown): 'high' | 'medium' | 'low' {
  const v = String(value ?? '').toLowerCase();
  if (v.includes('high')) return 'high';
  if (v.includes('low')) return 'low';
  return 'medium';
}

const INSIGHT_CATEGORIES: InsightCategory[] = ['focus', 'consistency', 'wellbeing', 'tasks'];

function coerceCategory(value: unknown): InsightCategory {
  const v = String(value ?? '').toLowerCase();
  return (INSIGHT_CATEGORIES.find((c) => c === v) ?? 'focus') as InsightCategory;
}

// ---------------------------------------------------------------------------
// JSON response schemas for structured output
// ---------------------------------------------------------------------------

const DAY_PLAN_JSON_SCHEMA = {
  type: 'object',
  properties: {
    overview: { type: 'string', description: 'One or two sentences describing today’s strategy.' },
    blocks: {
      type: 'array',
      minItems: 1,
      maxItems: 12,
      items: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Action-first block name derived from a task.' },
          priority: { type: 'string', enum: ['high', 'medium', 'low'] },
          focusMinutes: { type: 'number', minimum: 10, maximum: 120 },
          breakMinutes: { type: 'number', minimum: 3, maximum: 30 },
          startMinutesFromNow: { type: 'number', minimum: 0, maximum: 720 },
          rationale: { type: 'string', description: 'Why this task, this length, this order.' }
        },
        required: ['title', 'priority', 'focusMinutes', 'breakMinutes', 'rationale'],
        additionalProperties: false
      }
    }
  },
  required: ['overview', 'blocks'],
  additionalProperties: false
} as const;

const WEEKLY_REVIEW_JSON_SCHEMA = {
  type: 'object',
  properties: {
    summary: { type: 'string', description: 'Two-sentence overall week summary.' },
    insights: {
      type: 'array',
      minItems: 3,
      maxItems: 3,
      items: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Short insight headline (max ~8 words).' },
          detail: {
            type: 'string',
            description: '2-3 sentences citing the provided numbers plus one concrete action for next week.'
          },
          category: { type: 'string', enum: ['focus', 'consistency', 'wellbeing', 'tasks'] }
        },
        required: ['title', 'detail', 'category'],
        additionalProperties: false
      }
    }
  },
  required: ['summary', 'insights'],
  additionalProperties: false
} as const;

// ---------------------------------------------------------------------------
// Prompt builders
// ---------------------------------------------------------------------------

function buildDayPlanPrompt(input: DayPlanRequestInput): string {
  const tasks = input.tasks.slice(0, 50).map((t) => ({
    title: clampString(t.title, 160),
    priority: t.priority || 'medium',
    estimatedMinutes: t.estimatedMinutes ?? null,
    complete: Boolean(t.complete),
    dueDate: t.dueDate || null
  }));
  const journal = input.journalEntries.slice(0, 25).map((j) => ({
    title: clampString(j.title, 140),
    category: j.category || null,
    notes: j.notes ? clampString(j.notes, 200) : null,
    durationMinutes: j.durationMinutes ?? null
  }));

  return [
    `Today is ${input.context.dayKey} (${input.context.nowISO}).`,
    `The student's usual timer defaults are ${input.context.defaultFocusMinutes}m focus / ${input.context.defaultBreakMinutes}m break.`,
    '',
    'TASK QUEUE:',
    JSON.stringify(tasks),
    '',
    'RECENT JOURNAL ENTRIES (newest first):',
    JSON.stringify(journal),
    '',
    'Build a prioritized schedule of focus blocks for the rest of today.',
    'Rules:',
    '- Cover every incomplete task; drop completed ones unless follow-up is clearly needed.',
    '- Order blocks by priority and any deadlines found in dueDate values.',
    '- Choose focus-block lengths between 15 and 90 minutes based on each task\'s size and the stamina implied by recent journal entries.',
    '- Pair every focus block with a short break (3-20 minutes).',
    '- Keep total focus time under about 6 hours and set startMinutesFromNow so the plan starts soon and flows realistically.',
    '- Write rationales that reference the student\'s actual tasks or journal context.'
  ].join('\n');
}

const DAY_PLAN_SYSTEM_INSTRUCTION =
  'You are Focus Coach, an expert study-productivity planner inside a Pomodoro-style study app. ' +
  'Given a student’s task queue and recent journal entries, you design realistic, motivating daily schedules of focus blocks with suggested focus-block lengths. ' +
  'Always respond with JSON matching the requested schema and nothing else.';

function buildWeeklyReviewPrompt(input: WeeklyReviewRequestInput): string {
  const journal = input.journalEntries.slice(0, 30).map((j) => ({
    title: clampString(j.title, 140),
    category: j.category || null,
    notes: j.notes ? clampString(j.notes, 200) : null,
    durationMinutes: j.durationMinutes ?? null
  }));

  return [
    `Review window: ${input.rangeLabel}.`,
    `Daily focus target: ${input.dailyTargetMinutes} minutes.`,
    `Completed tasks this week: ${input.completedTasks}. Open tasks remaining: ${input.openTasks}.`,
    `Total focus time this week: ${input.totalFocusMinutes} minutes across roughly ${input.sessionCount} sessions.`,
    `Distractions logged: ${input.distractionCount}.`,
    '',
    'JOURNAL ENTRIES FROM THIS WEEK (newest first):',
    JSON.stringify(journal),
    '',
    'Produce exactly 3 actionable insights summarizing the student\'s week.',
    'Rules:',
    '- Insight 1 must address completed tasks vs open workload ("tasks").',
    '- Insight 2 must address total focus time versus the daily target and session rhythm ("focus" or "consistency").',
    '- Insight 3 must interpret the emotional tone of the journal entries ("wellbeing") — infer tone from titles/notes/categories.',
    '- Every insight cites at least one concrete number above and ends with one specific action for next week.'
  ].join('\n');
}

const WEEKLY_REVIEW_SYSTEM_INSTRUCTION =
  'You are Focus Coach, an encouraging but honest study-analytics coach. You summarize a student’s weekly study data into exactly three concrete, actionable insights. ' +
  'Always respond with JSON matching the requested schema and nothing else.';

// ---------------------------------------------------------------------------
// Public API used by server/index.ts
// ---------------------------------------------------------------------------

export async function generateDayPlan(input: DayPlanRequestInput): Promise<DayPlanOutput> {
  const ai = getClient();
  const response = await withTimeout(
    ai.models.generateContent({
      model: MODEL,
      contents: buildDayPlanPrompt(input),
      config: {
        systemInstruction: DAY_PLAN_SYSTEM_INSTRUCTION,
        responseMimeType: 'application/json',
        responseJsonSchema: DAY_PLAN_JSON_SCHEMA,
        temperature: 0.7
      }
    }),
    REQUEST_TIMEOUT_MS
  );

  const parsed = parseModelJson(response.text);
  const rawBlocks = Array.isArray(parsed.blocks) ? parsed.blocks : [];
  const blocks: PlannedBlockOutput[] = rawBlocks.slice(0, 12).map((b) => {
    const block = (b ?? {}) as Record<string, unknown>;
    const out: PlannedBlockOutput = {
      title: clampString(block.title, 160) || 'Untitled focus block',
      priority: coercePriority(block.priority),
      focusMinutes: clampInt(block.focusMinutes, input.context.defaultFocusMinutes, 10, 120),
      breakMinutes: clampInt(block.breakMinutes, input.context.defaultBreakMinutes, 3, 30),
      rationale: clampString(block.rationale, 280) || undefined
    };
    if (block.startMinutesFromNow !== undefined && block.startMinutesFromNow !== null) {
      out.startMinutesFromNow = clampInt(block.startMinutesFromNow, 0, 0, 720);
    }
    return out;
  });

  if (!blocks.length) throw new Error('Gemini did not return any schedule blocks.');

  return {
    overview: clampString(parsed.overview, 400) || 'Here is your suggested plan for today.',
    totalFocusMinutes: blocks.reduce((sum, b) => sum + b.focusMinutes, 0),
    blocks
  };
}

export async function generateWeeklyReview(input: WeeklyReviewRequestInput): Promise<WeeklyReviewOutput> {
  const ai = getClient();
  const response = await withTimeout(
    ai.models.generateContent({
      model: MODEL,
      contents: buildWeeklyReviewPrompt(input),
      config: {
        systemInstruction: WEEKLY_REVIEW_SYSTEM_INSTRUCTION,
        responseMimeType: 'application/json',
        responseJsonSchema: WEEKLY_REVIEW_JSON_SCHEMA,
        temperature: 0.6
      }
    }),
    REQUEST_TIMEOUT_MS
  );

  const parsed = parseModelJson(response.text);
  const rawInsights = Array.isArray(parsed.insights) ? parsed.insights : [];
  const insights: WeeklyInsightOutput[] = rawInsights.slice(0, 3).map((i) => {
    const insight = (i ?? {}) as Record<string, unknown>;
    return {
      title: clampString(insight.title, 80) || 'Insight',
      detail: clampString(insight.detail, 600),
      category: coerceCategory(insight.category)
    };
  });

  if (insights.length < 3) throw new Error('Gemini returned fewer than 3 insights.');

  return {
    summary: clampString(parsed.summary, 500),
    insights
  };
}
