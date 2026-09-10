import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, RotateCcw, AlertTriangle, Maximize2, Minimize2, FileText, Check, Trash2, Plus, ListFilter } from 'lucide-react';
import { UserSettings, TaskItem, DistractionItem } from '../types';
import RollingClock from './RollingClock';
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
  onStartFocusForTask?: (taskTitle: string) => void;
  focusStartRequest?: { topic: string; ts: number } | null;
  notes: string;
  onUpdateNotes: (notes: string) => void;
  distractionLog: DistractionItem[];
  onLogDistraction: (text: string, intention: string, durationSeconds?: number) => void;
  onLogCompletedSession: (focusMinutes: number) => void;
  // New props for journal integration
  onStartSessionLog?: (startTime: number, title?: string) => Promise<string | undefined | void>;
  onUpdateSessionLog?: (id: string | undefined | null, endTime: number) => Promise<void> | void;
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
  onStartFocusForTask,
  focusStartRequest,
  notes,
  onUpdateNotes,
  distractionLog,
  onLogDistraction,
  onLogCompletedSession,
  onStartSessionLog,
  onUpdateSessionLog
}) => {
  const [mode, setMode] = useState<'focus' | 'break' | 'longBreak'>('focus');
  const [isRunning, setIsRunning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(settings.focusMinutes * 60000);
  const [sessionDuration, setSessionDuration] = useState(settings.focusMinutes * 60000);
  const [completedInCycle, setCompletedInCycle] = useState(0);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [distractionInput, setDistractionInput] = useState('');
  const [focusFullscreen, setFocusFullscreen] = useState(false);
  const [showFsDistractionModal, setShowFsDistractionModal] = useState(false);
  const [fsDistractionInput, setFsDistractionInput] = useState('');

  const endTimeRef = useRef(0);
  const completionLockRef = useRef(false);
  const strictModePausedAtRef = useRef<number | null>(null);
  const [strictAlert, setStrictAlert] = useState<{ durationSeconds: number } | null>(null);
  // Track the active activity log id for the currently running focus segment
  const sessionLogIdRef = useRef<string | null>(null);

  const isRunningRef = useRef(isRunning);
  useEffect(() => { isRunningRef.current = isRunning; }, [isRunning]);

  const modeRef = useRef(mode);
  useEffect(() => { modeRef.current = mode; }, [mode]);

  const timeLeftRef = useRef(timeLeft);
  useEffect(() => { timeLeftRef.current = timeLeft; }, [timeLeft]);

  // Track the previous time so we can roll digits the correct way: down while the
  // countdown is decreasing, up when it jumps (reset / mode switch / start).
  const prevClockTimeRef = useRef(timeLeft);
  useEffect(() => { prevClockTimeRef.current = timeLeft; });

  // Open a journal segment (Work entry) for a running focus block. The entry starts
  // now and its endTime is updated to the real stop moment, so it always reflects
  // the actual time the focus timer was counting down — not the configured length.
  const openJournalSegment = useCallback(
    (title?: string) => {
      if (typeof onStartSessionLog !== 'function') return;
      Promise.resolve()
        .then(() => onStartSessionLog(Date.now(), title || intention || 'Focus Session'))
        .then((id) => {
          if (typeof id === 'string') sessionLogIdRef.current = id;
        })
        .catch(() => {});
    },
    [intention, onStartSessionLog]
  );

  // Close the active journal segment, stamping its endTime to now (actual elapsed time)
  const closeJournalSegment = useCallback(() => {
    if (sessionLogIdRef.current && typeof onUpdateSessionLog === 'function') {
      try {
        onUpdateSessionLog(sessionLogIdRef.current, Date.now());
      } catch (e) {
        // non-fatal
      }
      sessionLogIdRef.current = null;
    }
  }, [onUpdateSessionLog]);

  useEffect(() => {
    if (!settings.strictMode) return;

    const handleVisibilityChange = () => {
        if (document.hidden) {
        if (isRunningRef.current && modeRef.current === 'focus') {
          strictModePausedAtRef.current = Date.now();
          const remaining = Math.max(0, endTimeRef.current - Date.now());
          setTimeLeft(remaining);
          setIsRunning(false);

          // Pause the journal segment while the app is hidden
          closeJournalSegment();
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

          // Start a new activity log segment for resumed focus
          openJournalSegment();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [settings.strictMode, intention, onLogDistraction, openJournalSegment, closeJournalSegment]);

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
        // Auto-started focus blocks (e.g. Auto-start Focus setting) are journaled too
        if (nextMode === 'focus') openJournalSegment();
      } else if (isRunningRef.current) {
        // Manually switching modes while a segment is running ends that focus segment
        closeJournalSegment();
      }
    },
    [durationForMode, openJournalSegment, closeJournalSegment]
  );

  useEffect(() => {
    if (isRunning) return;
    const duration = durationForMode(mode);
    setSessionDuration(duration);
    setTimeLeft(duration);
  }, [settings, mode, isRunning, durationForMode]);

  // Auto-start a focus session when a task's "Start Focus" action is triggered (Task Queue / sidebar)
  const lastHandledStartTsRef = useRef<number | null>(null);
  useEffect(() => {
    if (!focusStartRequest || focusStartRequest.ts === lastHandledStartTsRef.current) return;
    lastHandledStartTsRef.current = focusStartRequest.ts;

    // Close any open journal segment before restarting with the new topic
    closeJournalSegment();

    const duration = durationForMode('focus');
    setMode('focus');
    setSessionDuration(duration);
    setTimeLeft(duration);
    completionLockRef.current = false;
    endTimeRef.current = Date.now() + duration;
    setIsRunning(true);

    // Start a journal entry for this focus segment (actual countdown time)
    openJournalSegment(`Task: ${focusStartRequest.topic}`);
  }, [focusStartRequest, openJournalSegment, closeJournalSegment, durationForMode]);

  const finishSession = useCallback(() => {
    if (completionLockRef.current) return;
    completionLockRef.current = true;
    setIsRunning(false);
    setTimeLeft(0);

    // Update the active activity log endTime to now
    closeJournalSegment();

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
    closeJournalSegment,
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
      // Restarting after completion — setTimerMode journals a new focus segment when in focus mode
      setTimerMode(mode, true);
      return;
    }
    if (isRunning) {
      setTimeLeft(Math.max(0, endTimeRef.current - Date.now()));
      setIsRunning(false);

      // close the active journal segment when pausing
      closeJournalSegment();
    } else {
      completionLockRef.current = false;
      endTimeRef.current = Date.now() + timeLeft;
      setIsRunning(true);

      // start a journal entry for this focus segment (only real focus blocks, not breaks)
      if (mode === 'focus') openJournalSegment();
    }
  }, [closeJournalSegment, isRunning, mode, openJournalSegment, setTimerMode, timeLeft]);

  const resetTimer = useCallback(() => {
    setIsRunning(false);
    completionLockRef.current = false;

    // If there is an active journal segment, close it on reset
    closeJournalSegment();

    const duration = durationForMode(mode);
    setSessionDuration(duration);
    setTimeLeft(duration);
  }, [closeJournalSegment, durationForMode, mode]);

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
        if (focusFullscreen) {
          setShowFsDistractionModal((prev) => !prev);
        } else {
          handleLogDistractionSubmit('Quick Distraction logged via key shortcut');
        }
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

  // Countdown digits should roll downward (decreasing); jumps roll upward.
  const clockDirection: 'up' | 'down' = timeLeft < prevClockTimeRef.current ? 'down' : 'up';

  if (focusFullscreen) {
    return (
      <div className="fixed inset-0 z-[9999] h-screen w-screen flex flex-col items-center justify-between bg-zinc-950 p-2 sm:p-4 md:p-6 text-zinc-100 select-none overflow-hidden animate-in fade-in zoom-in-95 duration-300">
        {/* Ambient Progress Fill */}
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 bg-zinc-900/50 transition-all duration-500 ease-linear"
          style={{ height: `${progress}%` }}
        />

        {/* Top Header */}
        <div className="relative z-20 flex w-full max-w-6xl items-center justify-between gap-1.5 sm:gap-2 shrink-0 py-0.5">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <span className="flex h-2 w-2 sm:h-2.5 sm:w-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-[0.15em] sm:tracking-[0.25em] text-zinc-400">
              {activeLabel}
            </span>
            <span className="text-[10px] sm:text-xs text-zinc-600 font-mono">({Math.round(progress)}%)</span>
          </div>

          <div className="flex rounded-full border border-zinc-800/80 bg-zinc-900/90 p-0.5 backdrop-blur-md">
            {[
              ['focus', 'Focus'],
              ['break', 'Break'],
              ['longBreak', 'Long Break']
            ].map(([mKey, label]) => (
              <button
                key={mKey}
                onClick={() => setTimerMode(mKey as 'focus' | 'break' | 'longBreak')}
                className={`rounded-full px-2 sm:px-4 py-0.5 sm:py-1 text-[10px] sm:text-xs font-medium transition ${
                  mode === mKey
                    ? 'bg-zinc-100 text-zinc-950 shadow-md'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <button
            id="exit-fullscreen-btn"
            onClick={toggleFullscreenMode}
            className="flex items-center gap-1 sm:gap-1.5 rounded-full border border-zinc-800 bg-zinc-900/80 px-2.5 sm:px-3.5 py-1 text-[10px] sm:text-xs font-medium text-zinc-300 transition hover:border-zinc-700 hover:bg-zinc-800 hover:text-white backdrop-blur-md shrink-0"
            title="Exit Fullscreen (ESC or F)"
          >
            <Minimize2 className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            <span className="hidden sm:inline">Exit</span>
            <kbd className="hidden sm:inline-block rounded bg-zinc-800 px-1 py-0.5 text-[9px] text-zinc-400 border border-zinc-700/60">ESC</kbd>
          </button>
        </div>

        {/* Strict Mode Alert Overlay */}
        {strictAlert && (
          <div className="relative z-30 animate-in slide-in-from-top-4 fade-in duration-300 my-0.5 shrink-0">
            <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 px-3 py-1 sm:py-1.5 rounded-xl backdrop-blur-md shadow-2xl flex items-center gap-2 text-[11px] sm:text-xs">
              <AlertTriangle className="h-3.5 w-3.5 text-rose-400 shrink-0" />
              <span className="font-medium">Strict Mode Triggered!</span>
              <span className="text-[9px] sm:text-[10px] bg-rose-950/60 px-1.5 py-0.2 rounded text-rose-300 border border-rose-900/50">
                {strictAlert.durationSeconds > 60 ? `${Math.round(strictAlert.durationSeconds / 60)}m` : `${strictAlert.durationSeconds}s`} recorded
              </span>
            </div>
          </div>
        )}

        {/* Main Center Section - Vertically Centered Clock with Controls BELOW the clock */}
        <div className="relative z-20 flex w-full max-w-3xl flex-1 min-h-0 flex-col items-center justify-center my-auto py-1">
          <div className="flex flex-col items-center justify-center w-full my-auto">
            
            {/* Session Intention Goal (Above Clock) */}
            <div className="px-2 max-w-md sm:max-w-xl text-center">
              {intention ? (
                <>
                  <p className="text-[8px] sm:text-[10px] font-medium uppercase tracking-[0.2em] text-zinc-500 mb-0.5">Session Goal</p>
                  <h2 className="text-xs sm:text-base md:text-lg font-light text-zinc-100 leading-snug line-clamp-1">
                    {intention}
                  </h2>
                </>
              ) : (
                <p className="text-[10px] sm:text-xs text-zinc-600 italic">No goal set for this session</p>
              )}
            </div>

            {/* Display Clock - Centered along Y axis, sized dynamically with clamp */}
            <div className="my-1 sm:my-2 font-extralight tracking-tighter tabular-nums text-zinc-100 font-mono text-[clamp(3.5rem,20vh,11rem)] leading-none drop-shadow-[0_10px_35px_rgba(0,0,0,0.8)] text-center">
              <RollingClock
                text={formatClock(timeLeft)}
                clockAnimation={settings.clockAnimation}
                direction={clockDirection}
                ariaLabel={`${activeLabel} time remaining: ${formatClock(timeLeft)}`}
              />
            </div>

            {/* Controls & Progress Column - Always Stacked BELOW the Clock */}
            <div className="flex flex-col items-center justify-center w-full max-w-xs sm:max-w-sm shrink-0 mt-1 sm:mt-2">
              {/* Minimal Progress Bar */}
              <div className="w-full h-1 sm:h-1.5 bg-zinc-900 rounded-full overflow-hidden my-1 border border-zinc-800/60">
                <div
                  className="h-full bg-zinc-200 transition-all duration-300 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>

              {/* Controls Below Clock */}
              <div className="flex items-center justify-center gap-2.5 sm:gap-4 my-1">
                <button
                  id="fs-timer-play-pause-btn"
                  onClick={toggleTimer}
                  className="flex h-11 w-11 sm:h-16 sm:w-16 items-center justify-center rounded-full bg-zinc-100 text-zinc-950 transition hover:scale-105 active:scale-95 hover:bg-white shadow-2xl shrink-0"
                  title="Start or Pause (Space)"
                >
                  {isRunning ? <Pause className="h-5 w-5 sm:h-7 sm:w-7" /> : <Play className="h-5 w-5 sm:h-7 sm:w-7 ml-0.5" />}
                </button>
                <button
                  id="fs-timer-reset-btn"
                  onClick={resetTimer}
                  className="flex h-9 w-9 sm:h-12 sm:w-12 items-center justify-center rounded-full border border-zinc-800 bg-zinc-900/90 text-zinc-300 transition hover:border-zinc-700 hover:text-white hover:bg-zinc-800 shrink-0"
                  title="Reset Session (R)"
                >
                  <RotateCcw className="h-3.5 w-3.5 sm:h-5 sm:w-5" />
                </button>
                <button
                  id="fs-timer-distraction-btn"
                  onClick={() => setShowFsDistractionModal((prev) => !prev)}
                  className={`flex h-9 sm:h-12 items-center gap-1.5 rounded-full border px-3 sm:px-5 text-xs font-medium transition backdrop-blur-md shrink-0 ${
                    showFsDistractionModal
                      ? 'border-amber-500 bg-amber-500/20 text-amber-200'
                      : 'border-amber-900/40 bg-amber-950/30 text-amber-300 hover:bg-amber-950/60'
                  }`}
                  title="Log Distraction (D)"
                >
                  <AlertTriangle className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Log Distraction</span>
                  <span className="sm:hidden">Log</span>
                </button>
              </div>
            </div>

          </div>
        </div>

        {/* Floating Modal for Distraction Log (Doesn't affect page layout or height) */}
        {showFsDistractionModal && (
          <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!fsDistractionInput.trim()) return;
                onLogDistraction(fsDistractionInput.trim(), intention || 'General Study');
                setFsDistractionInput('');
                setShowFsDistractionModal(false);
              }}
              className="flex w-full max-w-sm flex-col gap-3 rounded-2xl border border-amber-900/60 bg-zinc-900 p-4 shadow-2xl animate-in zoom-in-95 duration-200"
            >
              <div className="flex items-center gap-2 text-amber-400">
                <AlertTriangle className="h-4 w-4" />
                <h3 className="text-xs font-semibold text-zinc-100">Log Distraction</h3>
              </div>
              <input
                type="text"
                autoFocus
                value={fsDistractionInput}
                onChange={(e) => setFsDistractionInput(e.target.value)}
                placeholder="What distracted you? (Press Enter)"
                className="w-full rounded-xl bg-black/70 px-3 py-2 text-xs text-amber-100 placeholder-amber-500/50 outline-none border border-amber-900/40 focus:border-amber-500"
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowFsDistractionModal(false)}
                  className="rounded-xl px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-amber-500 px-3.5 py-1.5 text-xs font-semibold text-zinc-950 hover:bg-amber-400 transition"
                >
                  Log
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Bottom Shortcut Hints */}
        <div className="relative z-20 flex flex-wrap justify-center gap-1.5 sm:gap-3 text-[9px] sm:text-[11px] text-zinc-500 shrink-0 py-0.5">
          <span className="rounded-full border border-zinc-800/80 bg-zinc-900/60 px-2 py-0.5 sm:px-3 sm:py-1">Space: Play/Pause</span>
          <span className="rounded-full border border-zinc-800/80 bg-zinc-900/60 px-2 py-0.5 sm:px-3 sm:py-1">R: Reset</span>
          <span className="rounded-full border border-zinc-800/80 bg-zinc-900/60 px-2 py-0.5 sm:px-3 sm:py-1">D: Distraction</span>
          <span className="rounded-full border border-zinc-800/80 bg-zinc-900/60 px-2 py-0.5 sm:px-3 sm:py-1">ESC or F: Exit</span>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl animate-in fade-in zoom-in-95 duration-500">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,1fr)]">
        {/* Timer Canvas Panel */}
        <div className="relative flex flex-col items-center justify-center overflow-hidden min-h-[480px] rounded-3xl border border-zinc-800/80 bg-zinc-900/45 p-8 h-full backdrop-blur-sm">
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
              <RollingClock
                text={formatClock(timeLeft)}
                clockAnimation={settings.clockAnimation}
                direction={clockDirection}
                ariaLabel={`${activeLabel} time remaining: ${formatClock(timeLeft)}`}
              />
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
                    <div className="flex items-center shrink-0">
                      {!task.complete && onStartFocusForTask && (
                        <button
                          onClick={() => onStartFocusForTask(task.title)}
                          className="opacity-0 group-hover:opacity-100 focus:opacity-100 p-1 text-zinc-600 hover:text-emerald-400 transition"
                          title="Start focus timer with this topic"
                          aria-label={`Start focus timer with topic: ${task.title}`}
                        >
                          <Play className="h-3.5 w-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => onRemoveTask(task.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-zinc-600 hover:text-red-400"
                        aria-label={`Delete task: ${task.title}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
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
