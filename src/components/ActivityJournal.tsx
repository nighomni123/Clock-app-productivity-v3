import React, { useState, useEffect, useRef } from 'react';
import { ActivityLog } from '../types';
import {
  Activity,
  Plus,
  Trash2,
  Download,
  Star,
  ChevronLeft,
  ChevronRight,
  X,
  Clock,
  Calendar as CalendarIcon,
  AlertCircle,
  Sparkles
} from 'lucide-react';
import { TimePickerInput } from './TimePickerInput';

interface ActivityJournalProps {
  logs: ActivityLog[];
  onAddLog: (log: Omit<ActivityLog, 'id' | 'userId' | 'createdAt'>) => void;
  onRemoveLog: (id: string) => void;
}

const CATEGORIES = ['Work', 'Exercise', 'Leisure', 'Errands', 'Social', 'Rest', 'Other'];

const CATEGORY_STYLES: Record<string, { bg: string; border: string; text: string; badge: string }> = {
  Work: { bg: 'bg-indigo-950/80', border: 'border-indigo-500/50', text: 'text-indigo-200', badge: 'bg-indigo-900/60 text-indigo-300' },
  Exercise: { bg: 'bg-emerald-950/80', border: 'border-emerald-500/50', text: 'text-emerald-200', badge: 'bg-emerald-900/60 text-emerald-300' },
  Leisure: { bg: 'bg-purple-950/80', border: 'border-purple-500/50', text: 'text-purple-200', badge: 'bg-purple-900/60 text-purple-300' },
  Errands: { bg: 'bg-amber-950/80', border: 'border-amber-500/50', text: 'text-amber-200', badge: 'bg-amber-900/60 text-amber-300' },
  Social: { bg: 'bg-rose-950/80', border: 'border-rose-500/50', text: 'text-rose-200', badge: 'bg-rose-900/60 text-rose-300' },
  Rest: { bg: 'bg-teal-950/80', border: 'border-teal-500/50', text: 'text-teal-200', badge: 'bg-teal-900/60 text-teal-300' },
  Other: { bg: 'bg-zinc-900/90', border: 'border-zinc-700/60', text: 'text-zinc-200', badge: 'bg-zinc-800 text-zinc-300' }
};

