/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { Navbar } from './components/Navbar';
import { ClockView } from './components/ClockView';
import { FocusWorkspace } from './components/FocusWorkspace';
import { TimetableCalendar } from './components/TimetableCalendar';
import { TaskQueue } from './components/TaskQueue';
import { SettingsStats } from './components/SettingsStats';
import { AuthModal } from './components/AuthModal';
import { ActivityJournal } from './components/ActivityJournal';
import {
  UserSettings,
  ExamState,
  TaskItem,
  TimetableBlock,
  DistractionItem,
  StudySession,
  DailyTarget,
  DailyStats,
  UserAuth,
  ActivityLog
} from './types';
import {
  auth,
  db,
  doc,
  setDoc,
  getDoc,
  onSnapshot,
  collection,
  query,
  where,
  addDoc,
  deleteDoc,
  writeBatch,
  handleFirestoreError,
  onAuthStateChanged,
  signInAnonymouslyUser
} from './lib/firebase';
import { checkUpcomingStudyBlocks } from './lib/notifications';

const DEFAULT_SETTINGS: UserSettings = {
  focusMinutes: 25,
  breakMinutes: 5,
  longBreakMinutes: 15,
  sessionsBeforeLongBreak: 4,
  sound: 'Soft Bell',
  volume: 0.55,
  autoStartBreaks: false,
  autoStartFocus: false,
  enableNotifications: true,
  notificationLeadMinutes: 5,
  strictMode: false
};

const DEFAULT_DAILY_TARGET: DailyTarget = {
  minutes: 120,
  sessions: 4,
  maxDistractions: 5
};

