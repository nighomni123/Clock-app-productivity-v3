/**
 * Client-side bridge to the server's Gemini endpoints.
 *
 * Deliberately uses plain `fetch` — @google/genai is a server-only dependency
 * so the API key can never reach the client bundle. All requests go to
 * relative /api paths served by the Express + Vite full-stack server.
 */
import { ActivityLog, AiDayPlan, TaskItem, WeeklyInsightsData, WeeklyReview } from '../types';

async function postJson<T>(url: string, body: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
  } catch {
    throw new Error('Could not reach the AI server. Check your connection and try again.');
  }

  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    // Non-JSON error page (e.g., proxy) — fall through to generic message.
  }

  if (!response.ok) {
    const serverMessage = (payload as { error?: string } | null)?.error;
    throw new Error(serverMessage || `AI request failed (${response.status}).`);
  }
  return payload as T;
}

/** Strip local-only fields before sending tasks to the server. */
function toTaskPayload(tasks: TaskItem[]) {
  return tasks.map((t) => ({
    title: t.title,
    priority: t.priority,
    estimatedMinutes: t.estimatedMinutes,
    complete: t.complete,
    dueDate: t.dueDate
  }));
}

/** Reduce journal/activity logs to compact, privacy-safe samples. */
function toJournalPayload(logs: ActivityLog[]) {
  return logs.slice(0, 25).map((log) => ({
    title: log.title,
    category: log.category,
    notes: log.notes,
    durationMinutes:
      log.endTime > log.startTime ? Math.round((log.endTime - log.startTime) / 60000) : undefined
  }));
}

export async function requestDayPlan(
  tasks: TaskItem[],
  journalEntries: ActivityLog[],
  options: { defaultFocusMinutes: number; defaultBreakMinutes: number }
): Promise<AiDayPlan> {
  const now = new Date();
  return postJson<AiDayPlan>('/api/ai/day-plan', {
    tasks: toTaskPayload(tasks),
    journalEntries: toJournalPayload(journalEntries),
    context: {
      dayKey: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`,
      nowISO: now.toISOString(),
      defaultFocusMinutes: options.defaultFocusMinutes,
      defaultBreakMinutes: options.defaultBreakMinutes
    }
  });
}

export async function requestWeeklyReview(data: WeeklyInsightsData): Promise<WeeklyReview> {
  return postJson<WeeklyReview>('/api/ai/weekly-review', data);
}
