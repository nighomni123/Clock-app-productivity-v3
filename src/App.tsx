/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Navbar } from './components/Navbar';
import { ClockView } from './components/ClockView';
import { FocusWorkspace } from './components/FocusWorkspace';
import { TimetableCalendar } from './components/TimetableCalendar';
import { TaskQueue } from './components/TaskQueue';
import { SettingsStats } from './components/SettingsStats';
import { AuthModal } from './components/AuthModal';
import {
  UserSettings,
  ExamState,
  TaskItem,
  TimetableBlock,
  DistractionItem,
  DailyTarget,
  DailyStats,
  UserAuth
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
  notificationLeadMinutes: 5
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
  const [notes, setNotes] = useState<string>('');
  const [dailyTarget, setDailyTarget] = useState<DailyTarget>(DEFAULT_DAILY_TARGET);
  const [todayStats, setTodayStats] = useState<DailyStats>({
    focusMinutes: 0,
    sessions: 0,
    distractions: 0
  });

  const [syncCode, setSyncCode] = useState<string | null>(() => localStorage.getItem('focus_sync_code'));

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
        if (data.notes) setNotes(data.notes);
        if (data.dailyTarget) setDailyTarget(data.dailyTarget);
        if (data.todayStats) setTodayStats(data.todayStats);
      }
    });
    return () => unsub();
  }, [syncCode]);

  // Sync User Document & Settings from Firestore
  useEffect(() => {
    if (syncCode || !userAuth?.uid) return;
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
          ).catch((e) => console.warn('User doc init:', e));
        }
      },
      (err) => console.warn('Firestore user doc snapshot error:', err)
    );

    return () => unsubscribe();
  }, [userAuth?.uid, userAuth?.isAnonymous, syncCode]);

  // Sync Tasks from Firestore
  useEffect(() => {
    if (syncCode || !userAuth?.uid) return;
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
      (err) => console.warn('Firestore tasks snapshot error:', err)
    );

    return () => unsubscribe();
  }, [userAuth?.uid, syncCode]);

  // Sync Timetables from Firestore
  useEffect(() => {
    if (syncCode || !userAuth?.uid) return;
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
      (err) => console.warn('Firestore timetables snapshot error:', err)
    );

    return () => unsubscribe();
  }, [userAuth?.uid, syncCode]);

  // Sync Distraction Logs from Firestore
  useEffect(() => {
    if (syncCode || !userAuth?.uid) return;
    const distractionsRef = collection(db, 'distractions');
    const q = query(distractionsRef, where('userId', '==', userAuth.uid));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const loadedDistractions: DistractionItem[] = [];
        snapshot.forEach((docSnap) => {
          loadedDistractions.push({ id: docSnap.id, ...docSnap.data() } as DistractionItem);
        });
        loadedDistractions.sort((a, b) => b.createdAt - a.createdAt);
        setDistractions(loadedDistractions);

        // Update distraction count for today
        const todayKey = getTodayKey();
        const countToday = loadedDistractions.filter(
          (d) => new Date(d.createdAt).toISOString().slice(0, 10) === todayKey
        ).length;

        setTodayStats((prev) => ({ ...prev, distractions: countToday }));
      },
      (err) => console.warn('Firestore distractions snapshot error:', err)
    );

    return () => unsubscribe();
  }, [userAuth?.uid, syncCode]);

  // Sync Quick Notes from Firestore
  useEffect(() => {
    if (syncCode || !userAuth?.uid) return;
    const notesDocRef = doc(db, 'notes', userAuth.uid);

    const unsubscribe = onSnapshot(
      notesDocRef,
      (snapshot) => {
        if (snapshot.exists()) {
          setNotes(snapshot.data().content || '');
        }
      },
      (err) => console.warn('Firestore notes snapshot error:', err)
    );

    return () => unsubscribe();
  }, [userAuth?.uid, syncCode]);

  // Sync Today's Sessions stats
  useEffect(() => {
    if (syncCode || !userAuth?.uid) return;
    const todayKey = getTodayKey();
    const sessionsRef = collection(db, 'sessions');
    const q = query(
      sessionsRef,
      where('userId', '==', userAuth.uid),
      where('dateKey', '==', todayKey)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        let totalFocusMin = 0;
        let totalSessionsCount = 0;
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          totalFocusMin += data.focusMinutes || 0;
          totalSessionsCount += 1;
        });

        setTodayStats((prev) => ({
          ...prev,
          focusMinutes: totalFocusMin,
          sessions: totalSessionsCount
        }));
      },
      (err) => console.warn('Firestore sessions snapshot error:', err)
    );

    return () => unsubscribe();
  }, [userAuth?.uid, syncCode]);

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

  const handleUpdateIntention = useCallback(
    async (newIntention: string) => {
      setIntention(newIntention);
      if (syncCode) {
        updateSyncDoc(syncCode, { intention: newIntention });
        return;
      }
      if (!userAuth?.uid) return;
      try {
        await setDoc(doc(db, 'users', userAuth.uid), { intention: newIntention }, { merge: true });
      } catch (err) {
        console.warn('Error saving intention:', err);
      }
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
    async (text: string, sessionGoal: string) => {
      const newDistraction = {
        id: Math.random().toString(36).substring(2, 10),
        userId: userAuth?.uid || 'anonymous',
        text,
        sessionIntention: sessionGoal,
        createdAt: Date.now()
      };

      if (syncCode) {
        setDistractions((prev) => {
          const next = [newDistraction, ...prev];
          updateSyncDoc(syncCode, { distractions: next });
          return next;
        });
        setTodayStats((prev) => {
          const next = { ...prev, distractions: prev.distractions + 1 };
          updateSyncDoc(syncCode, { todayStats: next });
          return next;
        });
        return;
      }

      if (!userAuth?.uid) return;
      try {
        await addDoc(collection(db, 'distractions'), newDistraction);
      } catch (err) {
        console.warn('Error logging distraction:', err);
      }
    },
    [userAuth?.uid, syncCode]
  );

  const handleUpdateNotes = useCallback(
    async (newNotes: string) => {
      setNotes(newNotes);
      if (syncCode) {
        updateSyncDoc(syncCode, { notes: newNotes });
        return;
      }
      if (!userAuth?.uid) return;
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
        console.warn('Error updating notes:', err);
      }
    },
    [userAuth?.uid, syncCode]
  );

  const handleLogCompletedSession = useCallback(
    async (focusMins: number) => {
      if (syncCode) {
        setTodayStats((prev) => {
          const next = {
            ...prev,
            focusMinutes: prev.focusMinutes + focusMins,
            sessions: prev.sessions + 1
          };
          updateSyncDoc(syncCode, { todayStats: next });
          return next;
        });
        return;
      }

      if (!userAuth?.uid) return;
      try {
        await addDoc(collection(db, 'sessions'), {
          userId: userAuth.uid,
          title: intention || 'Focus Session',
          focusMinutes: focusMins,
          breakMinutes: settings.breakMinutes,
          completedAt: Date.now(),
          dateKey: getTodayKey()
        });
      } catch (err) {
        console.warn('Error logging completed session:', err);
      }
    },
    [intention, settings.breakMinutes, userAuth?.uid, syncCode]
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
      <main className="flex-grow flex flex-col items-center justify-center p-4 md:p-8 w-full max-w-7xl mx-auto">
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
    </div>
  );
}
