import React, { useState, useRef, useEffect } from 'react';
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
  ChevronDown
} from 'lucide-react';

interface ActivityJournalProps {
  logs: ActivityLog[];
  onAddLog: (log: Omit<ActivityLog, 'id' | 'userId' | 'createdAt'>) => void;
  onUpdateLog?: (id: string, updates: Partial<Omit<ActivityLog, 'id' | 'userId' | 'createdAt'>>) => void;
  onRemoveLog: (id: string) => void;
}

const CATEGORIES = ['Work', 'Exercise', 'Leisure', 'Errands', 'Social', 'Rest', 'Other'];

const CATEGORY_STYLES: Record<string, { bg: string; border: string; text: string; active: string }> = {
  Work: { bg: 'bg-indigo-950/60', border: 'border-indigo-500/40', text: 'text-indigo-200', active: 'bg-indigo-600 border-indigo-400' },
  Exercise: { bg: 'bg-emerald-950/60', border: 'border-emerald-500/40', text: 'text-emerald-200', active: 'bg-emerald-600 border-emerald-400' },
  Leisure: { bg: 'bg-purple-950/60', border: 'border-purple-500/40', text: 'text-purple-200', active: 'bg-purple-600 border-purple-400' },
  Errands: { bg: 'bg-amber-950/60', border: 'border-amber-500/40', text: 'text-amber-200', active: 'bg-amber-600 border-amber-400' },
  Social: { bg: 'bg-rose-950/60', border: 'border-rose-500/40', text: 'text-rose-200', active: 'bg-rose-600 border-rose-400' },
  Rest: { bg: 'bg-teal-950/60', border: 'border-teal-500/40', text: 'text-teal-200', active: 'bg-teal-600 border-teal-400' },
  Other: { bg: 'bg-zinc-950/60', border: 'border-zinc-500/40', text: 'text-zinc-200', active: 'bg-zinc-600 border-zinc-400' }
};

const QUICK_DURATIONS = [
  { label: '30min', minutes: 30 },
  { label: '1hr', minutes: 60 },
  { label: '2hr', minutes: 120 },
  { label: '3hr', minutes: 180 }
];

const formatTime = (timestamp: number): string => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
};

const formatDuration = (minutes: number): string => {
  if (minutes < 60) return `${minutes}m`;
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
};

const isToday = (timestamp: number): boolean => {
  const date = new Date(timestamp);
  const today = new Date();
  return date.toDateString() === today.toDateString();
};

