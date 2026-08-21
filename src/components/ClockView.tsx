import React, { useState, useEffect, useMemo } from 'react';
import { Calendar, CalendarPlus, BookOpen, Clock as ClockIcon, Target } from 'lucide-react';
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

  const daysLeft = useMemo(() => {
    if (!exam.date) return null;
    const examDate = new Date(exam.date).getTime();
    const diff = examDate - now;
    return Math.max(0, Math.ceil(diff / DAY_MS));
  }, [exam.date, now]);

  const hoursLeft = useMemo(() => {
    if (!exam.date) return null;
    const examDate = new Date(exam.date).getTime();
    const diff = examDate - now;
    return Math.max(0, Math.floor((diff % DAY_MS) / (1000 * 60 * 60)));
  }, [exam.date, now]);

  return (
    <div className="min-h-screen bg-black text-zinc-100 pb-24">
      <div className="max-w-4xl mx-auto px-4 pt-12">
        {/* Current Time */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <div className="text-center">
            <div className="text-7xl font-thin tracking-tight text-white mb-2">
              {new Date(now).toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
              })}
            </div>
            <div className="text-sm text-zinc-500 font-medium">
              {new Date(now).toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric'
              })}
            </div>
          </div>
        </motion.section>

        {/* Exam Countdown */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8"
        >
          <div className="bg-zinc-900/50 backdrop-blur-xl rounded-2xl p-6 border border-zinc-800/50">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">Exam Countdown</h2>
              {exam.date && (
                <div className="flex gap-2">
                  <a
                    href={createGCalLinkForExam(exam)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 transition-colors"
                  >
                    <CalendarPlus className="w-4 h-4 text-zinc-400" />
                  </a>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs text-zinc-500 mb-2 font-medium">Exam Name</label>
                <input
                  type="text"
                  value={exam.name}
                  onChange={(e) => onUpdateExam({ ...exam, name: e.target.value })}
                  placeholder="e.g., Final Exam"
                  className="w-full bg-zinc-800/50 border border-zinc-700/50 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs text-zinc-500 mb-2 font-medium">Exam Date</label>
                <input
                  type="date"
                  value={exam.date}
                  onChange={(e) => onUpdateExam({ ...exam, date: e.target.value })}
                  className="w-full bg-zinc-800/50 border border-zinc-700/50 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                />
              </div>

              {daysLeft !== null && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="grid grid-cols-2 gap-3 pt-2"
                >
                  <div className="bg-zinc-800/30 rounded-xl p-4 text-center">
                    <div className="text-3xl font-bold text-white mb-1">{daysLeft}</div>
                    <div className="text-xs text-zinc-500 font-medium">Days</div>
                  </div>
                  <div className="bg-zinc-800/30 rounded-xl p-4 text-center">
                    <div className="text-3xl font-bold text-white mb-1">{hoursLeft}</div>
                    <div className="text-xs text-zinc-500 font-medium">Hours</div>
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        </motion.section>

        {/* Today's Intention */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="bg-zinc-900/50 backdrop-blur-xl rounded-2xl p-6 border border-zinc-800/50">
            <div className="flex items-center gap-2 mb-4">
              <BookOpen className="w-5 h-5 text-blue-400" />
              <h2 className="text-lg font-semibold text-white">Today's Intention</h2>
            </div>
            <textarea
              value={intention}
              onChange={(e) => onUpdateIntention(e.target.value)}
              placeholder="What do you want to accomplish today?"
              rows={3}
              className="w-full bg-zinc-800/50 border border-zinc-700/50 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all resize-none"
            />
            <div className="flex items-center gap-2 mt-3 text-xs text-zinc-500">
              <Target className="w-3.5 h-3.5" />
              <span>Synced with Focus Workspace</span>
            </div>
          </div>
        </motion.section>
      </div>
    </div>
  );
};
