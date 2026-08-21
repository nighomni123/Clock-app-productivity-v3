import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, RotateCcw, AlertTriangle, Maximize2, Minimize2, FileText, Check, Trash2, Plus, ListFilter, Timer as TimerIcon } from 'lucide-react';
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
}

type TimerMode = 'focus' | 'break' | 'longBreak';

const MODE_META: Record<TimerMode, { label: string; sub: string; ring: string; glow: string; text: string }> = {
  focus: { label: 'Focus', sub: 'Deep work in progress', ring: 'stroke-indigo-400', glow: 'shadow-indigo-500/30', text: 'text-indigo-300' },
  break: { label: 'Break', sub: 'Step away & recharge', ring: 'stroke-emerald-400', glow: 'shadow-emerald-500/30', text: 'text-emerald-300' },
  longBreak: { label: 'Long Break', sub: 'Well earned rest', ring: 'stroke-fuchsia-400', glow: 'shadow-fuchsia-500/30', text: 'text-fuchsia-300' }
};

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
  onLogCompletedSession
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
      setTimeout(() => setTimerMode(isLongBreakDue ? 'longBreak' : 'break', settings.autoStartBreaks), 900);
    } else {
      sendNotification('Break over!', { body: 'Ready for another focus session?' });
      setTimeout(() => setTimerMode('focus', settings.autoStartFocus), 900);
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
    if (autoStart) endTimeRef.current = Date.now() + duration;
    else endTimeRef.current = null;
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

  const startDistractionTimer = () => { distractionStartTimeRef.current = Date.now(); };

  const toggleFullscreenMode = useCallback(() => { setFocusFullscreen((curr) => !curr); }, []);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (e.code === 'Space' && target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
      if (e.code === 'Space') {
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
  const activeTasks = tasks.filter((t) => !t.completed);
  const meta = MODE_META[timerMode];
  const R = 150;
  const CIRC = 2 * Math.PI * R;

  // ── Fullscreen immersive view ────────────────────────────────
  if (focusFullscreen) {
    return (
      <div className="fixed inset-0 z-[60] bg-black flex flex-col items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(60rem_60rem_at_50%_0%,rgba(99,102,241,0.18),transparent_60%)]" />
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={toggleFullscreenMode}
          className="absolute top-6 right-6 z-10 p-3 rounded-full glass hover:bg-white/10 transition-colors"
          aria-label="Exit fullscreen"
        >
          <Minimize2 className="w-5 h-5 text-zinc-300" />
        </motion.button>

        <div className="relative z-10 text-center px-6">
          {intention && (
            <motion.p
              initial={{ opacity: 0, y: -16 }}
              animate={{ opacity: 1, y: 0 }}
              className={`text-sm ${meta.text} mb-6 uppercase tracking-[0.2em] font-medium`}
            >
              {intention}
            </motion.p>
          )}

          <motion.div initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="relative w-[20rem] h-[20rem] sm:w-[24rem] sm:h-[24rem] mx-auto">
            <svg className="w-full h-full -rotate-90">
              <circle cx="50%" cy="50%" r={R} stroke="currentColor" strokeWidth="10" fill="transparent" className="text-white/10" />
              <motion.circle
                cx="50%" cy="50%" r={R} stroke="currentColor" strokeWidth="10" fill="transparent"
                strokeDasharray={CIRC} strokeLinecap="round"
                initial={{ strokeDashoffset: CIRC }}
                animate={{ strokeDashoffset: CIRC * (1 - progress / 100) }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
                className={meta.ring}
                style={{ filter: 'drop-shadow(0 0 12px currentColor)' }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="text-6xl sm:text-7xl font-thin text-white tracking-tight tabular-nums">{formatTime(timeLeft)}</div>
              <div className={`mt-3 text-sm font-medium ${meta.text}`}>{meta.label}</div>
            </div>
          </motion.div>

          <div className="mt-12 flex items-center justify-center gap-5">
            <motion.button whileTap={{ scale: 0.9 }} onClick={resetTimer} className="p-4 rounded-full glass hover:bg-white/10 transition-colors" aria-label="Reset">
              <RotateCcw className="w-6 h-6 text-zinc-300" />
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={toggleTimer}
              className={`p-7 rounded-full bg-white text-black ${meta.glow} shadow-2xl transition-transform`}
              aria-label={isRunning ? 'Pause' : 'Start'}
            >
              {isRunning ? <Pause className="w-9 h-9" /> : <Play className="w-9 h-9 ml-1" />}
            </motion.button>
            <div className="w-14" />
          </div>

          <div className="mt-8 text-xs text-zinc-500">
            Session {completedInCycle + 1} · Press <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-zinc-300">Space</kbd> to {isRunning ? 'pause' : 'start'}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-white tracking-tight">Focus</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Pomodoro timer with integrated tasks & notes</p>
        </div>
        <motion.button whileTap={{ scale: 0.9 }} onClick={toggleFullscreenMode} className="p-3 rounded-xl glass hover:bg-white/10 transition-colors" aria-label="Fullscreen timer">
          <Maximize2 className="w-5 h-5 text-zinc-300" />
        </motion.button>
      </motion.div>

      <AnimatePresence>
        {strictAlert && (
          <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} className="mb-5">
            <div className="rounded-2xl p-4 flex items-center gap-3 bg-rose-500/10 border border-rose-500/30">
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
              <div className="flex-1">
                <div className="text-sm font-medium text-rose-300">Strict Mode Triggered</div>
                <div className="text-xs text-rose-400/70">
                  {strictAlert.text} · {strictAlert.durationSeconds > 60 ? `${Math.round(strictAlert.durationSeconds / 60)}m` : `${strictAlert.durationSeconds}s`}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* Timer */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="xl:col-span-2">
          <div className="glass card-shadow rounded-3xl p-6 sm:p-10 h-full flex flex-col">
            {/* Mode pills */}
            <div className="flex items-center justify-center gap-1.5 mb-6">
              {(['focus', 'break', 'longBreak'] as TimerMode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => setTimerMode(m, false)}
                  className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all ${
                    timerMode === m ? `${MODE_META[m].text} bg-white/10` : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  {MODE_META[m].label}
                </button>
              ))}
            </div>

            {intention && (
              <div className="text-center mb-4">
                <p className="text-[11px] text-zinc-500 uppercase tracking-wider mb-1">Session Goal</p>
                <h2 className="text-base text-zinc-200 font-light">{intention}</h2>
              </div>
            )}

            <div className="relative w-56 h-56 sm:w-72 sm:h-72 mx-auto my-4">
              <svg className="w-full h-full -rotate-90">
                <circle cx="50%" cy="50%" r={R} stroke="currentColor" strokeWidth="8" fill="transparent" className="text-white/10" />
                <motion.circle
                  cx="50%" cy="50%" r={R} stroke="currentColor" strokeWidth="8" fill="transparent"
                  strokeDasharray={CIRC} strokeLinecap="round"
                  initial={{ strokeDashoffset: CIRC }}
                  animate={{ strokeDashoffset: CIRC * (1 - progress / 100) }}
                  transition={{ duration: 0.4, ease: 'easeOut' }}
                  className={meta.ring}
                  style={{ filter: 'drop-shadow(0 0 10px currentColor)' }}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-5xl sm:text-6xl font-thin text-white tracking-tight tabular-nums">{formatTime(timeLeft)}</div>
              </div>
            </div>

            <div className="flex items-center justify-center gap-4 mt-2">
              <motion.button whileTap={{ scale: 0.9 }} onClick={resetTimer} className="p-3.5 rounded-full glass hover:bg-white/10 transition-colors" aria-label="Reset">
                <RotateCcw className="w-5 h-5 text-zinc-300" />
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={toggleTimer}
                className={`p-6 rounded-full bg-white text-black ${meta.glow} shadow-xl transition-transform`}
                aria-label={isRunning ? 'Pause' : 'Start'}
              >
                {isRunning ? <Pause className="w-7 h-7" /> : <Play className="w-7 h-7 ml-0.5" />}
              </motion.button>
              <div className="w-14" />
            </div>

            <div className="mt-5 text-center">
              <button onClick={() => setTimerMode(timerMode, false)} className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
                Reset to {MODE_META[timerMode].label} · {timerMode === 'focus' ? settings.focusMinutes : timerMode === 'break' ? settings.breakMinutes : settings.longBreakMinutes}m
              </button>
            </div>
          </div>
        </motion.div>

        {/* Sidebar: tasks, distraction, notes */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }} className="space-y-5">
          {/* Quick intention */}
          <div className="glass card-shadow rounded-2xl p-4">
            <label className="text-xs text-zinc-500 uppercase tracking-wide mb-2 block">Today's Intention</label>
            <input
              type="text"
              value={intention}
              onChange={(e) => onUpdateIntention(e.target.value)}
              placeholder="What are you focusing on?"
              className="w-full bg-white/5 border border-white/5 rounded-xl px-3 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition-all"
            />
          </div>

          {/* Quick Tasks */}
          <div className="glass card-shadow rounded-2xl p-4">
            <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <ListFilter className="w-4 h-4 text-indigo-400" />
              Quick Tasks
            </h3>
            <div className="space-y-1.5 mb-3 max-h-44 overflow-y-auto no-scrollbar">
              {activeTasks.length === 0 && <p className="text-xs text-zinc-600 py-2">No active tasks.</p>}
              {activeTasks.slice(0, 5).map((task) => (
                <motion.div key={task.id} layout className="flex items-center gap-2 p-2 rounded-lg bg-white/5">
                  <motion.button whileTap={{ scale: 0.9 }} onClick={() => onToggleTask(task.id)} className="w-5 h-5 rounded-md border-2 border-zinc-600 flex items-center justify-center">
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
                className="flex-1 bg-white/5 border border-white/5 rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
              />
              <motion.button whileTap={{ scale: 0.9 }} onClick={handleAddTask} className="p-2 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 transition-colors">
                <Plus className="w-4 h-4" />
              </motion.button>
            </div>
          </div>

          {/* Distraction Log */}
          {settings.strictMode && (
            <div className="glass card-shadow rounded-2xl p-4">
              <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                Log Distraction
              </h3>
              <textarea
                value={newDistraction}
                onChange={(e) => setNewDistraction(e.target.value)}
                onFocus={startDistractionTimer}
                placeholder="What distracted you?"
                rows={2}
                className="w-full bg-white/5 border border-white/5 rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-500/40 resize-none"
              />
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleLogDistraction}
                disabled={!newDistraction.trim()}
                className="w-full mt-2 py-2 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 disabled:opacity-40 text-amber-300 text-xs font-medium transition-colors"
              >
                Log Distraction
              </motion.button>
            </div>
          )}

          {/* Notes */}
          <div className="glass card-shadow rounded-2xl p-4">
            <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-400" />
              Session Notes
            </h3>
            <textarea
              value={notes}
              onChange={(e) => onUpdateNotes(e.target.value)}
              placeholder="Jot down thoughts..."
              rows={4}
              className="w-full bg-white/5 border border-white/5 rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 resize-none"
            />
          </div>
        </motion.div>
      </div>
    </div>
  );
};
