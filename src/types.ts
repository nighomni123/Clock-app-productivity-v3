export interface UserSettings {
  focusMinutes: number;
  breakMinutes: number;
  longBreakMinutes: number;
  sessionsBeforeLongBreak: number;
  sound: string;
  volume: number;
  autoStartBreaks: boolean;
  autoStartFocus: boolean;
  enableNotifications: boolean;
  notificationLeadMinutes: number;
  strictMode: boolean;
}

export interface ExamState {
  name: string;
  date: string;
  subject?: string;
}

export interface TaskItem {
  id: string;
  userId: string;
  title: string;
  complete: boolean;
  dueDate?: string;
  priority: 'high' | 'medium' | 'low';
  estimatedMinutes?: number;
  createdAt: number;
}

export interface DistractionItem {
  id: string;
  userId: string;
  text: string;
  sessionIntention: string;
  createdAt: number;
  durationSeconds?: number;
}

export interface StudySession {
  id: string;
  userId: string;
  title: string;
  focusMinutes: number;
  breakMinutes: number;
  completedAt: number;
  dateKey: string; // YYYY-MM-DD
}

export interface DailyTarget {
  minutes: number;
  sessions: number;
  maxDistractions: number;
}

export interface DailyStats {
  focusMinutes: number;
  sessions: number;
  distractions: number;
}

export interface ActivityLog {
  id: string;
  userId: string;
  title: string;
  category: string;
  startTime: number;
  endTime: number;
  rating?: number; // Deprecated legacy field (rating system removed from UI)
  notes?: string;
  createdAt: number;
}

export interface UserAuth {
  uid: string;
  isAnonymous: boolean;
  displayName?: string | null;
  email?: string | null;
}

// ---------------------------------------------------------------------------
// AI features (Gemini via the server-side /api/ai endpoints)
// ---------------------------------------------------------------------------

/** One editable focus block inside an AI-generated day plan. */
export interface AiPlannedBlock {
  id: string;
  title: string;
  priority: 'high' | 'medium' | 'low';
  focusMinutes: number;
  breakMinutes: number;
  /** Suggested start offset in minutes from "now". */
  startMinutesFromNow?: number;
  /** Short model-generated explanation for this block. */
  rationale?: string;
}

/** A full AI day plan returned by POST /api/ai/day-plan. */
export interface AiDayPlan {
  overview: string;
  totalFocusMinutes: number;
  blocks: AiPlannedBlock[];
}

/** Journal/activity sample sent to Gemini (stripped of ids/user fields). */
export interface WeeklyJournalSample {
  title: string;
  category?: string;
  notes?: string;
  durationMinutes?: number;
}

/** Aggregate stats describing the last 7 days, computed client-side in App. */
export interface WeeklyInsightsData {
  rangeLabel: string;
  completedTasks: number;
  openTasks: number;
  totalFocusMinutes: number;
  sessionCount: number;
  distractionCount: number;
  dailyTargetMinutes: number;
  journalEntries: WeeklyJournalSample[];
}

export interface WeeklyInsight {
  title: string;
  detail: string;
  category: 'focus' | 'consistency' | 'wellbeing' | 'tasks';
}

/** A full AI weekly review returned by POST /api/ai/weekly-review. */
export interface WeeklyReview {
  summary: string;
  insights: WeeklyInsight[];
}