const getTodayKey = (): string => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('focus');
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [userAuth, setUserAuth] = useState<UserAuth | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);

  // App Data States
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [exam, setExam] = useState<ExamState>({ name: '', date: '' });
  const [intention, setIntention] = useState<string>('');
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [timetables, setTimetables] = useState<TimetableBlock[]>([]);
  const [distractions, setDistractions] = useState<DistractionItem[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [notes, setNotes] = useState<string>('');
  const [dailyTarget, setDailyTarget] = useState<DailyTarget>(DEFAULT_DAILY_TARGET);
  const [todayStats, setTodayStats] = useState<DailyStats>({
    focusMinutes: 0,
    sessions: 0,
    distractions: 0
  });

  const [syncCode, setSyncCode] = useState<string | null>(() => localStorage.getItem('focus_sync_code'));
  const [isTabVisible, setIsTabVisible] = useState<boolean>(() => (typeof document !== 'undefined' ? !document.hidden : true));

  // Debounce timeout refs to reduce write frequency for text inputs
  const notesTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intentionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dailySessionsRef = useRef<StudySession[]>([]);

  // Track tab visibility to pause real-time Firestore listeners when app is hidden/in background
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsTabVisible(!document.hidden);
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (notesTimeoutRef.current) clearTimeout(notesTimeoutRef.current);
      if (intentionTimeoutRef.current) clearTimeout(intentionTimeoutRef.current);
    };
  }, []);

  // Track online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Listen to Auth state and auto-sign in anonymously/guest mode if no account
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUserAuth({
          uid: user.uid,
          isAnonymous: user.isAnonymous,
          displayName: user.displayName,
          email: user.email
        });
      } else {
        // Auto-sign in anonymously or fallback guest session for instant usability
        try {
          const guestUser = await signInAnonymouslyUser();
          setUserAuth(guestUser);
        } catch (err) {
          console.warn('Guest sign-in fallback error:', err);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  // Sync Session Listener (Overrides individual collections if active)
  useEffect(() => {
    if (!syncCode) return;
    const unsub = onSnapshot(doc(db, 'sync_sessions', syncCode), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.settings) setSettings(data.settings);
        if (data.exam) setExam(data.exam);
        if (data.intention !== undefined) setIntention(data.intention);
        if (data.tasks) setTasks(data.tasks);
        if (data.timetables) setTimetables(data.timetables);
        if (data.distractions) setDistractions(data.distractions);
        if (data.activityLogs) setActivityLogs(data.activityLogs);
        if (data.notes) setNotes(data.notes);
        if (data.dailyTarget) setDailyTarget(data.dailyTarget);
        if (data.todayStats) setTodayStats(data.todayStats);
      }
    });
    return () => unsub();
  }, [syncCode]);

  // Sync User Document & Settings from Firestore (Visibility-Aware)
  useEffect(() => {
    if (!isTabVisible || syncCode || !userAuth?.uid) return;
    const userDocRef = doc(db, 'users', userAuth.uid);

    const unsubscribe = onSnapshot(
      userDocRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          if (data.settings) setSettings({ ...DEFAULT_SETTINGS, ...data.settings });
          if (data.dailyTarget) setDailyTarget({ ...DEFAULT_DAILY_TARGET, ...data.dailyTarget });
          if (data.exam) setExam(data.exam);
          if (data.intention !== undefined) setIntention(data.intention);
        } else {
          // Initialize default user record
          setDoc(
            userDocRef,
            {
              uid: userAuth.uid,
              isAnonymous: userAuth.isAnonymous,
              createdAt: new Date().toISOString(),
              settings: DEFAULT_SETTINGS,
              dailyTarget: DEFAULT_DAILY_TARGET,
              exam: { name: '', date: '' },
              intention: ''
            },
            { merge: true }
          ).catch((e) => handleFirestoreError(e, 'write', `users/${userAuth.uid}`));
        }
      },
      (err) => handleFirestoreError(err, 'read', `users/${userAuth.uid}`)
    );

    return () => unsubscribe();
  }, [userAuth?.uid, userAuth?.isAnonymous, syncCode, isTabVisible]);

  // Sync Daily Aggregated Record (Sessions, Distractions, Today Stats in 1 Document)
  useEffect(() => {
    if (!isTabVisible || syncCode || !userAuth?.uid) return;
    const todayKey = getTodayKey();
    const dailyDocRef = doc(db, 'users', userAuth.uid, 'daily', todayKey);

    const unsubscribe = onSnapshot(
      dailyDocRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          if (data.stats) {
            setTodayStats({
              focusMinutes: data.stats.focusMinutes || 0,
              sessions: data.stats.sessions || 0,
              distractions: data.stats.distractions || 0
            });
          }
          if (Array.isArray(data.sessions)) {
            dailySessionsRef.current = data.sessions;
          }
          if (Array.isArray(data.distractions)) {
            setDistractions(data.distractions);
          }
        }
      },
      (err) => handleFirestoreError(err, 'read', `users/${userAuth.uid}/daily/${todayKey}`)
    );

    return () => unsubscribe();
  }, [userAuth?.uid, syncCode, isTabVisible]);

  // Sync Tasks from Firestore (Visibility-Aware)
  useEffect(() => {
    if (!isTabVisible || syncCode || !userAuth?.uid) return;
    const tasksRef = collection(db, 'tasks');
    const q = query(tasksRef, where('userId', '==', userAuth.uid));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const loadedTasks: TaskItem[] = [];
        snapshot.forEach((docSnap) => {
          loadedTasks.push({ id: docSnap.id, ...docSnap.data() } as TaskItem);
        });
        loadedTasks.sort((a, b) => b.createdAt - a.createdAt);
        setTasks(loadedTasks);
      },
      (err) => handleFirestoreError(err, 'read', 'tasks')
    );

    return () => unsubscribe();
  }, [userAuth?.uid, syncCode, isTabVisible]);

  // Sync Timetables from Firestore (Visibility-Aware)
  useEffect(() => {
    if (!isTabVisible || syncCode || !userAuth?.uid) return;
    const timetablesRef = collection(db, 'timetables');
    const q = query(timetablesRef, where('userId', '==', userAuth.uid));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const loadedBlocks: TimetableBlock[] = [];
        snapshot.forEach((docSnap) => {
          loadedBlocks.push({ id: docSnap.id, ...docSnap.data() } as TimetableBlock);
        });
        setTimetables(loadedBlocks);
      },
      (err) => handleFirestoreError(err, 'read', 'timetables')
    );

    return () => unsubscribe();
  }, [userAuth?.uid, syncCode, isTabVisible]);

  // Sync Activity Logs from Firestore (Visibility-Aware)
  useEffect(() => {
    if (!isTabVisible || syncCode || !userAuth?.uid) return;
    const logsRef = collection(db, 'activity_logs');
    const q = query(logsRef, where('userId', '==', userAuth.uid));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const loaded: ActivityLog[] = [];
        snapshot.forEach((docSnap) => {
          loaded.push({ id: docSnap.id, ...docSnap.data() } as ActivityLog);
        });
        loaded.sort((a, b) => b.startTime - a.startTime);
        setActivityLogs(loaded);
      },
      (err) => handleFirestoreError(err, 'read', 'activity_logs')
    );

    return () => unsubscribe();
  }, [userAuth?.uid, syncCode, isTabVisible]);

  // Sync Quick Notes from Firestore (Visibility-Aware)
  useEffect(() => {
    if (!isTabVisible || syncCode || !userAuth?.uid) return;
    const notesDocRef = doc(db, 'notes', userAuth.uid);

    const unsubscribe = onSnapshot(
      notesDocRef,
      (snapshot) => {
        if (snapshot.exists()) {
          setNotes(snapshot.data().content || '');
        }
      },
      (err) => handleFirestoreError(err, 'read', `notes/${userAuth.uid}`)
    );

    return () => unsubscribe();
  }, [userAuth?.uid, syncCode, isTabVisible]);

  // Periodic Study Block Notification Inspector (runs every 30 seconds)
  useEffect(() => {
    if (!settings.enableNotifications || !timetables.length) return;
    const interval = setInterval(() => {
      checkUpcomingStudyBlocks(timetables, settings.notificationLeadMinutes || 5);
    }, 30000);

    // Initial check
    checkUpcomingStudyBlocks(timetables, settings.notificationLeadMinutes || 5);

    return () => clearInterval(interval);
  }, [timetables, settings.enableNotifications, settings.notificationLeadMinutes]);

  const updateSyncDoc = async (code: string, updates: any) => {
    try {
      await setDoc(doc(db, 'sync_sessions', code), { ...updates, updatedAt: Date.now() }, { merge: true });
    } catch (err) {
      console.warn('Sync push error:', err);
    }
  };

  const handleGenerateSyncCode = async () => {
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // Excludes 0,O,1,I,L
    const array = new Uint32Array(9);
    crypto.getRandomValues(array);
    let code = '';
    for (let i = 0; i < 9; i++) {
      code += chars[array[i] % chars.length];
    }
    const formatted = `${code.slice(0, 3)}-${code.slice(3, 6)}-${code.slice(6, 9)}`;

    try {
      await setDoc(doc(db, 'sync_sessions', formatted), {
        settings,
        exam,
        intention,
        tasks,
        timetables,
        distractions,
        notes,
        dailyTarget,
        todayStats,
        createdAt: Date.now(),
        updatedAt: Date.now()
      });
      localStorage.setItem('focus_sync_code', formatted);
      setSyncCode(formatted);
    } catch (err) {
      console.error('Failed to create sync session', err);
    }
  };

  const handleJoinSyncCode = async (inputCode: string) => {
    try {
      const snap = await getDoc(doc(db, 'sync_sessions', inputCode));
      if (snap.exists()) {
        localStorage.setItem('focus_sync_code', inputCode);
        setSyncCode(inputCode);
        return true;
      }
      return false;
    } catch (err) {
      console.error('Failed to join sync session', err);
      return false;
    }
  };

  const handleDisconnectSyncCode = () => {
    localStorage.removeItem('focus_sync_code');
    setSyncCode(null);
  };

  // User Actions & Handlers
  const handleUpdateSettings = useCallback(
    async (newSettings: UserSettings) => {
      setSettings(newSettings);
      if (syncCode) {
        updateSyncDoc(syncCode, { settings: newSettings });
        return;
      }
      if (!userAuth?.uid) return;
      try {
        await setDoc(doc(db, 'users', userAuth.uid), { settings: newSettings }, { merge: true });
      } catch (err) {
        console.warn('Error saving settings:', err);
      }
    },
    [userAuth?.uid, syncCode]
  );

  const handleUpdateDailyTarget = useCallback(
    async (newTarget: DailyTarget) => {
      setDailyTarget(newTarget);
      if (syncCode) {
        updateSyncDoc(syncCode, { dailyTarget: newTarget });
        return;
      }
      if (!userAuth?.uid) return;
      try {
        await setDoc(doc(db, 'users', userAuth.uid), { dailyTarget: newTarget }, { merge: true });
      } catch (err) {
        console.warn('Error saving daily target:', err);
      }
    },
    [userAuth?.uid, syncCode]
  );

  const handleUpdateExam = useCallback(
    async (newExam: ExamState) => {
      setExam(newExam);
      if (syncCode) {
        updateSyncDoc(syncCode, { exam: newExam });
        return;
      }
      if (!userAuth?.uid) return;
      try {
        await setDoc(doc(db, 'users', userAuth.uid), { exam: newExam }, { merge: true });
      } catch (err) {
        console.warn('Error saving exam:', err);
      }
    },
    [userAuth?.uid, syncCode]
  );

  const handleAddActivityLog = useCallback(
    async (logData: Omit<ActivityLog, 'id' | 'userId' | 'createdAt'>) => {
      const newLog = {
        ...logData,
        id: Math.random().toString(36).substring(2, 10),
        userId: userAuth?.uid || 'anonymous',
        createdAt: Date.now()
      };

      if (syncCode) {
        setActivityLogs((prev) => {
          const next = [newLog, ...prev];
          updateSyncDoc(syncCode, { activityLogs: next });
          return next;
        });
        return newLog.id;
      }

      if (!userAuth?.uid) return newLog.id;
      try {
        // Use a deterministic doc id so it can be updated later
        const newDocRef = doc(collection(db, 'activity_logs'));
        const withId = { ...newLog, id: newDocRef.id };
        await setDoc(doc(db, 'activity_logs', newDocRef.id), withId);
        setActivityLogs((prev) => [withId, ...prev]);
        return newDocRef.id;
      } catch (err) {
        console.warn('Error adding activity log:', err);
        return newLog.id;
      }
    },
    [userAuth?.uid, syncCode]
  );

  // Update an existing activity log (used to set endTime when session pauses/finishes)
  const handleUpdateActivityLog = useCallback(
    async (id: string, updates: Partial<ActivityLog>) => {
      if (!id) return;
      // Local update
      setActivityLogs((prev) => prev.map((l) => (l.id === id ? { ...l, ...updates } : l)));

      if (syncCode) {
        // push full list to sync doc
        setActivityLogs((prev) => {
          updateSyncDoc(syncCode, { activityLogs: prev });
          return prev;
        });
        return;
      }

      try {
        await setDoc(doc(db, 'activity_logs', id), updates, { merge: true });
      } catch (err) {
        console.warn('Error updating activity log:', err);
      }
    },
    [syncCode]
  );

  const handleRemoveActivityLog = useCallback(
    async (id: string) => {
      if (syncCode) {
        setActivityLogs((prev) => {
          const next = prev.filter((l) => l.id !== id);
          updateSyncDoc(syncCode, { activityLogs: next });
          return next;
        });
        return;
      }

      try {
        await deleteDoc(doc(db, 'activity_logs', id));
      } catch (err) {
        console.warn('Error deleting activity log:', err);
      }
    },
    [syncCode]
  );

  const handleUpdateIntention = useCallback(
    (newIntention: string) => {
      setIntention(newIntention);
      if (syncCode) {
        updateSyncDoc(syncCode, { intention: newIntention });
        return;
      }
      if (!userAuth?.uid) return;

      if (intentionTimeoutRef.current) clearTimeout(intentionTimeoutRef.current);
      intentionTimeoutRef.current = setTimeout(async () => {
        try {
          await setDoc(doc(db, 'users', userAuth.uid), { intention: newIntention }, { merge: true });
        } catch (err) {
          handleFirestoreError(err, 'write', `users/${userAuth.uid}`);
        }
      }, 2500); // 2.5s debounce to save writes
    },
    [userAuth?.uid, syncCode]
  );

  const handleAddTask = useCallback(
    async (taskData: Omit<TaskItem, 'id' | 'userId' | 'createdAt'>) => {
      const newTask = {
        ...taskData,
        id: Math.random().toString(36).substring(2, 10),
        userId: userAuth?.uid || 'anonymous',
        createdAt: Date.now()
      };

      if (syncCode) {
        setTasks((prev) => {
          const next = [newTask, ...prev];
          updateSyncDoc(syncCode, { tasks: next });
          return next;
        });
        return;
      }

      if (!userAuth?.uid) return;
      try {
        await addDoc(collection(db, 'tasks'), newTask);
      } catch (err) {
        console.warn('Error adding task:', err);
      }
    },
    [userAuth?.uid, syncCode]
  );

  const handleToggleTask = useCallback(
    async (id: string) => {
      if (syncCode) {
        setTasks((prev) => {
          const next = prev.map((t) => (t.id === id ? { ...t, complete: !t.complete } : t));
          updateSyncDoc(syncCode, { tasks: next });
          return next;
        });
        return;
      }

      const target = tasks.find((t) => t.id === id);
      if (!target || !userAuth?.uid) return;
      try {
        await setDoc(doc(db, 'tasks', id), { complete: !target.complete }, { merge: true });
      } catch (err) {
        console.warn('Error toggling task:', err);
      }
    },
    [tasks, userAuth?.uid, syncCode]
  );

  const handleRemoveTask = useCallback(
    async (id: string) => {
      if (syncCode) {
        setTasks((prev) => {
          const next = prev.filter((t) => t.id !== id);
          updateSyncDoc(syncCode, { tasks: next });
          return next;
        });
        return;
      }

      try {
        await deleteDoc(doc(db, 'tasks', id));
      } catch (err) {
        console.warn('Error deleting task:', err);
      }
    },
    [syncCode]
  );

  const handleAddTimetableBlock = useCallback(
    async (blockData: Omit<TimetableBlock, 'id' | 'userId' | 'createdAt'>) => {
      const newBlock = {
        ...blockData,
        id: Math.random().toString(36).substring(2, 10),
        userId: userAuth?.uid || 'anonymous',
        createdAt: Date.now()
      };

      if (syncCode) {
        setTimetables((prev) => {
          const next = [...prev, newBlock];
          updateSyncDoc(syncCode, { timetables: next });
          return next;
        });
        return;
      }

      if (!userAuth?.uid) return;
      try {
        await addDoc(collection(db, 'timetables'), newBlock);
      } catch (err) {
        console.warn('Error adding timetable block:', err);
      }
    },
    [userAuth?.uid, syncCode]
  );

  const handleRemoveTimetableBlock = useCallback(
    async (id: string) => {
      if (syncCode) {
        setTimetables((prev) => {
          const next = prev.filter((b) => b.id !== id);
          updateSyncDoc(syncCode, { timetables: next });
          return next;
        });
        return;
      }

      try {
        await deleteDoc(doc(db, 'timetables', id));
      } catch (err) {
        console.warn('Error deleting timetable block:', err);
      }
    },
    [syncCode]
  );

  const handleLogDistraction = useCallback(
    async (text: string, sessionGoal: string, durationSeconds?: number) => {
      const newDistraction: DistractionItem = {
        id: Math.random().toString(36).substring(2, 10),
        userId: userAuth?.uid || 'anonymous',
        text,
        sessionIntention: sessionGoal,
        createdAt: Date.now(),
        ...(durationSeconds !== undefined ? { durationSeconds } : {})
      };

      // Local React State updates instantly
      setDistractions((prev) => [newDistraction, ...prev]);
      setTodayStats((prev) => ({ ...prev, distractions: prev.distractions + 1 }));

      // Also record distraction as a short activity in the Activity Journal when a duration is provided
      if (durationSeconds !== undefined && durationSeconds > 0) {
        try {
          const now = Date.now();
          await handleAddActivityLog({
            title: `Distraction: ${text}`,
            category: 'Other',
            startTime: now - durationSeconds * 1000,
            endTime: now,
            rating: 1,
            notes: `From session: ${sessionGoal}`
          });
        } catch (err) {
          // Non-fatal — activity log best-effort
          console.warn('Failed to add distraction activity log:', err);
        }
      }

      if (syncCode) {
        setDistractions((prev) => {
          updateSyncDoc(syncCode, { distractions: prev });
          return prev;
        });
        return;
      }

      if (!userAuth?.uid) return;
      try {
        const todayKey = getTodayKey();
        const batch = writeBatch(db);

        // 1. Write to daily aggregated doc
        const dailyRef = doc(db, 'users', userAuth.uid, 'daily', todayKey);
        const updatedDistractions = [newDistraction, ...distractions];
        batch.set(
          dailyRef,
          {
            dateKey: todayKey,
            userId: userAuth.uid,
            updatedAt: Date.now(),
            stats: {
              focusMinutes: todayStats.focusMinutes,
              sessions: todayStats.sessions,
              distractions: todayStats.distractions + 1
            },
            distractions: updatedDistractions
          },
          { merge: true }
        );

        // 2. Also write to standalone distractions collection in same batch for compatibility
        const newDistractionDocRef = doc(collection(db, 'distractions'));
        batch.set(newDistractionDocRef, newDistraction);

        await batch.commit();
      } catch (err) {
        handleFirestoreError(err, 'write', `users/${userAuth?.uid}/daily`);
      }
    },
    [userAuth?.uid, syncCode, distractions, todayStats, handleAddActivityLog]
  );

  const handleUpdateNotes = useCallback(
    (newNotes: string) => {
      setNotes(newNotes);
      if (syncCode) {
        updateSyncDoc(syncCode, { notes: newNotes });
        return;
      }
      if (!userAuth?.uid) return;

      if (notesTimeoutRef.current) clearTimeout(notesTimeoutRef.current);
      notesTimeoutRef.current = setTimeout(async () => {
        try {
          await setDoc(
            doc(db, 'notes', userAuth.uid),
            {
              userId: userAuth.uid,
              content: newNotes,
              updatedAt: new Date().toISOString()
            },
            { merge: true }
          );
        } catch (err) {
          handleFirestoreError(err, 'write', `notes/${userAuth.uid}`);
        }
      }, 2500); // 2.5s debounce to drastically reduce write operations
    },
    [userAuth?.uid, syncCode]
  );

  const handleLogCompletedSession = useCallback(
    async (focusMins: number) => {
      const todayKey = getTodayKey();

      // Local UI update instantly
      setTodayStats((prev) => ({
        ...prev,
        focusMinutes: prev.focusMinutes + focusMins,
        sessions: prev.sessions + 1
      }));

      if (syncCode) {
        setTodayStats((prev) => {
          updateSyncDoc(syncCode, { todayStats: prev });
          return prev;
        });
        return;
      }

      if (!userAuth?.uid) return;

      try {
        const batch = writeBatch(db);
        const dailyRef = doc(db, 'users', userAuth.uid, 'daily', todayKey);
        const summaryRef = doc(db, 'users', userAuth.uid, 'stats', 'summary');
        const sessionDocRef = doc(collection(db, 'sessions'));

        const newSessionItem: StudySession = {
          id: sessionDocRef.id,
          userId: userAuth.uid,
          title: intention || 'Focus Session',
          focusMinutes: focusMins,
          breakMinutes: settings.breakMinutes,
          completedAt: Date.now(),
          dateKey: todayKey
        };

        const updatedSessions = [...dailySessionsRef.current, newSessionItem];
        dailySessionsRef.current = updatedSessions;

        // 1. Batched update to daily aggregated doc
        batch.set(
          dailyRef,
          {
            dateKey: todayKey,
            userId: userAuth.uid,
            updatedAt: Date.now(),
            stats: {
              focusMinutes: todayStats.focusMinutes + focusMins,
              sessions: todayStats.sessions + 1,
              distractions: todayStats.distractions
            },
            sessions: updatedSessions
          },
          { merge: true }
        );

        // 2. Batched update to summary rollup doc
        batch.set(
          summaryRef,
          {
            userId: userAuth.uid,
            updatedAt: Date.now(),
            totalFocusMinutes: (todayStats.focusMinutes || 0) + focusMins,
            totalSessions: (todayStats.sessions || 0) + 1
          },
          { merge: true }
        );

        // 3. Batched add to sessions collection for compatibility
        batch.set(sessionDocRef, newSessionItem);

        await batch.commit();
      } catch (err) {
        handleFirestoreError(err, 'write', `users/${userAuth.uid}/daily/${todayKey}`);
      }
    },
    [intention, settings.breakMinutes, userAuth?.uid, syncCode, todayStats]
  );

  const handleStartFocusForTask = useCallback((taskTitle: string) => {
    setIntention(`Task: ${taskTitle}`);
    setActiveTab('focus');
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-black text-zinc-100 font-sans selection:bg-zinc-800">
      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isOnline={isOnline}
        userAuth={userAuth}
        onOpenAuth={() => setIsAuthModalOpen(true)}
      />

      {/* Main Workspace */}
      <main className="flex-grow flex flex-col items-center justify-center p-3 sm:p-4 md:p-8 w-full max-w-7xl mx-auto">
        {activeTab === 'clock' && (
          <ClockView
            exam={exam}
            onUpdateExam={handleUpdateExam}
            intention={intention}
            onUpdateIntention={handleUpdateIntention}
          />
        )}

        {activeTab === 'focus' && (
          <FocusWorkspace
            settings={settings}
            intention={intention}
            onUpdateIntention={handleUpdateIntention}
            tasks={tasks}
            onAddTask={(title) =>
              handleAddTask({
                title,
                complete: false,
                priority: 'medium',
                estimatedMinutes: 30
              })
            }
            onToggleTask={handleToggleTask}
            onRemoveTask={handleRemoveTask}
            notes={notes}
            onUpdateNotes={handleUpdateNotes}
            distractionLog={distractions}
            onLogDistraction={handleLogDistraction}
            onLogCompletedSession={handleLogCompletedSession}
            // New handlers for journal integration: create an ActivityLog when session starts and update when paused/finished
            onStartSessionLog={async (startTime: number, title?: string) => {
              const id = await handleAddActivityLog({
                title: title || intention || 'Focus Session',
                category: 'Work',
                startTime: startTime,
                endTime: startTime,
                rating: 5
              });
              return id;
            }}
            onUpdateSessionLog={async (id: string, endTime: number) => {
              await handleUpdateActivityLog(id, { endTime });
            }}
          />
        )}

        {activeTab === 'timetable' && (
          <TimetableCalendar
            blocks={timetables}
            onAddBlock={handleAddTimetableBlock}
            onRemoveBlock={handleRemoveTimetableBlock}
            notificationLeadMinutes={settings.notificationLeadMinutes}
          />
        )}

        {activeTab === 'tasks' && (
          <TaskQueue
            tasks={tasks}
            onAddTask={handleAddTask}
            onToggleTask={handleToggleTask}
            onRemoveTask={handleRemoveTask}
            onStartFocusForTask={handleStartFocusForTask}
          />
        )}

        {activeTab === 'journal' && (
          <ActivityJournal
            logs={activityLogs}
            onAddLog={handleAddActivityLog}
            onRemoveLog={handleRemoveActivityLog}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsStats
            settings={settings}
            onUpdateSettings={handleUpdateSettings}
            dailyTarget={dailyTarget}
            onUpdateDailyTarget={handleUpdateDailyTarget}
            todayStats={todayStats}
            userAuth={userAuth}
            onOpenAuth={() => setIsAuthModalOpen(true)}
            isOnline={isOnline}
            syncCode={syncCode}
            onGenerateSyncCode={handleGenerateSyncCode}
            onJoinSyncCode={handleJoinSyncCode}
            onDisconnectSyncCode={handleDisconnectSyncCode}
          />
        )}
      </main>

      {/* Account & Cross Device Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        userAuth={userAuth}
      />

      {/* Vercel Web Analytics */}
      <Analytics />
      <SpeedInsights />
    </div>
  );
}