export const ActivityJournal: React.FC<ActivityJournalProps> = ({ 
  logs, 
  onAddLog, 
  onUpdateLog,
  onRemoveLog 
}) => {
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

  // Filter today's logs and sort by start time (newest first)
  const todayLogs = logs
    .filter(log => isToday(log.startTime))
    .sort((a, b) => b.startTime - a.startTime);

  // Calculate total time today
  const totalMinutesToday = todayLogs.reduce((sum, log) => {
    return sum + Math.round((log.endTime - log.startTime) / 60000);
  }, 0);

  const handleQuickAdd = (durationMinutes: number) => {
    const now = Date.now();
    const startTime = now;
    const endTime = now + (durationMinutes * 60000);

    onAddLog({
      title: title || selectedCategory,
      category: selectedCategory,
      startTime,
      endTime,
      rating: 3,
      notes: ''
    });

    // Reset title after quick add
    setTitle('');
  };

  const handleManualAdd = () => {
    if (!manualStartTime || !manualEndTime) return;

    const today = new Date();
    const [startHour, startMin] = manualStartTime.split(':').map(Number);
    const [endHour, endMin] = manualEndTime.split(':').map(Number);

    const startTime = new Date(today.getFullYear(), today.getMonth(), today.getDate(), startHour, startMin).getTime();
    const endTime = new Date(today.getFullYear(), today.getMonth(), today.getDate(), endHour, endMin).getTime();

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

    // Reset form
    setShowManualEntry(false);
    setManualStartTime('');
    setManualEndTime('');
    setManualTitle('');
    setManualCategory('Work');
    setManualRating(3);
  };

  const handleEdit = (log: ActivityLog) => {
    setEditingLog(log);
    const startDate = new Date(log.startTime);
    const endDate = new Date(log.endTime);
    setManualStartTime(`${String(startDate.getHours()).padStart(2, '0')}:${String(startDate.getMinutes()).padStart(2, '0')}`);
    setManualEndTime(`${String(endDate.getHours()).padStart(2, '0')}:${String(endDate.getMinutes()).padStart(2, '0')}`);
    setManualTitle(log.title);
    setManualCategory(log.category);
    setManualRating(log.rating);
  };

  const handleUpdate = () => {
    if (!editingLog || !manualStartTime || !manualEndTime) return;

    const today = new Date();
    const [startHour, startMin] = manualStartTime.split(':').map(Number);
    const [endHour, endMin] = manualEndTime.split(':').map(Number);

    const startTime = new Date(today.getFullYear(), today.getMonth(), today.getDate(), startHour, startMin).getTime();
    const endTime = new Date(today.getFullYear(), today.getMonth(), today.getDate(), endHour, endMin).getTime();

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

  const handleSwipe = (e: MouseEvent | TouchEvent | PointerEvent, info: PanInfo, logId: string) => {
    if (info.offset.x < -100) {
      onRemoveLog(logId);
      setSwipedId(null);
    } else {
      setSwipedId(null);
    }
  };

  return (
    <div className="flex flex-col h-full bg-black text-zinc-100">
      {/* Header */}
      <div className="px-4 pt-6 pb-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-2xl font-bold text-zinc-100">Activity Journal</h2>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowManualEntry(true)}
            className="flex items-center gap-2 px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-300 hover:bg-zinc-800 transition-colors"
          >
            <Edit3 size={16} />
            <span className="text-sm font-medium">Manual</span>
          </motion.button>
        </div>
        
        <div className="flex items-center gap-2 text-zinc-500 text-sm">
          <Calendar size={14} />
          <span>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</span>
        </div>

        {totalMinutesToday > 0 && (
          <div className="mt-3 flex items-center gap-2 text-emerald-400">
            <Clock size={16} />
            <span className="text-sm font-semibold">{formatDuration(totalMinutesToday)} logged today</span>
          </div>
        )}
      </div>

      {/* Quick Entry Section */}
      <div className="px-4 pb-4 border-b border-zinc-900">
        {/* Category Picker */}
        <div className="mb-4">
          <label className="text-xs text-zinc-500 uppercase tracking-wide mb-2 block">Category</label>
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {CATEGORIES.map(cat => (
              <motion.button
                key={cat}
                whileTap={{ scale: 0.95 }}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-xl border text-sm font-medium whitespace-nowrap transition-all ${
                  selectedCategory === cat
                    ? `${CATEGORY_STYLES[cat].active} text-white`
                    : `${CATEGORY_STYLES[cat].bg} ${CATEGORY_STYLES[cat].border} ${CATEGORY_STYLES[cat].text}`
                }`}
              >
                {cat}
              </motion.button>
            ))}
          </div>
        </div>

        {/* Title Input */}
        <div className="mb-4">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What are you doing? (optional)"
            className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-700 transition-colors"
          />
        </div>

        {/* Quick Duration Buttons */}
        <div>
          <label className="text-xs text-zinc-500 uppercase tracking-wide mb-2 block">Quick Add</label>
          <div className="grid grid-cols-4 gap-2">
            {QUICK_DURATIONS.map(({ label, minutes }) => (
              <motion.button
                key={label}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleQuickAdd(minutes)}
                className="px-3 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-200 font-semibold hover:bg-zinc-800 hover:border-zinc-700 transition-all"
              >
                {label}
              </motion.button>
            ))}
          </div>
        </div>
      </div>

      {/* Today's Entries List */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {todayLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <div className="w-16 h-16 bg-zinc-900 rounded-full flex items-center justify-center mb-4">
              <Sparkles className="text-zinc-600" size={28} />
            </div>
            <p className="text-zinc-500 text-sm">No activities logged today</p>
            <p className="text-zinc-600 text-xs mt-1">Tap a duration button to get started</p>
          </div>
        ) : (
          <div className="space-y-2">
            {todayLogs.map(log => {
              const duration = Math.round((log.endTime - log.startTime) / 60000);
              const isSwiped = swipedId === log.id;

              return (
                <motion.div
                  key={log.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                  className="relative overflow-hidden rounded-xl"
                >
                  {/* Delete Background */}
                  <div className="absolute inset-0 flex items-center justify-end px-4 bg-red-600">
                    <Trash2 size={20} className="text-white" />
                  </div>

                  {/* Entry Card */}
                  <motion.div
                    drag="x"
                    dragConstraints={{ left: 0, right: 0 }}
                    dragElastic={0.2}
                    onDragEnd={(e, info) => handleSwipe(e, info, log.id)}
                    animate={{ x: isSwiped ? -80 : 0 }}
                    className={`relative ${CATEGORY_STYLES[log.category]?.bg || 'bg-zinc-900'} border ${CATEGORY_STYLES[log.category]?.border || 'border-zinc-800'} rounded-xl p-4 cursor-pointer`}
                    onClick={() => handleEdit(log)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${CATEGORY_STYLES[log.category]?.active || 'bg-zinc-700'} text-white font-medium`}>
                            {log.category}
                          </span>
                          <span className="text-xs text-zinc-500">
                            {formatTime(log.startTime)} - {formatTime(log.endTime)}
                          </span>
                        </div>
                        <h3 className="text-base font-semibold text-zinc-100 truncate">
                          {log.title}
                        </h3>
                        <p className="text-sm text-zinc-400 mt-0.5">
                          {formatDuration(duration)}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 text-amber-400">
                        {Array.from({ length: log.rating }).map((_, i) => (
                          <div key={i} className="w-1.5 h-1.5 bg-amber-400 rounded-full" />
                        ))}
                      </div>
                    </div>
                  </motion.div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Manual Entry Modal */}
      <AnimatePresence>
        {(showManualEntry || editingLog) && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setShowManualEntry(false);
                setEditingLog(null);
              }}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40"
            />

            {/* Bottom Sheet */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 bg-zinc-950 border-t border-zinc-800 rounded-t-3xl z-50 max-h-[85vh] overflow-y-auto"
            >
              {/* Handle */}
              <div className="flex justify-center py-3">
                <div className="w-12 h-1.5 bg-zinc-700 rounded-full" />
              </div>

              <div className="px-6 pb-8">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-zinc-100">
                    {editingLog ? 'Edit Activity' : 'Manual Entry'}
                  </h3>
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => {
                      setShowManualEntry(false);
                      setEditingLog(null);
                    }}
                    className="p-2 hover:bg-zinc-900 rounded-full transition-colors"
                  >
                    <X size={20} className="text-zinc-400" />
                  </motion.button>
                </div>

                {/* Time Inputs */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div>
                    <label className="text-xs text-zinc-500 uppercase tracking-wide mb-2 block">Start Time</label>
                    <input
                      type="time"
                      value={manualStartTime}
                      onChange={(e) => setManualStartTime(e.target.value)}
                      className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-100 focus:outline-none focus:border-zinc-700 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-zinc-500 uppercase tracking-wide mb-2 block">End Time</label>
                    <input
                      type="time"
                      value={manualEndTime}
                      onChange={(e) => setManualEndTime(e.target.value)}
                      className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-100 focus:outline-none focus:border-zinc-700 transition-colors"
                    />
                  </div>
                </div>

                {/* Title */}
                <div className="mb-4">
                  <label className="text-xs text-zinc-500 uppercase tracking-wide mb-2 block">Title</label>
                  <input
                    type="text"
                    value={manualTitle}
                    onChange={(e) => setManualTitle(e.target.value)}
                    placeholder="What did you do?"
                    className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-700 transition-colors"
                  />
                </div>

                {/* Category */}
                <div className="mb-4">
                  <label className="text-xs text-zinc-500 uppercase tracking-wide mb-2 block">Category</label>
                  <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                    {CATEGORIES.map(cat => (
                      <motion.button
                        key={cat}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setManualCategory(cat)}
                        className={`px-4 py-2 rounded-xl border text-sm font-medium whitespace-nowrap transition-all ${
                          manualCategory === cat
                            ? `${CATEGORY_STYLES[cat].active} text-white`
                            : `${CATEGORY_STYLES[cat].bg} ${CATEGORY_STYLES[cat].border} ${CATEGORY_STYLES[cat].text}`
                        }`}
                      >
                        {cat}
                      </motion.button>
                    ))}
                  </div>
                </div>

                {/* Rating */}
                <div className="mb-6">
                  <label className="text-xs text-zinc-500 uppercase tracking-wide mb-2 block">Rating</label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map(star => (
                      <motion.button
                        key={star}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => setManualRating(star)}
                        className={`w-12 h-12 rounded-xl border-2 transition-all ${
                          star <= manualRating
                            ? 'bg-amber-500 border-amber-400 text-white'
                            : 'bg-zinc-900 border-zinc-800 text-zinc-600'
                        }`}
                      >
                        {star}
                      </motion.button>
                    ))}
                  </div>
                </div>

                {/* Submit Button */}
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={editingLog ? handleUpdate : handleManualAdd}
                  className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  <Check size={20} />
                  <span>{editingLog ? 'Update Activity' : 'Add Activity'}</span>
                </motion.button>

                {/* Delete Button (for editing) */}
                {editingLog && (
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      onRemoveLog(editingLog.id);
                      setEditingLog(null);
                    }}
                    className="w-full mt-3 py-4 bg-red-600/20 border border-red-600/40 hover:bg-red-600/30 text-red-400 font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
                  >
                    <Trash2 size={20} />
                    <span>Delete Activity</span>
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
