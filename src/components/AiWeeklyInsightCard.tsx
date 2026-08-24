import React, { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { AlertCircle, CalendarCheck, HeartPulse, Lightbulb, ListChecks, Loader2, Sparkles, Target } from 'lucide-react';
import { WeeklyInsightsData, WeeklyInsight, WeeklyReview } from '../types';
import { requestWeeklyReview } from '../lib/aiClient';

interface AiWeeklyInsightCardProps {
  data: WeeklyInsightsData;
}

const CATEGORY_ICON: Record<WeeklyInsight['category'], React.ComponentType<{ className?: string }>> = {
  focus: Target,
  consistency: CalendarCheck,
  wellbeing: HeartPulse,
  tasks: ListChecks
};

const CATEGORY_LABEL: Record<WeeklyInsight['category'], string> = {
  focus: 'Focus Time',
  consistency: 'Consistency',
  wellbeing: 'Wellbeing',
  tasks: 'Task Flow'
};

export const AiWeeklyInsightCard: React.FC<AiWeeklyInsightCardProps> = ({ data }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');
  const [review, setReview] = useState<WeeklyReview | null>(null);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError('');
    try {
      setReview(await requestWeeklyReview(data));
    } catch (err) {
      setReview(null);
      setError(err instanceof Error ? err.message : 'Failed to generate the weekly review. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <section className="rounded-3xl border border-zinc-800/80 bg-zinc-900/55 p-4 sm:p-6 backdrop-blur-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Lightbulb className="h-4 w-4 sm:h-5 sm:w-5 text-violet-300" />
          <h2 className="font-semibold text-sm sm:text-base text-zinc-200">AI Weekly Insight</h2>
        </div>
        <span className="text-[10px] sm:text-xs text-zinc-500 hidden sm:inline">{data.rangeLabel}</span>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-black/30 p-4 sm:p-5 space-y-4">
        {!review && !isGenerating && (
          <>
            <p className="text-[11px] sm:text-xs leading-relaxed text-zinc-400">
              Gemini reviews your completed tasks ({data.completedTasks}), total focus time ({data.totalFocusMinutes}m),
              and journal tone from the last 7 days to produce three actionable insights.
            </p>
            <button
              type="button"
              onClick={handleGenerate}
              aria-label="Generate an AI weekly review with three actionable insights"
              disabled={isGenerating}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-violet-500/30 bg-violet-500/10 py-2.5 text-xs sm:text-sm font-medium text-violet-300 transition hover:bg-violet-500/20 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <Sparkles className="h-4 w-4" />
              Generate weekly review
            </button>
          </>
        )}

        {isGenerating && (
          <div className="flex flex-col items-center justify-center gap-2.5 py-8 text-center" role="status">
            <Loader2 className="h-6 w-6 animate-spin text-violet-300" />
            <p className="text-xs text-zinc-400">Summarizing your week…</p>
          </div>
        )}

        {!isGenerating && error && (
          <div
            className="flex items-start gap-2 rounded-xl border border-rose-900/50 bg-rose-950/30 px-3 py-2.5 text-xs text-rose-300"
            role="alert"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {!isGenerating && review && (
          <AnimatePresence initial={false}>
            <motion.div
              key="weekly-review"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className="space-y-3"
              aria-live="polite"
            >
              {review.summary && (
                <p className="rounded-xl border border-violet-900/40 bg-violet-950/20 px-3.5 py-2.5 text-xs leading-relaxed text-zinc-300">
                  {review.summary}
                </p>
              )}

              <ol className="space-y-2.5">
                {review.insights.map((insight, i) => {
                  const Icon = CATEGORY_ICON[insight.category] ?? Lightbulb;
                  return (
                    <motion.li
                      key={`${insight.title}-${i}`}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.08 * i, duration: 0.22 }}
                      className="flex items-start gap-2.5 rounded-xl border border-zinc-800/80 bg-zinc-900/50 px-3.5 py-3"
                    >
                      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-violet-500/30 bg-violet-500/10">
                        <Icon className="h-3.5 w-3.5 text-violet-300" />
                      </span>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-xs font-semibold text-zinc-100">
                            {i + 1}. {insight.title}
                          </h3>
                          <span className="rounded-md border border-zinc-800 bg-black/40 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-zinc-500">
                            {CATEGORY_LABEL[insight.category] ?? 'Insight'}
                          </span>
                        </div>
                        <p className="mt-1 text-[11px] leading-relaxed text-zinc-400">{insight.detail}</p>
                      </div>
                    </motion.li>
                  );
                })}
              </ol>

              <button
                type="button"
                onClick={handleGenerate}
                aria-label="Regenerate the AI weekly review"
                className="flex items-center justify-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-[11px] font-medium text-zinc-400 transition hover:border-zinc-600 hover:text-zinc-200 mx-auto"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Regenerate review
              </button>
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </section>
  );
};