export const ActivityJournal: React.FC<ActivityJournalProps> = ({ logs, onAddLog, onRemoveLog }) => {
  // Start date for the 7-day view (defaults to Today at 00:00:00)
  const [startOfWeek, setStartOfWeek] = useState<Date>(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });

  // Scroll container ref for auto-scrolling
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Dialog / Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalDate, setModalDate] = useState<Date>(new Date());
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Work');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [rating, setRating] = useState(3);
  const [notes, setNotes] = useState('');

  // View existing log modal
  const [selectedLog, setSelectedLog] = useState<ActivityLog | null>(null);

  // Auto-scroll to (current hour - 1) on mount or when reset to today
  const scrollToCurrentTimeMinus1Hour = () => {
    if (scrollContainerRef.current) {
      const currentHour = new Date().getHours();
      const targetHour = Math.max(0, currentHour - 1);
      // 1 hour = 60px height
      scrollContainerRef.current.scrollTop = targetHour * 60;
    }
  };

  useEffect(() => {
    // Initial auto-scroll
    const timer = setTimeout(scrollToCurrentTimeMinus1Hour, 100);
    return () => clearTimeout(timer);
  }, [startOfWeek]);

  // Generate 7 consecutive days starting from startOfWeek
  const days: Date[] = Array.from({ length: 7 }, (_, i) => {
    const day = new Date(startOfWeek);
    day.setDate(day.getDate() + i);
    return day;
  });

  // Navigate weeks
  const handlePrevWeek = () => {
    const prev = new Date(startOfWeek);
    prev.setDate(prev.getDate() - 7);
    setStartOfWeek(prev);
  };

  const handleNextWeek = () => {
    const next = new Date(startOfWeek);
    next.setDate(next.getDate() + 7);
    setStartOfWeek(next);
  };

  const handleResetToday = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    setStartOfWeek(today);
  };

  // Open modal for a specific day and time slot
  const handleOpenModal = (dayDate: Date, hour: number, minute: number) => {
    const startH = String(hour).padStart(2, '0');
    const startM = String(minute).padStart(2, '0');

    let endHour = hour;
    let endMinute = minute + 30;
    if (endMinute >= 60) {
      endMinute -= 60;
      endHour = (endHour + 1) % 24;
    }
    const endH = String(endHour).padStart(2, '0');
    const endM = String(endMinute).padStart(2, '0');

    setModalDate(dayDate);
    setStartTime(`${startH}:${startM}`);
    setEndTime(`${endH}:${endM}`);
    setTitle('');
    setCategory('Work');
    setRating(3);
    setNotes('');
    setIsModalOpen(true);
  };

  const handleSaveLog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !startTime || !endTime) return;

    const [sH, sM] = startTime.split(':').map(Number);
    const [eH, eM] = endTime.split(':').map(Number);

    const startObj = new Date(
      modalDate.getFullYear(),
      modalDate.getMonth(),
      modalDate.getDate(),
      sH,
      sM
    );

    let endObj = new Date(
      modalDate.getFullYear(),
      modalDate.getMonth(),
      modalDate.getDate(),
      eH,
      eM
    );

    if (endObj.getTime() <= startObj.getTime()) {
      endObj = new Date(endObj.getTime() + 24 * 60 * 60 * 1000);
    }

    onAddLog({
      title,
      category,
      startTime: startObj.getTime(),
      endTime: endObj.getTime(),
      rating,
      notes
    });

    setIsModalOpen(false);
  };

  const handleExport = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(logs, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute('href', dataStr);
    downloadAnchorNode.setAttribute('download', 'activity_journal_export.json');
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const renderStars = (val: number) => {
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((s) => (
          <Star
            key={s}
            className={`h-3.5 w-3.5 ${s <= val ? 'fill-amber-400 text-amber-400' : 'text-zinc-600'}`}
          />
        ))}
      </div>
    );
  };

  // Helper to check if date is today
  const isToday = (d: Date) => {
    const today = new Date();
    return (
      d.getDate() === today.getDate() &&
      d.getMonth() === today.getMonth() &&
      d.getFullYear() === today.getFullYear()
    );
  };

  // Filter logs for a specific day
  const getLogsForDay = (day: Date) => {
    const startOfDay = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 0, 0, 0, 0).getTime();
    const endOfDay = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 23, 59, 59, 999).getTime();

    return logs.filter((log) => log.startTime >= startOfDay && log.startTime <= endOfDay);
  };

  // Calculate analytics
  const totalLoggedMinutes = logs.reduce((acc, l) => acc + (l.endTime - l.startTime) / 60000, 0);
  const avgRating = logs.length > 0 ? (logs.reduce((acc, l) => acc + l.rating, 0) / logs.length).toFixed(1) : '0.0';

  return (
    <div className="mx-auto max-w-7xl space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Top Header & Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
        <div>
          <h1 className="text-2xl font-light tracking-tight text-white flex items-center gap-2.5">
            <Activity className="h-6 w-6 text-emerald-400" />
            Activity Journal & Weekly Calendar
          </h1>
          <p className="text-zinc-400 text-xs mt-1">
            Weekly view of your daily routines, energy scores, and activity gaps. Click any time slot to log.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Navigation Controls */}
          <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 rounded-xl p-1">
            <button
              onClick={handlePrevWeek}
              className="p-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-lg transition"
              title="Previous 7 Days"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={handleResetToday}
              className="px-3 py-1 text-xs font-medium text-emerald-400 hover:bg-emerald-950/40 rounded-lg transition"
            >
              Today
            </button>
            <button
              onClick={handleNextWeek}
              className="p-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-lg transition"
              title="Next 7 Days"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Quick Action Buttons */}
          <button
            onClick={() => handleOpenModal(new Date(), new Date().getHours(), Math.floor(new Date().getMinutes() / 30) * 30)}
            className="flex items-center gap-1.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-2 text-xs font-medium hover:bg-emerald-500/20 transition"
          >
            <Plus className="h-4 w-4" />
            Log Activity
          </button>

          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 rounded-xl bg-zinc-900 text-zinc-300 border border-zinc-800 px-3 py-2 text-xs font-medium hover:bg-zinc-800 transition"
          >
            <Download className="h-4 w-4" />
            Export
          </button>
        </div>
      </div>

      {/* Analytics Summary Pills */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/50 p-3.5 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-950/50 text-emerald-400 border border-emerald-900/50">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <span className="text-xs text-zinc-400 block">Total Hours</span>
            <span className="text-lg font-semibold text-zinc-100">
              {Math.floor(totalLoggedMinutes / 60)}h {Math.round(totalLoggedMinutes % 60)}m
            </span>
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/50 p-3.5 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-950/50 text-amber-400 border border-amber-900/50">
            <Star className="h-5 w-5 fill-amber-400/20" />
          </div>
          <div>
            <span className="text-xs text-zinc-400 block">Avg Rating</span>
            <span className="text-lg font-semibold text-zinc-100">{avgRating} / 5.0</span>
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/50 p-3.5 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-950/50 text-indigo-400 border border-indigo-900/50">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <span className="text-xs text-zinc-400 block">Logged Entries</span>
            <span className="text-lg font-semibold text-zinc-100">{logs.length}</span>
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/50 p-3.5 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-purple-950/50 text-purple-400 border border-purple-900/50">
            <CalendarIcon className="h-5 w-5" />
          </div>
          <div>
            <span className="text-xs text-zinc-400 block">Active Days</span>
            <span className="text-lg font-semibold text-zinc-100">
              {new Set(logs.map(l => new Date(l.startTime).toDateString())).size} days
            </span>
          </div>
        </div>
      </div>

      {/* Main Weekly Calendar Grid Container */}
      <div className="rounded-3xl border border-zinc-800/80 bg-zinc-950 overflow-hidden shadow-2xl flex flex-col">
        
        {/* Sticky Calendar Days Header */}
        <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-zinc-800/80 bg-zinc-900/90 backdrop-blur-md z-20 sticky top-0">
          <div className="p-3 border-r border-zinc-800/60 flex items-center justify-center text-[10px] uppercase tracking-wider text-zinc-500 font-mono">
            GMT
          </div>

          {days.map((d, index) => {
            const dayLogs = getLogsForDay(d);
            const hasGap = dayLogs.length === 0;
            const today = isToday(d);

            return (
              <div
                key={d.toISOString()}
                className={`p-3 text-center border-r border-zinc-800/60 relative ${
                  today ? 'bg-emerald-950/20' : ''
                }`}
              >
                <div className="flex items-center justify-center gap-1.5 mb-0.5">
                  <span className={`text-xs font-medium ${today ? 'text-emerald-400 font-bold' : 'text-zinc-400'}`}>
                    {d.toLocaleDateString([], { weekday: 'short' })}
                  </span>
                  {today && (
                    <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.2 rounded border border-emerald-500/30 uppercase tracking-wider">
                      Today
                    </span>
                  )}
                </div>

                <div className="text-sm font-semibold text-zinc-200">
                  {d.toLocaleDateString([], { month: 'short', day: 'numeric' })}
                </div>

                {/* Gap Indicator or Entry Count */}
                {hasGap ? (
                  <span className="inline-flex items-center gap-1 text-[10px] text-amber-400/90 bg-amber-950/40 border border-amber-900/50 px-1.5 py-0.5 rounded-full mt-1">
                    <AlertCircle className="h-2.5 w-2.5" /> Gap (No logs)
                  </span>
                ) : (
                  <span className="inline-block text-[10px] text-zinc-400 bg-zinc-800/80 px-1.5 py-0.5 rounded-full mt-1">
                    {dayLogs.length} {dayLogs.length === 1 ? 'entry' : 'entries'}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Scrollable Time Timeline Grid (1 hour = 60px height) */}
        <div
          ref={scrollContainerRef}
          className="overflow-y-auto max-h-[650px] relative divide-y divide-zinc-900/80 select-none [color-scheme:dark]"
        >
          <div className="grid grid-cols-[60px_repeat(7,1fr)] relative min-h-[1440px]">
            
            {/* Time labels column */}
            <div className="border-r border-zinc-800/60 bg-zinc-950/80 relative text-zinc-500 text-[11px] font-mono">
              {Array.from({ length: 24 }).map((_, h) => (
                <div
                  key={h}
                  style={{ top: `${h * 60}px` }}
                  className="absolute left-0 right-0 h-[60px] border-b border-zinc-900/50 pr-2 pt-1 text-right"
                >
                  {String(h).padStart(2, '0')}:00
                </div>
              ))}
            </div>

            {/* 7 Day Columns */}
            {days.map((dayDate, dayIdx) => {
              const dayLogs = getLogsForDay(dayDate);
              const today = isToday(dayDate);

              return (
                <div
                  key={dayDate.toISOString()}
                  className={`relative border-r border-zinc-800/40 min-h-[1440px] ${
                    today ? 'bg-emerald-950/5' : ''
                  }`}
                >
                  {/* Grid Lines for 24 Hours & 30 Min slots */}
                  {Array.from({ length: 24 }).map((_, h) => (
                    <React.Fragment key={h}>
                      {/* 00 min slot hitbox */}
                      <div
                        onClick={() => handleOpenModal(dayDate, h, 0)}
                        style={{ top: `${h * 60}px`, height: '30px' }}
                        className="absolute left-0 right-0 border-b border-zinc-900/40 hover:bg-emerald-500/10 cursor-pointer transition-colors group flex items-center justify-center"
                      >
                        <span className="opacity-0 group-hover:opacity-100 text-[10px] text-emerald-400/90 bg-black/80 px-1.5 py-0.5 rounded border border-emerald-500/30">
                          + {String(h).padStart(2, '0')}:00
                        </span>
                      </div>

                      {/* 30 min slot hitbox */}
                      <div
                        onClick={() => handleOpenModal(dayDate, h, 30)}
                        style={{ top: `${h * 60 + 30}px`, height: '30px' }}
                        className="absolute left-0 right-0 border-b border-zinc-900/80 hover:bg-emerald-500/10 cursor-pointer transition-colors group flex items-center justify-center border-dashed"
                      >
                        <span className="opacity-0 group-hover:opacity-100 text-[10px] text-emerald-400/90 bg-black/80 px-1.5 py-0.5 rounded border border-emerald-500/30">
                          + {String(h).padStart(2, '0')}:30
                        </span>
                      </div>
                    </React.Fragment>
                  ))}

                  {/* Empty Day Background Gap Banner */}
                  {dayLogs.length === 0 && (
                    <div className="absolute inset-x-2 top-24 bottom-24 rounded-2xl border border-dashed border-zinc-800/60 bg-zinc-950/40 pointer-events-none flex flex-col items-center justify-center p-4 text-center">
                      <AlertCircle className="h-5 w-5 text-zinc-600 mb-1.5" />
                      <span className="text-xs text-zinc-500 font-medium">Gap Day</span>
                      <span className="text-[10px] text-zinc-600 mt-1">No activities logged</span>
                    </div>
                  )}

                  {/* Activity Log Blocks */}
                  {dayLogs.map((log) => {
                    const startObj = new Date(log.startTime);
                    const endObj = new Date(log.endTime);

                    const startMin = startObj.getHours() * 60 + startObj.getMinutes();
                    const endMin = endObj.getHours() * 60 + endObj.getMinutes();
                    const durationMin = Math.max(15, endMin - startMin);

                    const topPx = startMin; // 1 min = 1 px
                    const heightPx = Math.max(26, durationMin); // min height 26px

                    const style = CATEGORY_STYLES[log.category] || CATEGORY_STYLES['Other'];

                    return (
                      <div
                        key={log.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedLog(log);
                        }}
                        style={{
                          top: `${topPx}px`,
                          height: `${heightPx}px`
                        }}
                        className={`absolute inset-x-1 z-10 rounded-xl border p-2 shadow-md hover:z-20 hover:scale-[1.02] cursor-pointer transition-all flex flex-col justify-between overflow-hidden ${style.bg} ${style.border} ${style.text}`}
                      >
                        <div className="flex items-start justify-between gap-1">
                          <span className="text-xs font-semibold truncate leading-tight">
                            {log.title}
                          </span>
                          <span className={`text-[9px] px-1.5 py-0.2 rounded font-medium shrink-0 ${style.badge}`}>
                            {log.category}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-[10px] opacity-80 mt-1">
                          <span>
                            {startObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -{' '}
                            {endObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <span className="flex items-center gap-0.5 text-amber-400">
                            ★ {log.rating}
                          </span>
                        </div>
                      </div>
                    );
                  })}

                  {/* Current Time Indicator Line if Today */}
                  {today && (
                    <div
                      style={{
                        top: `${new Date().getHours() * 60 + new Date().getMinutes()}px`
                      }}
                      className="absolute inset-x-0 border-t-2 border-emerald-400 z-30 pointer-events-none flex items-center"
                    >
                      <div className="w-2 h-2 rounded-full bg-emerald-400 -ml-1 shadow-sm shadow-emerald-400" />
                    </div>
                  )}

                </div>
              );
            })}

          </div>
        </div>
      </div>

      {/* Dialog / Modal for Logging Activity */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-3xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h2 className="text-lg font-medium text-zinc-100 flex items-center gap-2">
                <Plus className="h-5 w-5 text-emerald-400" />
                Log Activity for {modalDate.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-zinc-500 hover:text-zinc-300 transition p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveLog} className="space-y-4">
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Activity Title</label>
                <input
                  type="text"
                  placeholder="e.g. Exercise session, Reading, Walk..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-xl bg-zinc-950 border border-zinc-800 px-4 py-2.5 text-sm text-zinc-100 outline-none focus:border-emerald-500/50"
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded-xl bg-zinc-950 border border-zinc-800 px-4 py-2.5 text-sm text-zinc-100 outline-none focus:border-emerald-500/50"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <TimePickerInput
                  label="Start Time"
                  value={startTime}
                  onChange={setStartTime}
                  required
                />
                <TimePickerInput
                  label="End Time"
                  value={endTime}
                  onChange={setEndTime}
                  required
                />
              </div>

              <div>
                <label className="text-xs text-zinc-400 mb-1 flex justify-between">
                  <span>Energy & Satisfaction Rating</span>
                  <span className="text-emerald-400 font-semibold">{rating} / 5</span>
                </label>
                <input
                  type="range"
                  min="1"
                  max="5"
                  step="1"
                  value={rating}
                  onChange={(e) => setRating(Number(e.target.value))}
                  className="w-full accent-emerald-500 cursor-pointer"
                />
              </div>

              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Notes (Optional)</label>
                <textarea
                  placeholder="How did you feel? Any notable metrics or thoughts..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full rounded-xl bg-zinc-950 border border-zinc-800 px-4 py-2.5 text-sm text-zinc-100 outline-none focus:border-emerald-500/50 resize-none h-20"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-400 hover:text-zinc-200 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-semibold hover:bg-emerald-500/30 transition flex items-center gap-1.5"
                >
                  <Plus className="h-4 w-4" /> Save Activity
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Dialog for Viewing / Deleting existing Log */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-3xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between border-b border-zinc-800 pb-3">
              <div>
                <span className="text-[10px] text-emerald-400 uppercase tracking-wider bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-900/50">
                  {selectedLog.category}
                </span>
                <h3 className="text-lg font-medium text-zinc-100 mt-1.5">{selectedLog.title}</h3>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-zinc-500 hover:text-zinc-300 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-2 text-xs text-zinc-300">
              <div className="flex items-center justify-between py-1 border-b border-zinc-800/50">
                <span className="text-zinc-500">Time:</span>
                <span className="font-mono">
                  {new Date(selectedLog.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -{' '}
                  {new Date(selectedLog.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-zinc-800/50">
                <span className="text-zinc-500">Duration:</span>
                <span>{Math.round((selectedLog.endTime - selectedLog.startTime) / 60000)} minutes</span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-zinc-800/50">
                <span className="text-zinc-500">Energy / Rating:</span>
                {renderStars(selectedLog.rating)}
              </div>

              {selectedLog.notes && (
                <div className="pt-2">
                  <span className="text-zinc-500 block mb-1">Notes:</span>
                  <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800 text-zinc-300 text-xs whitespace-pre-wrap">
                    {selectedLog.notes}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-zinc-800">
              <button
                onClick={() => {
                  onRemoveLog(selectedLog.id);
                  setSelectedLog(null);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 text-xs hover:bg-rose-500/20 transition"
              >
                <Trash2 className="h-4 w-4" /> Delete Log
              </button>

              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-1.5 rounded-xl bg-zinc-800 text-zinc-300 text-xs hover:bg-zinc-700 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
