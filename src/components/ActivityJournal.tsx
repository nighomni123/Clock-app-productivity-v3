import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence, PanInfo } from 'motion/react';
import { ActivityLog } from '../types';
import {
  Plus,
  Trash2,
  Clock,
  Calendar,
  X,
  Edit3,
  Check,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Timer,
  Play,
  Square,
  Flame
} from 'lucide-react';

interface ActivityJournalProps {
  logs: ActivityLog[];
  onAddLog: (log: Omit<ActivityLog, 'id' | 'userId' | 'createdAt'>) => void;
  onUpdateLog?: (id: string, updates: Partial<Omit<ActivityLog, 'id' | 'userId' | 'createdAt'>>) => void;
  onRemoveLog: (id: string) => void;
}

const CATEGORIES = ['Work', 'Exercise', 'Leisure', 'Errands', 'Social', 'Rest', 'Other'];

const CATEGORY_STYLES: Record<string, { dot: string; chip: string; seg: string }> = {
  Work: { dot: 'bg-indigo-400', chip: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30', seg: 'bg-indigo-500/70' },
  Exercise: { dot: 'bg-emerald-400', chip: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30', seg: 'bg-emerald-500/70' },
  Leisure: { dot: 'bg-purple-400', chip: 'bg-purple-500/15 text-purple-300 border-purple-500/30', seg: 'bg-purple-500/70' },
  Errands: { dot: 'bg-amber-400', chip: 'bg-amber-500/15 text-amber-300 border-amber-500/30', seg: 'bg-amber-500/70' },
  Social: { dot: 'bg-rose-400', chip: 'bg-rose-500/15 text-rose-300 border-rose-500/30', seg: 'bg-rose-500/70' },
  Rest: { dot: 'bg-teal-400', chip: 'bg-teal-500/15 text-teal-300 border-teal-500/30', seg: 'bg-teal-500/70' },
  Other: { dot: 'bg-zinc-400', chip: 'bg-zinc-500/15 text-zinc-300 border-zinc-500/30', seg: 'bg-zinc-500/70' }
};

const QUICK_DURATIONS = [
  { label: '30m', minutes: 30 },
  { label: '1h', minutes: 60 },
  { label: '2h', minutes: 120 },
  { label: '3h', minutes: 180 }
];

const dayKey = (ts: number): string => {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const formatTime = (timestamp: number): string =>
  new Date(timestamp).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

const formatDuration = (minutes: number): string => {
  if (minutes < 1) return '<1m';
  if (minutes < 60) return `${Math.round(minutes)}m`;
  const hrs = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
};

export const ActivityJournal: React.FC<ActivityJournalProps> = ({ logs, onAddLog, onUpdateLog, onRemoveLog }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('Work');
  const [title, setTitle] = useState<string>('');
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [editingLog, setEditingLog] = useState<ActivityLog | null>(null);
  const [manualStartTime, setManualStartTime] = useState('');
  const [manualEndTime, setManualEndTime] = useState('');
  const [manualTitle, setManualTitle] = useState('');
  const [manualCategory, setManualCategory] = useState('Work');
  const [manualRating, setManualRating] = useState(3);
  const [swipedId, setSwipedId] = useState<string | null>(null);

  // Live timer state
  const [running, setRunning] = useState<{ id: string; startTime: number; category: string; title: string } | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [selectedDayOffset, setSelectedDayOffset] = useState(0);

  // Build the day strip (today + previous 6 days)
  const dayStrips = useMemo(() => {
    const days = [];
    const base = new Date();
    base.setHours(0, 0, 0, 0);
    for (let i = 6; i >= 0; i--) {
      const d = new Date(base);
      d.setDate(base.getDate() - i);
      days.push(d);
    }
    return days;
  }, []);

  const selectedDate = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - selectedDayOffset);
    return d;
  }, [selectedDayOffset]);

  const selectedKey = dayKey(selectedDate.getTime());

  // Group logs by day
  const logsByDay = useMemo(() => {
    const map: Record<string, ActivityLog[]> = {};
    for (const log of logs) {
      const k = dayKey(log.startTime);
      (map[k] ||= []).push(log);
    }
    for (const k in map) map[k].sort((a, b) => a.startTime - b.startTime);
    return map;
  }, [logs]);

  const dayLogs = logsByDay[selectedKey] || [];

  const totalMinutes = dayLogs.reduce((sum, log) => sum + Math.max(0, (log.endTime - log.startTime) / 60000), 0);

  // 24h timeline segments for the selected day
  const segments = useMemo(() => {
    const startOfDay = selectedDate.getTime();
    const endOfDay = startOfDay + 24 * 60 * 60 * 1000;
    return dayLogs
      .map((log) => {
        const s = Math.max(log.startTime, startOfDay);
        const e = Math.min(log.endTime, endOfDay);
        if (e <= s) return null;
        return {
          left: ((s - startOfDay) / (24 * 60 * 60 * 1000)) * 100,
          width: ((e - s) / (24 * 60 * 60 * 1000)) * 100,
          category: log.category,
          title: log.title
        };
      })
      .filter(Boolean) as { left: number; width: number; category: string; title: string }[];
  }, [dayLogs, selectedDate]);

  // Live elapsed ticker
  useEffect(() => {
    if (!running) return;
    const tick = () => setElapsed(Math.floor((Date.now() - running.startTime) / 1000));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [running]);

  const startLive = () => {
    const id = Math.random().toString(36).substring(2, 10);
    const cat = selectedCategory;
    const ttl = title || cat;
    setRunning({ id, startTime: Date.now(), category: cat, title: ttl });
    setElapsed(0);
    setTitle('');
    if (navigator.vibrate) navigator.vibrate(10);
  };

  const stopLive = () => {
    if (!running) return;
    const endTime = Date.now();
    const start = running.startTime;
    if (endTime - start > 1000) {
      onAddLog({
        title: running.title,
        category: running.category,
        startTime: start,
        endTime,
        rating: 3,
        notes: ''
      });
    }
    setRunning(null);
    setElapsed(0);
    if (navigator.vibrate) navigator.vibrate(10);
  };

  const handleQuickAdd = (durationMinutes: number) => {
    const now = Date.now();
    onAddLog({
      title: title || selectedCategory,
      category: selectedCategory,
      startTime: now,
      endTime: now + durationMinutes * 60000,
      rating: 3,
      notes: ''
    });
    setTitle('');
    if (navigator.vibrate) navigator.vibrate(10);
  };

  const handleManualAdd = () => {
    if (!manualStartTime || !manualEndTime) return;
    const [sh, sm] = manualStartTime.split(':').map(Number);
    const [eh, em] = manualEndTime.split(':').map(Number);
    const startTime = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), sh, sm).getTime();
    const endTime = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), eh, em).getTime();
    if (endTime <= startTime) {
      alert('End time must be after start time');
      return;
    }
    onAddLog({
      title: manualTitle || manualCategory,
      category: manualCategory,
      startTime,
      endTime,
      rating: manualRating,
      notes: ''
    });
    setShowManualEntry(false);
    setManualStartTime('');
    setManualEndTime('');
    setManualTitle('');
    setManualCategory('Work');
    setManualRating(3);
  };

  const handleEdit = (log: ActivityLog) => {
    setEditingLog(log);
    const s = new Date(log.startTime);
    const e = new Date(log.endTime);
    setManualStartTime(`${String(s.getHours()).padStart(2, '0')}:${String(s.getMinutes()).padStart(2, '0')}`);
    setManualEndTime(`${String(e.getHours()).padStart(2, '0')}:${String(e.getMinutes()).padStart(2, '0')}`);
    setManualTitle(log.title);
    setManualCategory(log.category);
    setManualRating(log.rating);
  };

  const handleUpdate = () => {
    if (!editingLog || !manualStartTime || !manualEndTime) return;
    const [sh, sm] = manualStartTime.split(':').map(Number);
    const [eh, em] = manualEndTime.split(':').map(Number);
    const startTime = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), sh, sm).getTime();
    const endTime = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), eh, em).getTime();
    if (endTime <= startTime) {
      alert('End time must be after start time');
      return;
    }
    if (onUpdateLog) {
      onUpdateLog(editingLog.id, {
        title: manualTitle || manualCategory,
        category: manualCategory,
        startTime,
        endTime,
        rating: manualRating,
        notes: ''
      });
    }
    setEditingLog(null);
    setManualStartTime('');
    setManualEndTime('');
    setManualTitle('');
    setManualCategory('Work');
    setManualRating(3);
  };

  const handleSwipe = (_e: MouseEvent | TouchEvent | PointerEvent, info: PanInfo, logId: string) => {
    if (info.offset.x < -100) {
      onRemoveLog(logId);
      setSwipedId(null);
    } else {
      setSwipedId(null);
    }
  };

  const isToday = selectedDayOffset === 0;
  const elapsedMin = Math.floor(elapsed / 60);

  return (
    <div className="w-full grid grid-cols-1 xl:grid-cols-3 gap-5">
      {/* Left: quick add + day timeline */}
      <div className="xl:col-span-1 space-y-5">
        {/* Live timer / quick entry */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="glass card-shadow rounded-3xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Timer className="w-4 h-4 text-indigo-400" /> Quick Log
            </h3>
            <motion.button whileTap={{ scale: 0.95 }} onClick={() => setShowManualEntry(true)} className="text-xs text-zinc-400 hover:text-zinc-200 flex items-center gap-1">
              <Edit3 size={13} /> Manual
            </motion.button>
          </div>

          {/* Live timer */}
          <AnimatePresence mode="wait">
            {running ? (
              <motion.div key="running" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-zinc-400 truncate flex-1">{running.title}</span>
                  <span className={`text-xs font-medium ${CATEGORY_STYLES[running.category]?.chip || 'bg-zinc-500/15 text-zinc-300'}`}>{running.category}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-3xl font-thin text-white tabular-nums">{String(Math.floor(elapsed / 60)).padStart(2, '0')}:{String(elapsed % 60).padStart(2, '0')}</div>
                  <motion.button whileTap={{ scale: 0.9 }} onClick={stopLive} className="ml-auto flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 transition-colors text-sm font-medium">
                    <Square size={14} className="fill-current" /> Stop & Save
                  </motion.button>
                </div>
                <div className="mt-2 h-1 rounded-full bg-white/10 overflow-hidden">
                  <motion.div className="h-full bg-indigo-400" animate={{ width: `${(elapsed % 3600) / 36}%` }} transition={{ duration: 0.4, ease: 'linear' }} />
                </div>
              </motion.div>
            ) : (
              <motion.button key="start" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} whileTap={{ scale: 0.97 }} onClick={startLive} className="w-full mb-4 flex items-center justify-center gap-2 py-3 rounded-xl bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30 transition-colors text-sm font-medium">
                <Play size={15} className="fill-current" /> Start Now
              </motion.button>
            )}
          </AnimatePresence>

          {/* Title */}
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What are you doing? (optional)"
            className="w-full bg-white/5 border border-white/5 rounded-xl px-3 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition-all mb-3"
          />

          {/* Category picker */}
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1 mb-3">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                  selectedCategory === cat ? `${CATEGORY_STYLES[cat].chip} border` : 'bg-white/5 text-zinc-500 hover:text-zinc-300 border border-transparent'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${CATEGORY_STYLES[cat].dot}`} />
                {cat}
              </button>
            ))}
          </div>

          {/* Quick durations */}
          <div className="grid grid-cols-4 gap-2">
            {QUICK_DURATIONS.map(({ label, minutes }) => (
              <motion.button
                key={label}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleQuickAdd(minutes)}
                className="py-2.5 bg-white/5 border border-white/5 rounded-xl text-zinc-200 text-sm font-semibold hover:bg-white/10 transition-all"
              >
                +{label}
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* Day-at-a-glance timeline */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="glass card-shadow rounded-3xl p-5">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-3">
            <Clock className="w-4 h-4 text-emerald-400" /> Day at a Glance
          </h3>
          <div className="relative h-10 rounded-xl bg-white/5 overflow-hidden border border-white/5">
            {segments.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center text-xs text-zinc-600">No time logged</div>
            )}
            {segments.map((seg, i) => (
              <div
                key={i}
                title={`${seg.title} (${seg.category})`}
                className={`absolute top-0 bottom-0 ${CATEGORY_STYLES[seg.category]?.seg || 'bg-zinc-500/70'}`}
                style={{ left: `${seg.left}%`, width: `${Math.max(seg.width, 0.6)}%` }}
              />
            ))}
          </div>
          <div className="flex justify-between text-[10px] text-zinc-600 mt-1.5 px-0.5">
            <span>12a</span><span>6a</span><span>12p</span><span>6p</span><span>12a</span>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <span className="text-xs text-zinc-500">Total logged</span>
            <span className="text-sm font-semibold text-white tabular-nums">{formatDuration(totalMinutes)}</span>
          </div>
          <div className="mt-1 flex items-center justify-between">
            <span className="text-xs text-zinc-500">Entries</span>
            <span className="text-sm font-semibold text-white tabular-nums">{dayLogs.length}</span>
          </div>
        </motion.div>
      </div>

      {/* Right: day strip + entries */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="xl:col-span-2">
        {/* Day strip */}
        <div className="flex items-center gap-2 mb-5">
          <button
            onClick={() => setSelectedDayOffset((o) => Math.min(6, o + 1))}
            disabled={selectedDayOffset >= 6}
            className="p-2 rounded-xl glass hover:bg-white/10 disabled:opacity-30 transition-colors"
            aria-label="Previous day"
          >
            <ChevronLeft className="w-4 h-4 text-zinc-300" />
          </button>
          <div className="flex-1 flex gap-2 overflow-x-auto no-scrollbar">
            {dayStrips.map((d, idx) => {
              const offset = 6 - idx;
              const k = dayKey(d.getTime());
              const count = (logsByDay[k] || []).length;
              const isSel = offset === selectedDayOffset;
              const isTodayStrip = idx === 6;
              return (
                <button
                  key={k}
                  onClick={() => setSelectedDayOffset(offset)}
                  className={`flex flex-col items-center justify-center w-14 py-2 rounded-xl border transition-all ${
                    isSel ? 'bg-white/10 border-white/20' : 'bg-white/5 border-transparent hover:bg-white/10'
                  }`}
                >
                  <span className={`text-[10px] uppercase ${isSel ? 'text-indigo-300' : 'text-zinc-500'}`}>
                    {isTodayStrip ? 'Today' : d.toLocaleDateString('en-US', { weekday: 'short' })}
                  </span>
                  <span className={`text-base font-semibold ${isSel ? 'text-white' : 'text-zinc-300'}`}>{d.getDate()}</span>
                  <span className={`mt-0.5 w-1.5 h-1.5 rounded-full ${count > 0 ? 'bg-emerald-400' : 'bg-zinc-700'}`} />
                </button>
              );
            })}
          </div>
          <button
            onClick={() => setSelectedDayOffset((o) => Math.max(0, o - 1))}
            disabled={selectedDayOffset <= 0}
            className="p-2 rounded-xl glass hover:bg-white/10 disabled:opacity-30 transition-colors"
            aria-label="Next day"
          >
            <ChevronRight className="w-4 h-4 text-zinc-300" />
          </button>
        </div>

        {/* Day header */}
        <div className="flex items-baseline justify-between mb-4">
          <h2 className="text-xl font-semibold text-white">
            {isToday ? 'Today' : selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </h2>
          {elapsedMin > 0 && running && (
            <span className="text-xs text-indigo-300 flex items-center gap-1"><Flame size={13} /> recording {formatDuration(elapsedMin)}</span>
          )}
        </div>

        {/* Entries list */}
        <div className="space-y-2">
          <AnimatePresence mode="popLayout">
            {dayLogs.length === 0 ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                className="glass rounded-2xl p-10 text-center"
              >
                <div className="w-14 h-14 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Sparkles className="text-zinc-600" size={24} />
                </div>
                <p className="text-zinc-400 text-sm">Nothing logged {isToday ? 'today' : 'this day'}</p>
                <p className="text-zinc-600 text-xs mt-1">Tap “Start Now” or a quick-add button to begin.</p>
              </motion.div>
            ) : (
              dayLogs.map((log) => {
                const duration = Math.max(0, (log.endTime - log.startTime) / 60000);
                const isSwiped = swipedId === log.id;
                const style = CATEGORY_STYLES[log.category] || CATEGORY_STYLES.Other;
                return (
                  <motion.div key={log.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -100 }} className="relative overflow-hidden rounded-2xl">
                    <div className="absolute inset-0 flex items-center justify-end px-4 bg-rose-600/90">
                      <Trash2 size={20} className="text-white" />
                    </div>
                    <motion.div
                      drag="x"
                      dragConstraints={{ left: 0, right: 0 }}
                      dragElastic={0.2}
                      onDragEnd={(e, info) => handleSwipe(e, info, log.id)}
                      animate={{ x: isSwiped ? -80 : 0 }}
                      onClick={() => handleEdit(log)}
                      className="relative glass cursor-pointer p-4 flex items-center gap-3"
                    >
                      <span className={`w-2.5 h-2.5 rounded-full ${style.dot} shrink-0`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className={`text-[11px] px-2 py-0.5 rounded-full border ${style.chip}`}>{log.category}</span>
                          <span className="text-xs text-zinc-500">{formatTime(log.startTime)} – {formatTime(log.endTime)}</span>
                        </div>
                        <h3 className="text-sm font-medium text-zinc-100 truncate">{log.title}</h3>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-sm font-semibold text-white tabular-nums">{formatDuration(duration)}</div>
                        <div className="flex items-center gap-0.5 justify-end mt-0.5">
                          {Array.from({ length: log.rating }).map((_, i) => (
                            <span key={i} className="w-1 h-1 rounded-full bg-amber-400" />
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  </motion.div>
                );
              })
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Manual / Edit bottom sheet */}
      <AnimatePresence>
        {(showManualEntry || editingLog) && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { setShowManualEntry(false); setEditingLog(null); }}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 glass z-50 max-h-[85vh] overflow-y-auto rounded-t-3xl"
            >
              <div className="flex justify-center py-3">
                <div className="w-12 h-1.5 bg-white/20 rounded-full" />
              </div>
              <div className="px-6 pb-8">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-semibold text-white">{editingLog ? 'Edit Activity' : 'Manual Entry'}</h3>
                  <motion.button whileTap={{ scale: 0.9 }} onClick={() => { setShowManualEntry(false); setEditingLog(null); }} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                    <X size={20} className="text-zinc-400" />
                  </motion.button>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div>
                    <label className="text-xs text-zinc-500 uppercase tracking-wide mb-2 block">Start Time</label>
                    <input type="time" value={manualStartTime} onChange={(e) => setManualStartTime(e.target.value)} className="w-full bg-white/5 border border-white/5 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/40" />
                  </div>
                  <div>
                    <label className="text-xs text-zinc-500 uppercase tracking-wide mb-2 block">End Time</label>
                    <input type="time" value={manualEndTime} onChange={(e) => setManualEndTime(e.target.value)} className="w-full bg-white/5 border border-white/5 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/40" />
                  </div>
                </div>

                <div className="mb-4">
                  <label className="text-xs text-zinc-500 uppercase tracking-wide mb-2 block">Title</label>
                  <input type="text" value={manualTitle} onChange={(e) => setManualTitle(e.target.value)} placeholder="What did you do?" className="w-full bg-white/5 border border-white/5 rounded-xl px-3 py-2.5 text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/40" />
                </div>

                <div className="mb-4">
                  <label className="text-xs text-zinc-500 uppercase tracking-wide mb-2 block">Category</label>
                  <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
                    {CATEGORIES.map((cat) => (
                      <button key={cat} onClick={() => setManualCategory(cat)} className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all border ${
                        manualCategory === cat ? `${CATEGORY_STYLES[cat].chip} border` : 'bg-white/5 text-zinc-500 border-transparent hover:text-zinc-300'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${CATEGORY_STYLES[cat].dot}`} />{cat}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mb-6">
                  <label className="text-xs text-zinc-500 uppercase tracking-wide mb-2 block">Rating</label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <motion.button key={star} whileTap={{ scale: 0.9 }} onClick={() => setManualRating(star)} className={`w-12 h-12 rounded-xl border-2 transition-all ${
                        star <= manualRating ? 'bg-amber-500 border-amber-400 text-white' : 'bg-white/5 border-white/5 text-zinc-600'
                      }`}>{star}</motion.button>
                    ))}
                  </div>
                </div>

                <motion.button whileTap={{ scale: 0.98 }} onClick={editingLog ? handleUpdate : handleManualAdd} className="w-full py-3.5 bg-emerald-500/90 hover:bg-emerald-500 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2">
                  <Check size={20} /><span>{editingLog ? 'Update Activity' : 'Add Activity'}</span>
                </motion.button>

                {editingLog && (
                  <motion.button whileTap={{ scale: 0.98 }} onClick={() => { onRemoveLog(editingLog.id); setEditingLog(null); }} className="w-full mt-3 py-3.5 bg-rose-500/15 border border-rose-500/30 hover:bg-rose-500/25 text-rose-300 font-semibold rounded-xl transition-colors flex items-center justify-center gap-2">
                    <Trash2 size={20} /><span>Delete Activity</span>
                  </motion.button>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
