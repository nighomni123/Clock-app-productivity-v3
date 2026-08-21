import React, { useState, useEffect, useMemo } from 'react';
import { CalendarPlus, BookOpen, Clock as ClockIcon, Target, GraduationCap } from 'lucide-react';
import { ExamState } from '../types';
import { createGCalLinkForExam } from '../lib/gcal';
import { motion } from 'motion/react';

interface ClockViewProps {
  exam: ExamState;
  onUpdateExam: (exam: ExamState) => void;
  intention: string;
  onUpdateIntention: (intention: string) => void;
}

const DAY_MS = 24 * 60 * 60 * 1000;

export const ClockView: React.FC<ClockViewProps> = ({
  exam,
  onUpdateExam,
  intention,
  onUpdateIntention
}) => {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const examDate = exam.date ? new Date(exam.date).getTime() : null;
  const totalMs = examDate ? examDate - new Date(exam.date + 'T00:00:00').getTime() + 0 : 0;
  const daysLeft = useMemo(() => {
    if (!examDate) return null;
    return Math.max(0, Math.ceil((examDate - now) / DAY_MS));
  }, [examDate, now]);
  const hoursLeft = useMemo(() => {
    if (!examDate) return null;
    return Math.max(0, Math.floor(((examDate - now) % DAY_MS) / (1000 * 60 * 60)));
  }, [examDate, now]);

  // Progress ring toward exam (over a 60-day horizon)
  const examProgress = useMemo(() => {
    if (!examDate) return 0;
    const horizon = 60 * DAY_MS;
    const remaining = Math.max(0, examDate - now);
    return Math.min(100, Math.max(0, ((horizon - remaining) / horizon) * 100));
  }, [examDate, now]);

  const R = 52;
  const CIRC = 2 * Math.PI * R;

  return (
    <div className="w-full grid grid-cols-1 lg:grid-cols-5 gap-5">
      {/* Live clock */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="lg:col-span-3 glass card-shadow rounded-3xl p-8 sm:p-10 flex flex-col justify-center relative overflow-hidden"
      >
        <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-indigo-500/10 blur-3xl" />
        <div className="relative">
          <div className="flex items-center gap-2 text-zinc-500 text-sm mb-3">
            <ClockIcon className="w-4 h-4" />
            <span>{new Date(now).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</span>
          </div>
          <div className="text-6xl sm:text-8xl font-thin tracking-tight text-white tabular-nums">
            {new Date(now).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}
            <span className="text-2xl sm:text-3xl text-zinc-600 ml-2 align-top">
              {new Date(now).toLocaleTimeString('en-US', { second: '2-digit', hour12: false })}
            </span>
          </div>
          <div className="mt-6 max-w-md">
            <label className="text-xs text-zinc-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5" /> Today's Intention
            </label>
            <textarea
              value={intention}
              onChange={(e) => onUpdateIntention(e.target.value)}
              placeholder="What do you want to accomplish today?"
              rows={2}
              className="w-full bg-white/5 border border-white/5 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition-all resize-none"
            />
            <p className="mt-2 text-xs text-zinc-600">Synced with the Focus workspace.</p>
          </div>
        </div>
      </motion.div>

      {/* Exam countdown */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08 }}
        className="lg:col-span-2 glass card-shadow rounded-3xl p-6 flex flex-col"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-white flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-fuchsia-400" /> Exam Countdown
          </h2>
          {exam.date && (
            <a href={createGCalLinkForExam(exam)} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors" aria-label="Add to Google Calendar">
              <CalendarPlus className="w-4 h-4 text-zinc-300" />
            </a>
          )}
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs text-zinc-500 mb-1.5">Exam Name</label>
            <input
              type="text"
              value={exam.name}
              onChange={(e) => onUpdateExam({ ...exam, name: e.target.value })}
              placeholder="e.g., Final Exam"
              className="w-full bg-white/5 border border-white/5 rounded-xl px-3 py-2.5 text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/40 transition-all text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-zinc-500 mb-1.5">Exam Date</label>
            <input
              type="date"
              value={exam.date}
              onChange={(e) => onUpdateExam({ ...exam, date: e.target.value })}
              className="w-full bg-white/5 border border-white/5 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-fuchsia-500/40 transition-all text-sm"
            />
          </div>
        </div>

        {daysLeft !== null && (
          <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="mt-5 flex items-center gap-5">
            <div className="relative w-28 h-28 shrink-0">
              <svg className="w-full h-full -rotate-90">
                <circle cx="50%" cy="50%" r={R} stroke="currentColor" strokeWidth="6" fill="transparent" className="text-white/10" />
                <motion.circle
                  cx="50%" cy="50%" r={R} stroke="currentColor" strokeWidth="6" fill="transparent"
                  strokeDasharray={CIRC} strokeLinecap="round"
                  animate={{ strokeDashoffset: CIRC * (1 - examProgress / 100) }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                  className="text-fuchsia-400"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold text-white tabular-nums">{daysLeft}</span>
                <span className="text-[10px] text-zinc-500 uppercase">days</span>
              </div>
            </div>
            <div className="flex-1">
              <div className="text-sm text-zinc-300 font-medium">{exam.name || 'Your exam'}</div>
              <div className="mt-1 flex items-center gap-2 text-xs text-zinc-500">
                <span>{hoursLeft} hours</span>
                <span className="w-1 h-1 rounded-full bg-zinc-600" />
                <span>{Math.round(examProgress)}% elapsed</span>
              </div>
              <div className="mt-3 h-1.5 rounded-full bg-white/10 overflow-hidden">
                <motion.div className="h-full bg-gradient-to-r from-fuchsia-500 to-indigo-500" initial={{ width: 0 }} animate={{ width: `${examProgress}%` }} transition={{ duration: 0.8 }} />
              </div>
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
};
