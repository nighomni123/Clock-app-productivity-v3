import React, { useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  AlertCircle,
  CalendarCheck,
  Clock,
  Coffee,
  Loader2,
  Plus,
  RefreshCw,
  Sparkles,
  Trash2,
  X
} from 'lucide-react';
import { AiDayPlan, AiPlannedBlock } from '../types';

interface AiDayPlannerModalProps {
  isOpen: boolean;
  isGenerating: boolean;
  isAccepting: boolean;
  error: string;
  plan: AiDayPlan | null;
  onClose: () => void;
  onRegenerate: () => void;
  onChangeBlocks: (blocks: AiPlannedBlock[]) => void;
  onAccept: (blocks: AiPlannedBlock[]) => void;
}

export const AiDayPlannerModal: React.FC<AiDayPlannerModalProps> = ({
  isOpen,
  isGenerating,
  isAccepting,
  error,
  plan,
  onClose,
  onRegenerate,
  onChangeBlocks,
  onAccept
}) => {
  // Close on Escape for keyboard accessibility.
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  const updateBlock = (id: string, updates: Partial<AiPlannedBlock>) => {
    if (!plan) return;
    onChangeBlocks(plan.blocks.map((b) => (b.id === id ? { ...b, ...updates } : b)));
  };

  const removeBlock = (id: string) => {
    if (!plan) return;
    onChangeBlocks(plan.blocks.filter((b) => b.id !== id));
  };

  const addBlock = () => {
    if (!plan) return;
    onChangeBlocks([
      ...plan.blocks,
      {
        id: `manual-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        title: '',
        priority: 'medium',
        focusMinutes: 25,
        breakMinutes: 5,
        rationale: 'Added manually.'
      }
    ]);
  };

  const totalFocusMinutes = plan?.blocks.reduce((sum, b) => sum + (Number(b.focusMinutes) || 0), 0) ?? 0;
  const acceptableBlocks = plan?.blocks.filter((b) => b.title.trim().length > 0) ?? [];

  return (
    <AnimatePresence>
      {(isOpen || isGenerating) && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-label="AI day planner"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="absolute inset-0"
            onClick={onClose}
            aria-hidden="true"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 14 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            className="relative w-full max-w-2xl rounded-3xl border border-zinc-800 bg-zinc-900 shadow-2xl max-h-[90vh] flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between gap-3 border-b border-zinc-800 p-5 sm:p-6">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-violet-500/30 bg-violet-500/10">
                  <Sparkles className="h-5 w-5 text-violet-300" />
                </span>
                <div>
                  <h2 className="text-base sm:text-lg font-medium text-zinc-100">AI Day Planner</h2>
                  <p className="text-[11px] text-zinc-500">Gemini-prioritized focus blocks from your queue &amp; journal</p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                disabled={isAccepting}
                className="rounded-lg p-1.5 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition disabled:opacity-50"
                aria-label="Close AI day planner"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto no-scrollbar p-5 sm:p-6 space-y-4">
              {isGenerating && (
                <div className="flex flex-col items-center justify-center gap-3 py-12 text-center" role="status">
                  <Loader2 className="h-8 w-8 animate-spin text-violet-300" />
                  <p className="text-xs sm:text-sm text-zinc-400">
                    Analyzing today&apos;s tasks and journal entries…
                  </p>
                  <p className="text-[11px] text-zinc-600">This usually takes a few seconds.</p>
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

              {!isGenerating && plan && (
                <>
                  <div className="rounded-2xl border border-violet-900/40 bg-violet-950/20 px-4 py-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-violet-400/80">Today&apos;s Strategy</p>
                    <p className="mt-1 text-xs leading-relaxed text-zinc-300">{plan.overview}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] text-zinc-500">
                      <span className="flex items-center gap-1 rounded-full border border-zinc-800 bg-black/40 px-2.5 py-1">
                        <CalendarCheck className="h-3 w-3 text-violet-300" />
                        {plan.blocks.length} block{plan.blocks.length === 1 ? '' : 's'}
                      </span>
                      <span className="flex items-center gap-1 rounded-full border border-zinc-800 bg-black/40 px-2.5 py-1">
                        <Clock className="h-3 w-3 text-emerald-400" />
                        {totalFocusMinutes}m total focus
                      </span>
                      <span className="flex items-center gap-1 rounded-full border border-zinc-800 bg-black/40 px-2.5 py-1">
                        <Coffee className="h-3 w-3 text-zinc-400" />
                        Editable before accepting
                      </span>
                    </div>
                  </div>

                  {plan.blocks.length === 0 && (
                    <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/30 p-8 text-center text-xs text-zinc-500">
                      No blocks in this plan yet. Add one below or regenerate.
                    </div>
                  )}

                  <ul className="space-y-3">
                    <AnimatePresence initial={false}>
                      {plan.blocks.map((block, index) => (
                        <motion.li
                          key={block.id}
                          layout
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.97 }}
                          transition={{ duration: 0.18 }}
                          className="rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-3.5 sm:p-4"
                        >
                          <div className="grid gap-2.5 sm:grid-cols-12">
                            <input
                              type="text"
                              value={block.title}
                              onChange={(e) => updateBlock(block.id, { title: e.target.value })}
                              placeholder={`Block ${index + 1} title`}
                              aria-label={`Edit title for schedule block ${index + 1}`}
                              className="sm:col-span-7 rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs font-medium text-zinc-100 outline-none focus:border-zinc-600"
                            />
                            <select
                              value={block.priority}
                              onChange={(e) =>
                                updateBlock(block.id, { priority: e.target.value as AiPlannedBlock['priority'] })
                              }
                              aria-label={`Set priority for schedule block ${index + 1}`}
                              className="sm:col-span-2 rounded-xl border border-zinc-800 bg-zinc-950 px-2 py-2 text-xs text-zinc-200 outline-none focus:border-zinc-600 capitalize"
                            >
                              <option value="high">High</option>
                              <option value="medium">Medium</option>
                              <option value="low">Low</option>
                            </select>

                            <label className="sm:col-span-3 flex items-center justify-between gap-1.5 rounded-xl border border-zinc-800 bg-zinc-950 px-2.5 py-1.5">
                              <Clock className="h-3.5 w-3.5 shrink-0 text-emerald-400" aria-hidden="true" />
                              <input
                                type="number"
                                min={10}
                                max={120}
                                value={block.focusMinutes}
                                onChange={(e) =>
                                  updateBlock(block.id, {
                                    focusMinutes: Math.min(120, Math.max(10, Number(e.target.value) || 10))
                                  })
                                }
                                aria-label={`Focus minutes for schedule block ${index + 1}`}
                                className="w-full min-w-0 bg-transparent text-right text-xs text-zinc-100 outline-none"
                              />
                              <span className="shrink-0 text-[10px] text-zinc-500">min</span>
                            </label>
                          </div>

                          <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
                            <label className="flex items-center gap-1.5 rounded-lg border border-zinc-800/70 bg-black/30 px-2 py-1">
                              <Coffee className="h-3 w-3 text-zinc-500" aria-hidden="true" />
                              <input
                                type="number"
                                min={3}
                                max={30}
                                value={block.breakMinutes}
                                onChange={(e) =>
                                  updateBlock(block.id, {
                                    breakMinutes: Math.min(30, Math.max(3, Number(e.target.value) || 3))
                                  })
                                }
                                aria-label={`Break minutes after schedule block ${index + 1}`}
                                className="w-10 bg-transparent text-right text-[11px] text-zinc-300 outline-none"
                              />
                              <span className="text-[10px] text-zinc-500">min break</span>
                            </label>

                            {typeof block.startMinutesFromNow === 'number' && (
                              <span className="flex items-center gap-1 text-[10px] text-zinc-500">
                                <Clock className="h-3 w-3" aria-hidden="true" />
                                starts in ~{block.startMinutesFromNow}m
                              </span>
                            )}

                            <button
                              type="button"
                              onClick={() => removeBlock(block.id)}
                              className="ml-auto rounded-lg p-1.5 text-zinc-600 transition hover:bg-rose-950/40 hover:text-rose-400"
                              aria-label={`Remove schedule block ${index + 1}`}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>

                          {block.rationale && (
                            <p className="mt-2 text-[11px] italic leading-relaxed text-zinc-500">{block.rationale}</p>
                          )}
                        </motion.li>
                      ))}
                    </AnimatePresence>
                  </ul>

                  <button
                    type="button"
                    onClick={addBlock}
                    className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-zinc-700 bg-transparent px-3 py-2.5 text-xs font-medium text-zinc-400 transition hover:border-zinc-500 hover:text-zinc-200"
                    aria-label="Add a new focus block to the plan"
                  >
                    <Plus className="h-4 w-4" />
                    Add Block
                  </button>
                </>
              )}
            </div>

            {/* Footer */}
            {!isGenerating && plan && (
              <div className="flex flex-col-reverse gap-2.5 border-t border-zinc-800 p-5 sm:flex-row sm:items-center sm:justify-end sm:gap-3 sm:p-6">
                <button
                  type="button"
                  onClick={onRegenerate}
                  disabled={isAccepting}
                  className="flex items-center justify-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-xs font-medium text-zinc-400 transition hover:border-zinc-600 hover:text-zinc-200 disabled:opacity-50"
                  aria-label="Regenerate the AI day plan"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${isAccepting ? '' : ''}`} />
                  Regenerate
                </button>
                <button
                  type="button"
                  onClick={() => onAccept(acceptableBlocks)}
                  disabled={acceptableBlocks.length === 0 || isAccepting}
                  className="flex items-center justify-center gap-1.5 rounded-xl bg-emerald-500/15 px-4 py-2.5 text-xs font-semibold text-emerald-300 border border-emerald-500/30 transition hover:bg-emerald-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label={`Accept plan and add ${acceptableBlocks.length} tasks to the daily queue`}
                >
                  {isAccepting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CalendarCheck className="h-4 w-4" />
                  )}
                  Accept Plan · Add {acceptableBlocks.length} Task{acceptableBlocks.length === 1 ? '' : 's'}
                </button>
              </div>
            )}

            {!isGenerating && !plan && !error && (
              <div className="border-t border-zinc-800 p-5 sm:p-6">
                <button
                  type="button"
                  onClick={onRegenerate}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-500/15 px-4 py-2.5 text-xs font-semibold text-violet-200 border border-violet-500/30 transition hover:bg-violet-500/25"
                  aria-label="Generate an AI day plan"
                >
                  <Sparkles className="h-4 w-4" />
                  Generate My Day Plan
                </button>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
