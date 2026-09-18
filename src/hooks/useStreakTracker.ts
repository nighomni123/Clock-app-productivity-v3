/**
 * Hook for tracking study streaks and gamification achievements
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Achievement, GamificationStats, StudySessionWithTag } from '../types';
import { auth, db, doc, setDoc, getDoc, onSnapshot } from '../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';

const STORAGE_KEY = 'focus_streak_data';
const ACHIEVEMENTS_STORAGE_KEY = 'focus_achievements';

interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastStudyDate: string | null;
  studyDates: string[]; // Array of YYYY-MM-DD dates
}

interface GamificationData {
  streaks: StreakData;
  unlockedAchievements: string[];
}

const DEFAULT_STREAK_DATA: StreakData = {
  currentStreak: 0,
  longestStreak: 0,
  lastStudyDate: null,
  studyDates: []
};

const DEFAULT_GAMIFICATION_DATA: GamificationData = {
  streaks: DEFAULT_STREAK_DATA,
  unlockedAchievements: []
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

export function useStreakTracker(
  sessions: StudySessionWithTag[],
  completedTasksCount: number,
  distractionFreeSessionsCount: number
) {
  const [gamificationData, setGamificationData] = useState<GamificationData>(DEFAULT_GAMIFICATION_DATA);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load gamification data on mount - try Firestore first for signed-in users, fallback to localStorage
  useEffect(() => {
    let unsubscribeAuth: (() => void) | undefined;
    let unsubscribeFirestore: (() => void) | undefined;

    const initializeData = () => {
      // Start with localStorage data immediately for offline support
      const localData = loadLocalGamificationData();
      const localAchievements = loadLocalAchievements();
      setGamificationData({
        streaks: localData.streaks,
        unlockedAchievements: localAchievements.length > 0 ? localAchievements : localData.unlockedAchievements
      });
      setIsLoaded(true);
    };

    // Listen for auth state changes
    unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // User is signed in - try to load from Firestore
        const firestoreData = await loadFromFirestore(user.uid);
        if (firestoreData) {
          setGamificationData(firestoreData);
          // Also save to localStorage as backup
          saveLocalGamificationData(firestoreData);
        } else {
          // No Firestore data, keep localStorage data
          initializeData();
        }
      } else {
        // User is not signed in - use localStorage only
        initializeData();
      }
    });

    return () => {
      if (unsubscribeAuth) unsubscribeAuth();
      if (unsubscribeFirestore) unsubscribeFirestore();
    };
  }, []);

  // Calculate gamification stats
  const stats: GamificationStats = useMemo(() => {
    const today = getTodayKey();
    const totalMinutes = sessions.reduce((sum, s) => sum + s.focusMinutes, 0);
    const todaySessions = sessions.filter(s => s.dateKey === today);
    
    return {
      totalFocusMinutes: totalMinutes,
      totalSessions: sessions.length,
      currentStreak: gamificationData.streaks.currentStreak,
      longestStreak: gamificationData.streaks.longestStreak,
      sessionsToday: todaySessions.length,
      minutesToday: todaySessions.reduce((sum, s) => sum + s.focusMinutes, 0),
      completedTasks: completedTasksCount,
      distractionFreeSessions: distractionFreeSessionsCount
    };
  }, [sessions, completedTasksCount, distractionFreeSessionsCount, gamificationData]);

  // Update streak when a new session is completed
  useEffect(() => {
    if (sessions.length === 0) return;

    const latestSession = sessions[sessions.length - 1];
    const sessionDate = latestSession.dateKey;
    const today = getTodayKey();
    
    // Only update if this is a recent session
    if (sessionDate !== today && sessionDate !== getYesterdayKey()) return;

    setGamificationData(prev => {
      const isNewDay = prev.streaks.lastStudyDate !== sessionDate;
      if (!isNewDay) return prev; // Already counted this day

      const yesterday = getYesterdayKey();
      const isContinuation = prev.streaks.lastStudyDate === yesterday;
      
      const newStreak = isContinuation ? prev.streaks.currentStreak + 1 : 1;
      const newLongestStreak = Math.max(prev.streaks.longestStreak, newStreak);
      
      const newStudyDates = prev.streaks.studyDates.includes(sessionDate)
        ? prev.streaks.studyDates
        : [...prev.streaks.studyDates, sessionDate].sort();

      const newData: GamificationData = {
        streaks: {
          currentStreak: newStreak,
          longestStreak: newLongestStreak,
          lastStudyDate: sessionDate,
          studyDates: newStudyDates
        },
        unlockedAchievements: prev.unlockedAchievements
      };

      // Save to localStorage as backup
      saveLocalGamificationData(newData);
      
      // Sync to Firestore if user is signed in
      const currentUser = auth.currentUser;
      if (currentUser) {
        syncToFirestore(currentUser.uid, newData);
      }
      
      return newData;
    });
  }, [sessions]);

  // Check for newly unlocked achievements
  useEffect(() => {
    const newUnlocks: string[] = [];

    ACHIEVEMENTS.forEach(achievement => {
      if (gamificationData.unlockedAchievements.includes(achievement.id)) return;

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
      const updated = [...gamificationData.unlockedAchievements, ...newUnlocks];
      const newData: GamificationData = {
        ...gamificationData,
        unlockedAchievements: updated
      };
      
      setGamificationData(newData);
      
      // Save to localStorage as backup
      saveLocalGamificationData(newData);
      
      // Sync to Firestore if user is signed in
      const currentUser = auth.currentUser;
      if (currentUser) {
        syncToFirestore(currentUser.uid, newData);
      }
    }
  }, [stats, gamificationData]);

  const resetStreak = useCallback(() => {
    const newData: GamificationData = DEFAULT_GAMIFICATION_DATA;
    setGamificationData(newData);
    saveLocalGamificationData(newData);
    
    // Also reset in Firestore if user is signed in
    const currentUser = auth.currentUser;
    if (currentUser) {
      syncToFirestore(currentUser.uid, newData);
    }
  }, []);

  const getFullAchievements = useCallback((): Achievement[] => {
    return ACHIEVEMENTS.map(a => ({
      ...a,
      condition: () => false, // Not needed after unlock
      unlockedAt: gamificationData.unlockedAchievements.includes(a.id) 
        ? Date.now() // Simplified - would need proper tracking
        : undefined
    }));
  }, [gamificationData.unlockedAchievements]);

  return {
    streakData: gamificationData.streaks,
    stats,
    unlockedAchievements: gamificationData.unlockedAchievements,
    getFullAchievements,
    resetStreak,
    isLoaded
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

/** Get the Firestore path for user gamification data */
function getGamificationPath(uid: string): string {
  return `users/${uid}/gamification`;
}

