import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, RotateCcw, AlertTriangle, Maximize2, Minimize2, FileText, Check, Trash2, Plus, ListFilter } from 'lucide-react';
import { UserSettings, TaskItem, DistractionItem } from '../types';
import { playSound } from '../lib/audio';
import { sendNotification } from '../lib/notifications';
import { motion, AnimatePresence } from 'motion/react';

interface FocusWorkspaceProps {
  settings: UserSettings;
  intention: string;
  onUpdateIntention: (intention: string) => void;
  tasks: TaskItem[];
  onAddTask: (title: string) => void;
  onToggleTask: (id: string) => void;
  onRemoveTask: (id: string) => void;
  notes: string;
  onUpdateNotes: (notes: string) => void;
  distractionLog: DistractionItem[];
  onLogDistraction: (text: string, intention: string, durationSeconds?: number) => void;
  onLogCompletedSession: (focusMinutes: number) => void;
  onOpenJournal?: () => void;
  journalEntries?: any[];
}

type TimerMode = 'focus' | 'break' | 'longBreak';

export const FocusWorkspace: React.FC<FocusWorkspaceProps> = ({
  settings,
  intention,
  onUpdateIntention,
  tasks,
  onAddTask,
  onToggleTask,
  onRemoveTask,
  notes,
  onUpdateNotes,
  distractionLog,
  onLogDistraction,
  onLogCompletedSession,
  onOpenJournal,
  journalEntries = []
}) => {
  const [timerMode, setTimerModeState] = useState<TimerMode>('focus');
  const [isRunning, setIsRunning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(settings.focusMinutes * 60);
  const [completedInCycle, setCompletedInCycle] = useState(0);
  const [sessionDuration, setSessionDuration] = useState(settings.focusMinutes * 60);
  const [focusFullscreen, setFocusFullscreen] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newDistraction, setNewDistraction] = useState('');
  const [strictAlert, setStrictAlert] = useState<{ text: string; durationSeconds: number } | null>(null);

  const endTimeRef = useRef<number | null>(null);
  const completionLockRef = useRef(false);
  const distractionStartTimeRef = useRef<number | null>(null);

  // Timer logic
  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      if (endTimeRef.current) {
        const remaining = Math.max(0, Math.floor((endTimeRef.current - Date.now()) / 1000));
        setTimeLeft(remaining);

        if (remaining === 0 && !completionLockRef.current) {
          completionLockRef.current = true;
          handleTimerComplete();
        }
      }
    }, 100);

    return () => clearInterval(interval);
  }, [isRunning]);

  const handleTimerComplete = () => {
    setIsRunning(false);
    playSound(settings.sound, settings.volume);

    if (timerMode === 'focus') {
      const focusMinutes = settings.focusMinutes;
      onLogCompletedSession(focusMinutes);
      sendNotification('Focus session complete!', { body: 'Time for a break.' });

      const isLongBreakDue = (completedInCycle + 1) % settings.sessionsBeforeLongBreak === 0;
      const nextCompleted = completedInCycle + 1;
      setCompletedInCycle(nextCompleted);

      setTimeout(() => {
        setTimerMode(isLongBreakDue ? 'longBreak' : 'break', settings.autoStartBreaks);
      }, 900);
    } else {
      sendNotification('Break over!', { body: 'Ready for another focus session?' });
      setTimeout(() => {
        setTimerMode('focus', settings.autoStartFocus);
      }, 900);
    }
  };

  const setTimerMode = (mode: TimerMode, autoStart: boolean) => {
    setTimerModeState(mode);
    const duration = mode === 'focus' 
      ? settings.focusMinutes * 60 
      : mode === 'break' 
      ? settings.breakMinutes * 60 
      : settings.longBreakMinutes * 60;
    
    setSessionDuration(duration);
    setTimeLeft(duration);
    setIsRunning(autoStart);
    completionLockRef.current = false;
    
    if (autoStart) {
      endTimeRef.current = Date.now() + duration;
    } else {
      endTimeRef.current = null;
    }
  };

  const toggleTimer = () => {
    if (isRunning) {
      setIsRunning(false);
      endTimeRef.current = null;
    } else {
      setIsRunning(true);
      endTimeRef.current = Date.now() + timeLeft * 1000;
    }
  };

  const resetTimer = () => {
    setIsRunning(false);
    setTimeLeft(sessionDuration);
    endTimeRef.current = null;
    completionLockRef.current = false;
  };

  const handleAddTask = () => {
    if (!newTaskTitle.trim()) return;
    onAddTask(newTaskTitle.trim());
    setNewTaskTitle('');
  };

  const handleLogDistraction = () => {
    if (!newDistraction.trim()) return;
    
    let durationSeconds = 0;
    if (distractionStartTimeRef.current) {
      durationSeconds = Math.floor((Date.now() - distractionStartTimeRef.current) / 1000);
      distractionStartTimeRef.current = null;
    }

    onLogDistraction(newDistraction.trim(), intention, durationSeconds);
    
    if (settings.strictMode && isRunning && timerMode === 'focus') {
      setStrictAlert({ text: newDistraction.trim(), durationSeconds });
      setTimeout(() => setStrictAlert(null), 4000);
    }
    
    setNewDistraction('');
  };

  const startDistractionTimer = () => {
    distractionStartTimeRef.current = Date.now();
  };

  const toggleFullscreenMode = useCallback(() => {
    setFocusFullscreen((curr) => !curr);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.target) {
        e.preventDefault();
        toggleTimer();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [toggleTimer]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = ((sessionDuration - timeLeft) / sessionDuration) * 100;
  const activeTasks = tasks.filter(t => !t.completed);

  if (focusFullscreen) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center">
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={toggleFullscreenMode}
          className="absolute top-6 right-6 p-3 rounded-full bg-zinc-900/50 hover:bg-zinc-800/50 transition-colors"
        >
          <Minimize2 className="w-5 h-5 text-zinc-400" />
        </motion.button>

        <div className="text-center">
          {intention && (
            <motion.p
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-sm text-zinc-500 mb-4 uppercase tracking-wider"
            >
              {intention}
            </motion.p>
          )}

          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="relative w-80 h-80 mb-12"
          >
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="160"
                cy="160"
                r="140"
                stroke="currentColor"
                strokeWidth="8"
                fill="transparent"
                className="text-zinc-800"
              />
              <motion.circle
                cx="160"
                cy="160"
                r="140"
                stroke="currentColor"
                strokeWidth="8"
                fill="transparent"
                strokeDasharray={2 * Math.PI * 140}
                initial={{ strokeDashoffset: 2 * Math.PI * 140 }}
                animate={{ strokeDashoffset: 2 * Math.PI * 140 * (1 - progress / 100) }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                className={timerMode === 'focus' ? 'text-blue-500' : 'text-green-500'}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-7xl font-thin text-white tracking-tight">
                {formatTime(timeLeft)}
              </div>
            </div>
          </motion.div>

          <div className="flex items-center justify-center gap-4">
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={resetTimer}
              className="p-4 rounded-full bg-zinc-900/50 hover:bg-zinc-800/50 transition-colors"
            >
              <RotateCcw className="w-6 h-6 text-zinc-400" />
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={toggleTimer}
              className="p-6 rounded-full bg-white hover:bg-zinc-200 transition-colors"
            >
              {isRunning ? (
                <Pause className="w-8 h-8 text-black" />
              ) : (
                <Play className="w-8 h-8 text-black" />
              )}
            </motion.button>
            <div className="w-14" />
          </div>

          <div className="mt-8 text-sm text-zinc-500">
            Session {completedInCycle + 1} · {timerMode === 'focus' ? 'Focus' : timerMode === 'break' ? 'Break' : 'Long Break'}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-zinc-100 pb-24">
      <div className="max-w-6xl mx-auto px-4 pt-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 flex items-center justify-between"
        >
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Focus</h1>
            <p className="text-sm text-zinc-500">
              {timerMode === 'focus' ? 'Time to focus' : timerMode === 'break' ? 'Take a break' : 'Long break time'}
            </p>
          </div>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={toggleFullscreenMode}
            className="p-3 rounded-full bg-zinc-900/50 hover:bg-zinc-800/50 transition-colors"
          >
            <Maximize2 className="w-5 h-5 text-zinc-400" />
          </motion.button>
        </motion.div>

        {/* Strict Mode Alert */}
        <AnimatePresence>
          {strictAlert && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mb-6"
            >
              <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-4 flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
                <div className="flex-1">
                  <div className="text-sm font-medium text-rose-400">Strict Mode Triggered</div>
                  <div className="text-xs text-rose-400/70">
                    {strictAlert.text} · {strictAlert.durationSeconds > 60 ? `${Math.round(strictAlert.durationSeconds / 60)}m` : `${strictAlert.durationSeconds}s`}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Timer Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-2"
          >
            <div className="bg-zinc-900/50 backdrop-blur-xl rounded-2xl border border-zinc-800/50 p-8">
              {/* Intention */}
              {intention && (
                <div className="text-center mb-6">
                  <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Session Goal</p>
                  <h2 className="text-lg text-white font-light">{intention}</h2>
                </div>
              )}

              {/* Timer Circle */}
              <div className="relative w-64 h-64 mx-auto mb-8">
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="128"
                    cy="128"
                    r="112"
                    stroke="currentColor"
                    strokeWidth="6"
                    fill="transparent"
                    className="text-zinc-800"
                  />
                  <motion.circle
                    cx="128"
                    cy="128"
                    r="112"
                    stroke="currentColor"
                    strokeWidth="6"
                    fill="transparent"
                    strokeDasharray={2 * Math.PI * 112}
                    initial={{ strokeDashoffset: 2 * Math.PI * 112 }}
                    animate={{ strokeDashoffset: 2 * Math.PI * 112 * (1 - progress / 100) }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                    className={timerMode === 'focus' ? 'text-blue-500' : 'text-green-500'}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-5xl font-thin text-white tracking-tight">
                    {formatTime(timeLeft)}
                  </div>
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center justify-center gap-4 mb-6">
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={resetTimer}
                  className="p-4 rounded-full bg-zinc-800/50 hover:bg-zinc-800 transition-colors"
                >
                  <RotateCcw className="w-5 h-5 text-zinc-400" />
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={toggleTimer}
                  className="p-6 rounded-full bg-white hover:bg-zinc-200 transition-colors"
                >
                  {isRunning ? (
                    <Pause className="w-7 h-7 text-black" />
                  ) : (
                    <Play className="w-7 h-7 text-black" />
                  )}
                </motion.button>
                <div className="w-13" />
              </div>

              {/* Session Info */}
              <div className="text-center text-sm text-zinc-500">
                Session {completedInCycle + 1} · {timerMode === 'focus' ? 'Focus' : timerMode === 'break' ? 'Break' : 'Long Break'}
              </div>
            </div>
          </motion.div>

          {/* Sidebar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-6"
          >
            {/* Quick Tasks */}
            <div className="bg-zinc-900/50 backdrop-blur-xl rounded-2xl border border-zinc-800/50 p-5">
              <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                <ListFilter className="w-4 h-4 text-blue-400" />
                Quick Tasks
              </h3>
              <div className="space-y-2 mb-3">
                {activeTasks.slice(0, 3).map((task) => (
                  <motion.div
                    key={task.id}
                    layout
                    className="flex items-center gap-2 p-2 rounded-lg bg-zinc-800/30"
                  >
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={() => onToggleTask(task.id)}
                      className="w-5 h-5 rounded border-2 border-zinc-700 flex items-center justify-center"
                    >
                      <Check className="w-3 h-3 text-white opacity-0" />
                    </motion.button>
                    <span className="text-xs text-zinc-300 flex-1 truncate">{task.title}</span>
                  </motion.div>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
                  placeholder="Add task..."
                  className="flex-1 bg-zinc-800/50 border border-zinc-700/50 rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                />
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={handleAddTask}
                  className="p-2 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </motion.button>
              </div>
            </div>

            {/* Distraction Log */}
            {settings.strictMode && (
              <div className="bg-zinc-900/50 backdrop-blur-xl rounded-2xl border border-zinc-800/50 p-5">
                <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  Log Distraction
                </h3>
                <div className="space-y-2">
                  <textarea
                    value={newDistraction}
                    onChange={(e) => setNewDistraction(e.target.value)}
                    onFocus={startDistractionTimer}
                    placeholder="What distracted you?"
                    rows={2}
                    className="w-full bg-zinc-800/50 border border-zinc-700/50 rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-500/50 resize-none"
                  />
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={handleLogDistraction}
                    disabled={!newDistraction.trim()}
                    className="w-full py-2 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 disabled:opacity-40 text-amber-400 text-xs font-medium transition-colors"
                  >
                    Log Distraction
                  </motion.button>
                </div>
              </div>
            )}

            {/* Notes */}
            <div className="bg-zinc-900/50 backdrop-blur-xl rounded-2xl border border-zinc-800/50 p-5">
              <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                <FileText className="w-4 h-4 text-green-400" />
                Session Notes
              </h3>
              <textarea
                value={notes}
                onChange={(e) => onUpdateNotes(e.target.value)}
                placeholder="Jot down thoughts..."
                rows={4}
                className="w-full bg-zinc-800/50 border border-zinc-700/50 rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-green-500/50 resize-none"
              />
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};
