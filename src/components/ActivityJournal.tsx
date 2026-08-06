import React, { useState } from 'react';
import { ActivityLog } from '../types';
import { Activity, Plus, Trash2, Download, Star, StarHalf } from 'lucide-react';
import { TimePickerInput } from './TimePickerInput';

interface ActivityJournalProps {
  logs: ActivityLog[];
  onAddLog: (log: Omit<ActivityLog, 'id' | 'userId' | 'createdAt'>) => void;
  onRemoveLog: (id: string) => void;
}

export const ActivityJournal: React.FC<ActivityJournalProps> = ({ logs, onAddLog, onRemoveLog }) => {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Work');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [rating, setRating] = useState(3);
  const [notes, setNotes] = useState('');

  const CATEGORIES = ['Work', 'Exercise', 'Leisure', 'Errands', 'Social', 'Rest', 'Other'];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !startTime || !endTime) return;

    // Convert time strings (HH:mm) to timestamp for today
    const now = new Date();
    const [startH, startM] = startTime.split(':').map(Number);
    const startObj = new Date(now.getFullYear(), now.getMonth(), now.getDate(), startH, startM);
    
    const [endH, endM] = endTime.split(':').map(Number);
    const endObj = new Date(now.getFullYear(), now.getMonth(), now.getDate(), endH, endM);

    onAddLog({
      title,
      category,
      startTime: startObj.getTime(),
      endTime: endObj.getTime(),
      rating,
      notes
    });

    setTitle('');
    setStartTime('');
    setEndTime('');
    setRating(3);
    setNotes('');
  };

  const handleExport = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(logs, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "activity_journal_export.json");
    document.body.appendChild(downloadAnchorNode); // required for firefox
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const formatTime = (ts: number) => {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderStars = (val: number) => {
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((s) => (
          <Star
            key={s}
            className={`h-4 w-4 ${s <= val ? 'fill-amber-400 text-amber-400' : 'text-zinc-600'}`}
          />
        ))}
      </div>
    );
  };

  const calculateAverageRating = () => {
    if (logs.length === 0) return 0;
    const sum = logs.reduce((acc, curr) => acc + curr.rating, 0);
    return (sum / logs.length).toFixed(1);
  };

  const calculateTotalMinutes = () => {
    return logs.reduce((acc, curr) => {
      return acc + (curr.endTime - curr.startTime) / 60000;
    }, 0);
  };

  return (
    <div className="mx-auto max-w-5xl space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header className="mb-8">
        <h1 className="text-3xl font-light tracking-tight text-white mb-2 flex items-center gap-3">
          <Activity className="h-7 w-7 text-emerald-400" />
          Life Log & Analytics
        </h1>
        <p className="text-zinc-400 text-sm">
          Track your daily activities, evaluate your energy and satisfaction, and analyze your time.
        </p>
      </header>

      <div className="grid gap-6 md:grid-cols-[350px_1fr]">
        
        {/* Left Column - Input Form */}
        <div className="space-y-6">
          <section className="rounded-3xl border border-zinc-800/80 bg-zinc-900/55 p-6 backdrop-blur-sm">
            <h2 className="mb-4 text-lg font-medium text-zinc-100">Log Activity</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Activity Name</label>
                <input
                  type="text"
                  placeholder="e.g. Morning Run, Reading..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-xl bg-black border border-zinc-800 px-4 py-2.5 text-sm text-zinc-100 outline-none focus:border-emerald-500/50"
                  required
                />
              </div>

              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded-xl bg-black border border-zinc-800 px-4 py-2.5 text-sm text-zinc-100 outline-none focus:border-emerald-500/50 appearance-none"
                >
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
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
                <label className="text-xs text-zinc-400 mb-1 block flex justify-between">
                  <span>Satisfaction / Energy</span>
                  <span className="text-emerald-400">{rating} / 5</span>
                </label>
                <input
                  type="range"
                  min="1"
                  max="5"
                  step="1"
                  value={rating}
                  onChange={(e) => setRating(Number(e.target.value))}
                  className="w-full accent-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Notes (Optional)</label>
                <textarea
                  placeholder="How did it go?"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full rounded-xl bg-black border border-zinc-800 px-4 py-2.5 text-sm text-zinc-100 outline-none focus:border-emerald-500/50 resize-none h-20"
                />
              </div>

              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 py-2.5 text-sm font-medium hover:bg-emerald-500/20 transition"
              >
                <Plus className="h-4 w-4" />
                Save Log
              </button>
            </form>
          </section>

          {/* Quick Analytics Summary */}
          <section className="rounded-3xl border border-zinc-800/80 bg-zinc-900/55 p-6 backdrop-blur-sm">
            <h2 className="mb-4 text-sm font-medium text-zinc-300">Daily Summary</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-2xl border border-zinc-800 bg-black/40 p-4 flex flex-col items-center justify-center text-center">
                <span className="text-2xl font-light text-amber-400">{calculateAverageRating()}</span>
                <span className="text-xs text-zinc-500 mt-1">Avg Rating</span>
              </div>
              <div className="rounded-2xl border border-zinc-800 bg-black/40 p-4 flex flex-col items-center justify-center text-center">
                <span className="text-2xl font-light text-emerald-400">{Math.round(calculateTotalMinutes() / 60)}h {Math.round(calculateTotalMinutes() % 60)}m</span>
                <span className="text-xs text-zinc-500 mt-1">Logged</span>
              </div>
            </div>
            
            <button
              onClick={handleExport}
              className="mt-6 w-full flex items-center justify-center gap-2 rounded-xl bg-zinc-800 text-zinc-300 border border-zinc-700 py-2 text-sm hover:bg-zinc-700 transition"
            >
              <Download className="h-4 w-4" />
              Export JSON
            </button>
          </section>
        </div>

        {/* Right Column - Timeline */}
        <div className="space-y-4">
          <h2 className="text-lg font-medium text-zinc-100 px-2">Activity Timeline</h2>
          {logs.length === 0 ? (
            <div className="rounded-3xl border border-zinc-800/50 bg-black/20 p-12 text-center">
              <p className="text-zinc-500 text-sm">No activities logged yet.</p>
            </div>
          ) : (
            <div className="space-y-3 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-zinc-800 before:to-transparent">
              {logs.map((log) => {
                const duration = Math.round((log.endTime - log.startTime) / 60000);
                
                return (
                  <div key={log.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-black bg-zinc-900 text-zinc-400 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                      <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                    </div>
                    
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-2xl border border-zinc-800/80 bg-zinc-900/55 backdrop-blur-sm group-hover:border-emerald-500/30 transition">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-medium text-zinc-200">{log.title}</h3>
                          <span className="text-xs text-zinc-500 bg-black/40 px-2 py-0.5 rounded-md border border-zinc-800 inline-block mt-1">
                            {log.category}
                          </span>
                        </div>
                        <button
                          onClick={() => onRemoveLog(log.id)}
                          className="text-zinc-600 hover:text-rose-400 transition"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      
                      <div className="flex items-center gap-3 text-xs text-zinc-400 mb-3">
                        <span className="text-emerald-400/80">{formatTime(log.startTime)} - {formatTime(log.endTime)}</span>
                        <span>•</span>
                        <span>{duration}m</span>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        {renderStars(log.rating)}
                      </div>
                      
                      {log.notes && (
                        <p className="mt-3 text-sm text-zinc-400 bg-black/30 p-3 rounded-xl border border-zinc-800/50">
                          {log.notes}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