/** Load gamification data from localStorage as fallback */
function loadLocalGamificationData(): GamificationData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_GAMIFICATION_DATA;
    const parsed = JSON.parse(raw) as StreakData;
    return {
      streaks: parsed,
      unlockedAchievements: []
    };
  } catch {
    return DEFAULT_GAMIFICATION_DATA;
  }
}

/** Load achievements from localStorage */
function loadLocalAchievements(): string[] {
  try {
    const saved = localStorage.getItem(ACHIEVEMENTS_STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch {
    // Ignore
  }
  return [];
}

/** Save gamification data to localStorage as offline fallback */
function saveLocalGamificationData(data: GamificationData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data.streaks));
    localStorage.setItem(ACHIEVEMENTS_STORAGE_KEY, JSON.stringify(data.unlockedAchievements));
  } catch {
    // Storage full - non-fatal
  }
}

/** Sync gamification data to Firestore */
async function syncToFirestore(uid: string, data: GamificationData): Promise<void> {
  try {
    const gamificationRef = doc(db, getGamificationPath(uid));
    await setDoc(gamificationRef, {
      streaks: data.streaks,
      unlockedAchievements: data.unlockedAchievements,
      updatedAt: Date.now()
    }, { merge: true });
  } catch (error) {
    console.warn('Failed to sync gamification data to Firestore:', error);
  }
}

/** Load gamification data from Firestore */
function loadFromFirestore(uid: string): Promise<GamificationData | null> {
  return new Promise((resolve) => {
    try {
      const gamificationRef = doc(db, getGamificationPath(uid));
      onSnapshot(gamificationRef, 
        (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.data() as GamificationData;
            resolve(data);
          } else {
            resolve(null);
          }
        },
        (error) => {
          console.warn('Error loading gamification from Firestore:', error);
          resolve(null);
        }
      );
    } catch (error) {
      console.warn('Failed to load gamification from Firestore:', error);
      resolve(null);
    }
  });
}
