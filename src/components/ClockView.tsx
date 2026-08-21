import React, { useState, useEffect, useMemo } from 'react';
import { Calendar, BookOpen, Target } from 'lucide-react';
import { ExamState } from '../types';

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
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const daysRemaining = useMemo(() => {
    if (!exam.date) return null;
    const now = new Date();
    const target = new Date(`${exam.date}T00:00:00`);
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return Math.ceil((target.getTime() - today.getTime()) / DAY_MS);
  }, [exam.date, time]);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col items-center animate-in fade-in zoom-in-95 duration-500">
      {/* Big Digital Clock */}
      <div className="py-4 sm:py-8 md:py-14 text-center">
        <h1 className="text-5xl sm:text-7xl md:text-[8rem] lg:text-[10rem] font-extralight tracking-tighter text-zinc-100 tabular-nums">
          {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
        </h1>
        <p className="mt-2 sm:mt-4 text-xs sm:text-base font-light uppercase tracking-[0.25em] text-zinc-500 md:text-2xl">
          {time.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
        </p>
      </div>

      <div className="grid w-full gap-4 sm:gap-6 md:grid-cols-2">
        {/* Exam Countdown Card */}
        <section className="rounded-3xl border border-zinc-800/80 bg-zinc-900/55 p-4 sm:p-6 backdrop-blur-sm flex flex-col justify-between">
          <div>
            <div className="mb-3 sm:mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-zinc-400" />
                <h2 className="text-sm sm:text-base font-medium text-zinc-200">Exam Target & Countdown</h2>
              </div>
            </div>

            <div className="grid gap-2.5 sm:grid-cols-[1fr_170px]">
              <input
                id="exam-name-input"
                type="text"
                value={exam.name || ''}
                onChange={(e) => onUpdateExam({ ...exam, name: e.target.value })}
                placeholder="Target exam or deadline name"
                className="rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 text-xs sm:text-sm text-zinc-100 outline-none transition focus:border-zinc-600"
              />
              <input
                id="exam-date-input"
                type="date"
                value={exam.date || ''}
                onChange={(e) => onUpdateExam({ ...exam, date: e.target.value })}
                className="rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 text-xs sm:text-sm text-zinc-100 outline-none transition focus:border-zinc-600"
              />
            </div>
          </div>

          {daysRemaining !== null ? (
            <div className="mt-4 sm:mt-5 rounded-2xl border border-zinc-800/80 bg-black/40 p-4 sm:p-5 text-center">
              <div className={`text-3xl sm:text-5xl font-light tabular-nums ${daysRemaining < 0 ? 'text-zinc-600' : 'text-zinc-100'}`}>
                {daysRemaining === 0 ? 'TODAY' : daysRemaining > 0 ? `${daysRemaining} Days` : `${Math.abs(daysRemaining)} Days Ago`}
              </div>
              <p className="mt-1 text-xs sm:text-sm text-zinc-400 font-medium truncate">{exam.name || 'Target Exam'}</p>
            </div>
          ) : (
            <div className="mt-4 sm:mt-5 rounded-2xl border border-dashed border-zinc-800 bg-black/20 p-4 sm:p-5 text-center text-xs sm:text-sm text-zinc-500">
              Select an exam date above to activate countdown.
            </div>
          )}
        </section>

        {/* Primary Study Intention Card */}
        <section className="rounded-3xl border border-zinc-800/80 bg-zinc-900/55 p-4 sm:p-6 backdrop-blur-sm flex flex-col justify-between">
          <div>
            <div className="mb-2 sm:mb-4 flex items-center gap-2">
              <Target className="h-4 w-4 sm:h-5 sm:w-5 text-zinc-400" />
              <h2 className="text-sm sm:text-base font-medium text-zinc-200">Current Study Goal / Intention</h2>
            </div>
            <p className="text-xs text-zinc-500 mb-2.5">
              Define your singular focus topic to stay aligned during focus sessions.
            </p>
            <textarea
              id="study-intention-input"
              value={intention}
              onChange={(e) => onUpdateIntention(e.target.value)}
              placeholder="E.g., Complete Chapter 4 Calculus derivatives problem set"
              className="h-24 sm:h-28 w-full resize-none rounded-xl border border-zinc-800 bg-zinc-950 p-3 sm:p-4 text-xs sm:text-sm text-zinc-100 outline-none transition focus:border-zinc-600 leading-relaxed"
            />
          </div>

          <div className="mt-4 flex items-center justify-between text-[11px] sm:text-xs text-zinc-500 border-t border-zinc-800/60 pt-3">
            <span className="flex items-center gap-1">
              <BookOpen className="h-3.5 w-3.5 text-zinc-400" />
              <span>Synced with Focus Workspace</span>
            </span>
            <span className="hidden sm:inline text-zinc-400">Press Space in Focus tab to start</span>
          </div>
        </section>
      </div>
    </div>
  );
};
