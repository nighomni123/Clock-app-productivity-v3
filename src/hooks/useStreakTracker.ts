/**
 * Hook for tracking study streaks and gamification achievements
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Achievement, GamificationStats, StudySessionWithTag } from '../types';

const STORAGE_KEY = 'focus_streak_data';

interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastStudyDate: string | null;
  studyDates: string[]; // Array of YYYY-MM-DD dates
}

const DEFAULT_STREAK_DATA: StreakData = {
  currentStreak: 0,
  longestStreak: 0,
  lastStudyDate: null,
  studyDates: []
};

// Predefined achievements
export const ACHIEVEMENTS: Omit<Achievement, 'condition' | 'unlockedAt'>[] = [
  {
    id: 'first_session',
    name: 'First Step',
    description: 'Complete your first focus session',
    icon: '🎯'
  },
  {
    id: 'one_hour',
    name: 'Hour of Power',
    description: 'Accumulate 60 minutes of focus time',
    icon: '⏱️'
  },
  {
    id: 'five_sessions',
    name: 'Focused Five',
    description: 'Complete 5 focus sessions',
    icon: '🖐️'
  },
  {
    id: 'three_day_streak',
    name: 'Getting Started',
    description: 'Maintain a 3-day streak',
    icon: '🔥'
  },
  {
    id: 'seven_day_streak',
    name: 'Week Warrior',
    description: 'Maintain a 7-day streak',
    icon: '📅'
  },
  {
    id: 'thirty_day_streak',
    name: 'Monthly Master',
    description: 'Maintain a 30-day streak',
    icon: '🏆'
  },
  {
    id: 'hundred_hours',
    name: 'Century Club',
    description: 'Accumulate 100 hours (6000 minutes) of focus time',
    icon: '💯'
  },
  {
    id: 'distraction_free',
    name: 'Zen Master',
    description: 'Complete 10 sessions without logging distractions',
    icon: '🧘'
  },
  {
    id: 'task_crusher',
    name: 'Task Crusher',
    description: 'Complete 20 tasks',
    icon: '✅'
  }
];

function getTodayKey(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function loadStreakData(): StreakData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STREAK_DATA;
    return JSON.parse(raw) as StreakData;
  } catch {
    return DEFAULT_STREAK_DATA;
  }
}

function saveStreakData(data: StreakData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Storage full - non-fatal
  }
}

export function useStreakTracker(
  sessions: StudySessionWithTag[],
  completedTasksCount: number,
  distractionFreeSessionsCount: number
) {
  const [streakData, setStreakData] = useState<StreakData>(DEFAULT_STREAK_DATA);
  const [unlockedAchievements, setUnlockedAchievements] = useState<string[]>([]);

  // Load streak data on mount
  useEffect(() => {
    setStreakData(loadStreakData());
    
    // Load unlocked achievements
    try {
      const saved = localStorage.getItem('focus_achievements');
      if (saved) {
        setUnlockedAchievements(JSON.parse(saved));
      }
    } catch {
      // Ignore
    }
  }, []);

  // Calculate gamification stats
  const stats: GamificationStats = useMemo(() => {
    const today = getTodayKey();
    const totalMinutes = sessions.reduce((sum, s) => sum + s.focusMinutes, 0);
    const todaySessions = sessions.filter(s => s.dateKey === today);
    
    return {
      totalFocusMinutes: totalMinutes,
      totalSessions: sessions.length,
      currentStreak: streakData.currentStreak,
      longestStreak: streakData.longestStreak,
      sessionsToday: todaySessions.length,
      minutesToday: todaySessions.reduce((sum, s) => sum + s.focusMinutes, 0),
      completedTasks: completedTasksCount,
      distractionFreeSessions: distractionFreeSessionsCount
    };
  }, [sessions, completedTasksCount, distractionFreeSessionsCount, streakData]);

  // Update streak when a new session is completed
  useEffect(() => {
    if (sessions.length === 0) return;

    const latestSession = sessions[sessions.length - 1];
    const sessionDate = latestSession.dateKey;
    const today = getTodayKey();
    
    // Only update if this is a recent session
    if (sessionDate !== today && sessionDate !== getYesterdayKey()) return;

    setStreakData(prev => {
      const isNewDay = prev.lastStudyDate !== sessionDate;
      if (!isNewDay) return prev; // Already counted this day

      const yesterday = getYesterdayKey();
      const isContinuation = prev.lastStudyDate === yesterday;
      
      const newStreak = isContinuation ? prev.currentStreak + 1 : 1;
      const newLongestStreak = Math.max(prev.longestStreak, newStreak);
      
      const newStudyDates = prev.studyDates.includes(sessionDate)
        ? prev.studyDates
        : [...prev.studyDates, sessionDate].sort();

      const newData: StreakData = {
        currentStreak: newStreak,
        longestStreak: newLongestStreak,
        lastStudyDate: sessionDate,
        studyDates: newStudyDates
      };

      saveStreakData(newData);
      return newData;
    });
  }, [sessions]);

  // Check for newly unlocked achievements
  useEffect(() => {
    const newUnlocks: string[] = [];

    ACHIEVEMENTS.forEach(achievement => {
      if (unlockedAchievements.includes(achievement.id)) return;

      let unlocked = false;

      switch (achievement.id) {
        case 'first_session':
          unlocked = stats.totalSessions >= 1;
          break;
        case 'one_hour':
          unlocked = stats.totalFocusMinutes >= 60;
          break;
        case 'five_sessions':
          unlocked = stats.totalSessions >= 5;
          break;
        case 'three_day_streak':
          unlocked = stats.currentStreak >= 3;
          break;
        case 'seven_day_streak':
          unlocked = stats.currentStreak >= 7;
          break;
        case 'thirty_day_streak':
          unlocked = stats.currentStreak >= 30;
          break;
        case 'hundred_hours':
          unlocked = stats.totalFocusMinutes >= 6000;
          break;
        case 'distraction_free':
          unlocked = stats.distractionFreeSessions >= 10;
          break;
        case 'task_crusher':
          unlocked = stats.completedTasks >= 20;
          break;
      }

      if (unlocked) {
        newUnlocks.push(achievement.id);
      }
    });

    if (newUnlocks.length > 0) {
      const updated = [...unlockedAchievements, ...newUnlocks];
      setUnlockedAchievements(updated);
      try {
        localStorage.setItem('focus_achievements', JSON.stringify(updated));
      } catch {
        // Ignore
      }
    }
  }, [stats, unlockedAchievements]);

  const resetStreak = useCallback(() => {
    setStreakData(DEFAULT_STREAK_DATA);
    saveStreakData(DEFAULT_STREAK_DATA);
  }, []);

  const getFullAchievements = useCallback((): Achievement[] => {
    return ACHIEVEMENTS.map(a => ({
      ...a,
      condition: () => false, // Not needed after unlock
      unlockedAt: unlockedAchievements.includes(a.id) 
        ? Date.now() // Simplified - would need proper tracking
        : undefined
    }));
  }, [unlockedAchievements]);

  return {
    streakData,
    stats,
    unlockedAchievements,
    getFullAchievements,
    resetStreak
  };
}

function getYesterdayKey(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
