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
