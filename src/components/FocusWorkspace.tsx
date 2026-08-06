import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, RotateCcw, AlertTriangle, Maximize2, Minimize2, FileText, Check, Trash2, Plus, ListFilter } from 'lucide-react';
import { UserSettings, TaskItem, DistractionItem } from '../types';
import { playSound } from '../lib/audio';
import { sendNotification } from '../lib/notifications';

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

const formatClock = (milliseconds: number): string => {
  const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
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
  const [mode, setMode] = useState<'focus' | 'break' | 'longBreak'>('focus');
  const [isRunning, setIsRunning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(settings.focusMinutes * 60000);
  const [sessionDuration, setSessionDuration] = useState(settings.focusMinutes * 60000);
  const [completedInCycle, setCompletedInCycle] = useState(0);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [distractionInput, setDistractionInput] = useState('');
  const [focusFullscreen, setFocusFullscreen] = useState(false);

  const endTimeRef = useRef(0);
  const completionLockRef = useRef(false);
  const strictModePausedAtRef = useRef<number | null>(null);
  const [strictAlert, setStrictAlert] = useState<{ durationSeconds: number } | null>(null);

  const isRunningRef = useRef(isRunning);
  useEffect(() => { isRunningRef.current = isRunning; }, [isRunning]);

  const modeRef = useRef(mode);
  useEffect(() => { modeRef.current = mode; }, [mode]);

  const timeLeftRef = useRef(timeLeft);
  useEffect(() => { timeLeftRef.current = timeLeft; }, [timeLeft]);

  useEffect(() => {
    if (!settings.strictMode) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (isRunningRef.current && modeRef.current === 'focus') {
          strictModePausedAtRef.current = Date.now();
          const remaining = Math.max(0, endTimeRef.current - Date.now());
          setTimeLeft(remaining);
          setIsRunning(false);
        }
      } else {
        if (strictModePausedAtRef.current !== null) {
          const durationMs = Date.now() - strictModePausedAtRef.current;
          const durationSeconds = Math.round(durationMs / 1000);
          
          if (durationSeconds >= 1) {
            onLogDistraction('Strict Mode: App sent to background', intention || 'General Study', durationSeconds);
            setStrictAlert({ durationSeconds });
            setTimeout(() => setStrictAlert(null), 5000);
          }
          
          strictModePausedAtRef.current = null;
          completionLockRef.current = false;
          endTimeRef.current = Date.now() + timeLeftRef.current;
          setIsRunning(true);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [settings.strictMode, intention, onLogDistraction]);

  const durationForMode = useCallback(
    (m: 'focus' | 'break' | 'longBreak') => {
      if (m === 'break') return settings.breakMinutes * 60000;
      if (m === 'longBreak') return settings.longBreakMinutes * 60000;
      return settings.focusMinutes * 60000;
    },
    [settings.focusMinutes, settings.breakMinutes, settings.longBreakMinutes]
  );

  const setTimerMode = useCallback(
    (nextMode: 'focus' | 'break' | 'longBreak', autoStart = false) => {
      const duration = durationForMode(nextMode);
      setMode(nextMode);
      setSessionDuration(duration);
      setTimeLeft(duration);
      setIsRunning(autoStart);
      completionLockRef.current = false;
      if (autoStart) {
        endTimeRef.current = Date.now() + duration;
      }
    },
    [durationForMode]
  );

  useEffect(() => {
    if (isRunning) return;
    const duration = durationForMode(mode);
    setSessionDuration(duration);
    setTimeLeft(duration);
  }, [settings, mode, isRunning, durationForMode]);

  const finishSession = useCallback(() => {
    if (completionLockRef.current) return;
    completionLockRef.current = true;
    setIsRunning(false);
    setTimeLeft(0);

    // Audio chime
    playSound(settings.sound, settings.volume);

    // Web Notification
    if (settings.enableNotifications) {
      const title = mode === 'focus' ? 'Focus Session Completed!' : 'Break Completed!';
      const body = mode === 'focus' ? 'Great job! Time for a short break.' : 'Break is over. Ready to focus again?';
      sendNotification(title, { body });
    }

    if (mode === 'focus') {
      onLogCompletedSession(settings.focusMinutes);

      const nextCompleted = completedInCycle + 1;
      const isLongBreakDue = nextCompleted >= settings.sessionsBeforeLongBreak;
      setCompletedInCycle(isLongBreakDue ? 0 : nextCompleted);

      setTimeout(() => {
        setTimerMode(isLongBreakDue ? 'longBreak' : 'break', settings.autoStartBreaks);
      }, 900);
    } else {
      setTimeout(() => {
        setTimerMode('focus', settings.autoStartFocus);
      }, 900);
    }
  }, [
    completedInCycle,
    mode,
    onLogCompletedSession,
    setTimerMode,
    settings.autoStartBreaks,
    settings.autoStartFocus,
    settings.enableNotifications,
    settings.focusMinutes,
    settings.sessionsBeforeLongBreak,
    settings.sound,
    settings.volume
  ]);

  useEffect(() => {
    if (!isRunning) return;
    const tick = () => {
      const remaining = endTimeRef.current - Date.now();
      if (remaining <= 0) {
        finishSession();
        return;
      }
      setTimeLeft(remaining);
    };
    tick();
    const interval = setInterval(tick, 250);
    return () => clearInterval(interval);
  }, [isRunning, finishSession]);

  const toggleTimer = useCallback(() => {
    if (timeLeft <= 0) {
      setTimerMode(mode, true);
      return;
    }
    if (isRunning) {
      setTimeLeft(Math.max(0, endTimeRef.current - Date.now()));
      setIsRunning(false);
    } else {
      completionLockRef.current = false;
      endTimeRef.current = Date.now() + timeLeft;
      setIsRunning(true);
    }
  }, [isRunning, mode, setTimerMode, timeLeft]);

  const resetTimer = useCallback(() => {
    setIsRunning(false);
    completionLockRef.current = false;
    const duration = durationForMode(mode);
    setSessionDuration(duration);
    setTimeLeft(duration);
  }, [durationForMode, mode]);

  const handleLogDistractionSubmit = useCallback(
    (customText?: string) => {
      const text = customText || distractionInput.trim();
      if (!text) return;
      onLogDistraction(text, intention || 'General Study');
      setDistractionInput('');
    },
    [distractionInput, intention, onLogDistraction]
  );

  const toggleFullscreenMode = useCallback(() => {
    setFocusFullscreen((curr) => !curr);
  }, []);

  // Keyboard Shortcuts Listener
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isTyping =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        target?.isContentEditable;
      if (isTyping) return;

      if (e.code === 'Space') {
        e.preventDefault();
        toggleTimer();
      } else if (e.key.toLowerCase() === 'r') {
        e.preventDefault();
        resetTimer();
      } else if (e.key.toLowerCase() === 'd') {
        e.preventDefault();
        handleLogDistractionSubmit('Quick Distraction logged via key shortcut');
      } else if (e.key.toLowerCase() === 'n') {
        e.preventDefault();
        document.getElementById('quick-notes-textarea')?.focus();
      } else if (e.key.toLowerCase() === 'f') {
        e.preventDefault();
        toggleFullscreenMode();
      } else if (e.key === 'Escape' && focusFullscreen) {
        setFocusFullscreen(false);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [focusFullscreen, handleLogDistractionSubmit, resetTimer, toggleFullscreenMode, toggleTimer]);

  const progress = sessionDuration ? ((sessionDuration - timeLeft) / sessionDuration) * 100 : 0;
  const activeLabel = mode === 'focus' ? 'Focus Block' : mode === 'longBreak' ? 'Long Break' : 'Short Break';

  return (
    <div className="mx-auto w-full max-w-7xl animate-in fade-in zoom-in-95 duration-500">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,1fr)]">
        {/* Timer Canvas Panel */}
        <div
          className={`relative flex flex-col items-center justify-center overflow-hidden transition-all duration-700 ${
            focusFullscreen
              ? 'fixed inset-0 z-[100] bg-black px-6 py-10'
              : 'min-h-[480px] rounded-3xl border border-zinc-800/80 bg-zinc-900/45 p-8 h-full backdrop-blur-sm'
          }`}
        >
          {/* Strict Mode Alert Overlay */}
          {strictAlert && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-top-4 fade-in duration-300">
              <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 px-4 py-2 rounded-xl backdrop-blur-md shadow-xl flex items-center gap-2">
                <span className="text-sm font-medium">Strict Mode Triggered!</span>
                <span className="text-xs bg-rose-950/50 px-1.5 py-0.5 rounded text-rose-300 border border-rose-900/50">
                  {strictAlert.durationSeconds > 60 ? `${Math.round(strictAlert.durationSeconds / 60)}m` : `${strictAlert.durationSeconds}s`} recorded
                </span>
              </div>
            </div>
          )}

          {/* Ambient Progress Fill */}
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 bg-zinc-800/20 transition-all duration-500 ease-linear"
            style={{ height: `${progress}%` }}
          />

          {/* Fullscreen toggle button */}
          <button
            id="toggle-fullscreen-button"
            onClick={toggleFullscreenMode}
            className="absolute right-5 top-5 z-20 rounded-full p-3 text-zinc-500 transition hover:bg-zinc-800 hover:text-white"
            title={focusFullscreen ? 'Exit Focus Mode (F)' : 'Enter Fullscreen Focus Mode (F)'}
          >
            {focusFullscreen ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
          </button>

          <div className="relative z-10 flex w-full max-w-3xl flex-col items-center">
            {/* Mode Selector */}
            <div className="mb-6 flex rounded-full border border-zinc-800 bg-black/40 p-1">
              {[
                ['focus', 'Focus'],
                ['break', 'Break'],
                ['longBreak', 'Long Break']
              ].map(([mKey, label]) => (
                <button
                  key={mKey}
                  onClick={() => setTimerMode(mKey as 'focus' | 'break' | 'longBreak')}
                  className={`rounded-full px-4 py-1.5 text-xs font-medium transition ${
                    mode === mKey ? 'bg-zinc-100 text-zinc-950 shadow' : 'text-zinc-500 hover:text-zinc-200'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <p className="mb-2 text-xs font-medium uppercase tracking-[0.3em] text-zinc-500">{activeLabel}</p>

            {/* Display Clock */}
            <div
              className={`font-extralight tracking-tighter tabular-nums text-zinc-100 transition-all duration-500 ${
                focusFullscreen ? 'text-[22vw] leading-none md:text-[13rem]' : 'text-7xl md:text-9xl'
              }`}
            >
              {formatClock(timeLeft)}
            </div>

            {/* Session Intention */}
            <div className="mt-6 min-h-[50px] text-center max-w-xl">
              {intention ? (
                <>
                  <p className="text-[10px] uppercase tracking-[0.25em] text-zinc-500">Session Goal</p>
                  <p className={`mt-1 font-light text-zinc-200 ${focusFullscreen ? 'text-2xl md:text-3xl' : 'text-lg'}`}>
                    {intention}
                  </p>
                </>
              ) : (
                <p className="text-sm text-zinc-600">Set a study goal in Clock tab or type notes below.</p>
              )}
            </div>

            {/* Controls */}
            <div className="mt-8 flex items-center gap-5">
              <button
                id="timer-play-pause-btn"
                onClick={toggleTimer}
                className="flex h-16 w-16 items-center justify-center rounded-full bg-zinc-100 text-zinc-950 transition hover:scale-105 hover:bg-white shadow-lg"
                title="Start or Pause (Space)"
              >
                {isRunning ? <Pause className="h-7 w-7" /> : <Play className="h-7 w-7 ml-0.5" />}
              </button>
              <button
                id="timer-reset-btn"
                onClick={resetTimer}
                className="flex h-14 w-14 items-center justify-center rounded-full border border-zinc-800 bg-zinc-900 text-zinc-400 transition hover:border-zinc-700 hover:text-white"
                title="Reset Session (R)"
              >
                <RotateCcw className="h-5 w-5" />
              </button>
              <button
                id="timer-distraction-btn"
                onClick={() => handleLogDistractionSubmit('Quick distraction logged')}
                className="flex h-14 items-center gap-2 rounded-full border border-amber-900/40 bg-amber-950/20 px-5 text-sm text-amber-300 transition hover:bg-amber-950/40"
                title="Log Distraction (D)"
              >
                <AlertTriangle className="h-4 w-4" /> Log Distraction
              </button>
            </div>

            {/* Keyboard Shortcuts Footer */}
            <div className="mt-8 flex flex-wrap justify-center gap-2 text-[11px] text-zinc-600">
              <span className="rounded-full border border-zinc-800/60 bg-black/30 px-2.5 py-1">Space: Play/Pause</span>
              <span className="rounded-full border border-zinc-800/60 bg-black/30 px-2.5 py-1">R: Reset</span>
              <span className="rounded-full border border-zinc-800/60 bg-black/30 px-2.5 py-1">D: Distraction</span>
              <span className="rounded-full border border-zinc-800/60 bg-black/30 px-2.5 py-1">N: Quick Notes</span>
              <span className="rounded-full border border-zinc-800/60 bg-black/30 px-2.5 py-1">F: Fullscreen</span>
            </div>
          </div>
        </div>

        {/* Right Sidebar: Tasks Queue, Quick Notes, Distraction Logger */}
        <div className="flex flex-col gap-6">
          {/* Quick Tasks Panel */}
          <section className="rounded-3xl border border-zinc-800/80 bg-zinc-900/55 p-6 backdrop-blur-sm flex flex-col h-[280px]">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ListFilter className="h-4 w-4 text-zinc-400" />
                <h2 className="font-medium text-zinc-200 text-sm">Study Task Queue</h2>
              </div>
              <span className="text-xs text-zinc-500">{tasks.filter((t) => t.complete).length}/{tasks.length} Done</span>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!newTaskTitle.trim()) return;
                onAddTask(newTaskTitle.trim());
                setNewTaskTitle('');
              }}
              className="mb-3 flex gap-2"
            >
              <input
                type="text"
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                placeholder="Add a quick task..."
                className="flex-grow rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-100 outline-none focus:border-zinc-600"
              />
              <button
                type="submit"
                className="rounded-lg bg-zinc-800 px-3 py-2 text-zinc-200 hover:bg-zinc-700 hover:text-white"
              >
                <Plus className="h-4 w-4" />
              </button>
            </form>

            <div className="flex-grow overflow-y-auto pr-1 space-y-2 text-xs">
              {tasks.length === 0 ? (
                <p className="text-center text-zinc-600 mt-6">No tasks added yet.</p>
              ) : (
                tasks.map((task) => (
                  <div
                    key={task.id}
                    className="group flex items-center justify-between rounded-lg border border-zinc-800/50 bg-black/30 p-2 transition hover:border-zinc-700"
                  >
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <button
                        onClick={() => onToggleTask(task.id)}
                        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition ${
                          task.complete ? 'bg-zinc-200 border-zinc-200' : 'border-zinc-700 hover:border-zinc-500'
                        }`}
                      >
                        {task.complete && <Check className="h-3 w-3 text-zinc-950" />}
                      </button>
                      <span className={`truncate ${task.complete ? 'line-through text-zinc-600' : 'text-zinc-300'}`}>
                        {task.title}
                      </span>
                    </div>
                    <button
                      onClick={() => onRemoveTask(task.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-zinc-600 hover:text-red-400"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* Quick Notes Scratchpad */}
          <section className="rounded-3xl border border-zinc-800/80 bg-zinc-900/55 p-6 backdrop-blur-sm flex flex-col h-[200px]">
            <div className="mb-2 flex items-center gap-2">
              <FileText className="h-4 w-4 text-zinc-400" />
              <h2 className="font-medium text-zinc-200 text-sm">Quick Notes Scratchpad</h2>
            </div>
            <textarea
              id="quick-notes-textarea"
              value={notes}
              onChange={(e) => onUpdateNotes(e.target.value)}
              placeholder="Jot down ideas, formulas, or thoughts during focus sessions... (Press N to focus)"
              className="flex-grow resize-none rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-xs text-zinc-300 outline-none focus:border-zinc-600 leading-relaxed"
            />
          </section>

          {/* Today's Distraction Logger */}
          <section className="rounded-3xl border border-zinc-800/80 bg-zinc-900/55 p-6 backdrop-blur-sm flex flex-col h-[210px]">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <h2 className="font-medium text-zinc-200 text-sm">Distraction Log</h2>
              </div>
              <span className="rounded-full bg-amber-950/40 px-2 py-0.5 text-[10px] text-amber-400 border border-amber-900/40">
                {distractionLog.length} Recorded
              </span>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleLogDistractionSubmit();
              }}
              className="mb-3 flex gap-2"
            >
              <input
                type="text"
                value={distractionInput}
                onChange={(e) => setDistractionInput(e.target.value)}
                placeholder="What distracted you?"
                className="flex-grow rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-100 outline-none focus:border-zinc-600"
              />
              <button
                type="submit"
                className="rounded-lg border border-amber-900/40 bg-amber-950/30 px-3 py-1.5 text-xs text-amber-300 hover:bg-amber-950/60"
              >
                Log
              </button>
            </form>

            <div className="flex-grow overflow-y-auto space-y-1.5 text-xs pr-1">
              {distractionLog.length === 0 ? (
                <p className="text-center text-zinc-600 mt-4">No distractions logged today.</p>
              ) : (
                distractionLog.map((item) => (
                  <div key={item.id} className="rounded-lg border border-zinc-800/50 bg-black/40 p-2 flex justify-between items-center gap-2">
                    <span className="text-zinc-300 truncate flex-grow">{item.text}</span>
                    {item.durationSeconds !== undefined && (
                      <span className="text-[10px] text-amber-500/80 bg-amber-950/30 px-1.5 py-0.5 rounded border border-amber-900/40 shrink-0">
                        {item.durationSeconds > 60 ? `${Math.round(item.durationSeconds / 60)}m` : `${item.durationSeconds}s`}
                      </span>
                    )}
                    <span className="text-[10px] text-zinc-500 shrink-0">
                      {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
