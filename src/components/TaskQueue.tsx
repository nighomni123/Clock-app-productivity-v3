import React, { useRef, useState } from 'react';
import { CheckSquare, Plus, Trash2, Check, Clock, Upload, FileSpreadsheet, X, Download, AlertCircle, Loader2, Play, Sparkles } from 'lucide-react';
import { TaskItem, ActivityLog, AiDayPlan } from '../types';
import { IMPORT_ACCEPT, IMPORT_COLUMNS, SAMPLE_CSV, parseTasksFile } from '../lib/taskImport';
import { requestDayPlan } from '../lib/aiClient';
import { AiDayPlannerModal } from './AiDayPlannerModal';

interface TaskQueueProps {
  tasks: TaskItem[];
  activityLogs: ActivityLog[];
  defaultFocusMinutes: number;
  defaultBreakMinutes: number;
  onAddTask: (task: Omit<TaskItem, 'id' | 'userId' | 'createdAt'>) => void;
  onToggleTask: (id: string) => void;
  onRemoveTask: (id: string) => void;
  onImportTasks: (tasks: Array<Omit<TaskItem, 'id' | 'userId' | 'createdAt'>>) => Promise<number>;
  onStartFocusForTask: (taskTitle: string) => void;
}

export const TaskQueue: React.FC<TaskQueueProps> = ({
  tasks,
  activityLogs,
  defaultFocusMinutes,
  defaultBreakMinutes,
  onAddTask,
  onToggleTask,
  onRemoveTask,
  onImportTasks,
  onStartFocusForTask
}) => {
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState<'high' | 'medium' | 'low'>('medium');
  const [estimatedMinutes, setEstimatedMinutes] = useState<number>(30);

  // Import dialog state
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importStatus, setImportStatus] = useState<{ type: 'idle' | 'success' | 'error'; message: string }>({
    type: 'idle',
    message: ''
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // AI Day Planner (Feature 1) state
  const [isPlanOpen, setIsPlanOpen] = useState(false);
  const [isPlanGenerating, setIsPlanGenerating] = useState(false);
  const [isAcceptingPlan, setIsAcceptingPlan] = useState(false);
  const [planError, setPlanError] = useState('');
  const [dayPlan, setDayPlan] = useState<AiDayPlan | null>(null);

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    onAddTask({
      title: title.trim(),
      complete: false,
      dueDate: dueDate || undefined,
      priority,
      estimatedMinutes
    });

    setTitle('');
    setDueDate('');
  };

  const filteredTasks = tasks.filter((t) => {
    if (filterPriority === 'all') return true;
    return t.priority === filterPriority;
  });

  const completedCount = tasks.filter((t) => t.complete).length;

  const openImportDialog = () => {
    setImportStatus({ type: 'idle', message: '' });
    setIsImportOpen(true);
  };

  const handleImportFile = async (file: File | undefined) => {
    if (!file) return;
    setIsImporting(true);
    setImportStatus({ type: 'idle', message: '' });
    try {
      const { drafts, skippedRows } = await parseTasksFile(file);
      const added = await onImportTasks(drafts);
      if (added >= drafts.length) {
        setImportStatus({
          type: 'success',
          message: `Imported ${added} task${added === 1 ? '' : 's'}${
            skippedRows > 0 ? `, skipped ${skippedRows} invalid row${skippedRows === 1 ? '' : 's'}` : ''
          }.`
        });
      } else {
        setImportStatus({
          type: 'error',
          message:
            added > 0
              ? `Only ${added} of ${drafts.length} tasks could be saved. Check your connection and sign-in status, then retry.`
              : 'Import failed — no tasks could be saved. Check your connection and sign-in status, then retry.'
        });
      }
    } catch (err) {
      setImportStatus({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to import the file. Please check the format and try again.'
      });
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const downloadSampleCsv = () => {
    const blob = new Blob([SAMPLE_CSV], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'daily_tasks_sample.csv';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  // --- AI Day Planner (Feature 1) -----------------------------------------

  const handleGeneratePlan = async () => {
    setIsPlanGenerating(true);
    setPlanError('');
    setIsPlanOpen(true);
    try {
      // Send today's queue + recent journal entries to the server-side Gemini
      // endpoint; the API key never leaves the Express server.
      const plan = await requestDayPlan(tasks, activityLogs, {
        defaultFocusMinutes,
        defaultBreakMinutes
      });
      setDayPlan({
        ...plan,
        blocks: plan.blocks.map((b, i) => ({ ...b, id: `plan-${Date.now()}-${i}` }))
      });
    } catch (err) {
      setDayPlan(null);
      setPlanError(err instanceof Error ? err.message : 'Failed to generate a day plan. Please try again.');
    } finally {
      setIsPlanGenerating(false);
    }
  };

  const handleAcceptPlan = async (blocks: AiDayPlan['blocks']) => {
    const drafts = blocks
      .filter((b) => b.title.trim().length > 0)
      .map((b) => ({
        title: b.title.trim(),
        complete: false as const,
        priority: b.priority,
        estimatedMinutes: b.focusMinutes
      }));
    if (!drafts.length) return;

    setIsAcceptingPlan(true);
    try {
      const added = await onImportTasks(drafts);
      if (added > 0) {
        setImportStatus({
          type: 'success',
          message: `AI plan accepted — added ${added} task${added === 1 ? '' : 's'} to your daily queue.`
        });
        setIsPlanOpen(false);
        setDayPlan(null);
        setPlanError('');
      } else {
        setPlanError('Could not save the plan to your queue. Check your connection and sign-in status, then retry.');
      }
    } finally {
      setIsAcceptingPlan(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-5xl animate-in fade-in zoom-in-95 duration-500">
      {/* Header Banner */}
      <div className="mb-4 sm:mb-6 rounded-3xl border border-zinc-800/80 bg-zinc-900/55 p-4 sm:p-6 backdrop-blur-sm flex flex-wrap items-center justify-between gap-3 sm:gap-4">
        <div>
          <div className="flex items-center gap-2">
            <CheckSquare className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-400 shrink-0" />
            <h1 className="text-lg sm:text-xl font-semibold text-zinc-100">Daily Study Task Queue</h1>
          </div>
          <p className="mt-1 text-xs text-zinc-400">
            Organize daily tasks by priority, sync completed items to Firestore, and jump straight into a focus session.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {planError && !isPlanOpen && (
            <p className="w-full rounded-xl border border-rose-900/50 bg-rose-950/30 px-3 py-2 text-[11px] text-rose-300" role="alert">
              {planError}
            </p>
          )}
          <button
            type="button"
            onClick={handleGeneratePlan}
            disabled={isPlanGenerating || tasks.length === 0}
            title="Ask Gemini to turn today's task queue and recent journal entries into a focused schedule"
            aria-label="Generate an AI-prioritized day plan from today's tasks and recent journal entries"
            className="flex items-center gap-1.5 rounded-full border border-violet-500/30 bg-violet-500/10 px-3.5 py-1.5 sm:px-4 sm:py-2 text-xs font-medium text-violet-300 transition hover:bg-violet-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPlanGenerating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            <span>{isPlanGenerating ? 'Planning…' : 'Plan My Day'}</span>
          </button>
          <div className="flex items-center gap-2 rounded-full border border-zinc-800 bg-black/40 px-3.5 py-1.5 sm:px-4 sm:py-2 text-xs">
            <span className="text-zinc-400">Progress:</span>
            <span className="font-semibold text-zinc-100">
              {completedCount} / {tasks.length} Completed
            </span>
          </div>
        </div>
      </div>

      {/* Task Creation Form */}
      <section className="mb-6 sm:mb-8 rounded-3xl border border-zinc-800/80 bg-zinc-900/55 p-4 sm:p-6 backdrop-blur-sm">
        <div className="mb-3 sm:mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-xs sm:text-sm font-medium text-zinc-200">Add Daily Study Task</h2>
          <button
            type="button"
            onClick={openImportDialog}
            className="flex items-center gap-1.5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-400 hover:bg-emerald-500/20 transition"
          >
            <Upload className="h-3.5 w-3.5" />
            <span>Import CSV / Excel</span>
          </button>
        </div>
        <form onSubmit={handleCreateTask} className="grid gap-2.5 sm:grid-cols-12">
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Task title (e.g., Read Physics Chapter 3)"
            className="sm:col-span-5 rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 text-xs text-zinc-100 outline-none focus:border-zinc-600"
          />

          <input
            type="datetime-local"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="sm:col-span-3 rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 text-xs text-zinc-100 outline-none focus:border-zinc-600"
          />

          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value as 'high' | 'medium' | 'low')}
            className="sm:col-span-2 rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-xs text-zinc-100 outline-none focus:border-zinc-600"
          >
            <option value="high">High Priority</option>
            <option value="medium">Medium Priority</option>
            <option value="low">Low Priority</option>
          </select>

          <button
            type="submit"
            className="sm:col-span-2 flex items-center justify-center gap-1.5 rounded-xl bg-zinc-100 py-2.5 px-4 text-xs font-semibold text-zinc-950 hover:bg-white shadow transition"
          >
            <Plus className="h-4 w-4" />
            <span>Add Task</span>
          </button>
        </form>
      </section>

      {/* Filter Tabs */}
      <div className="mb-4 flex items-center justify-between gap-2 border-b border-zinc-800/60 pb-3 overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-1.5 shrink-0">
          {['all', 'high', 'medium', 'low'].map((p) => (
            <button
              key={p}
              onClick={() => setFilterPriority(p)}
              className={`rounded-full px-3 py-1 text-xs font-medium capitalize transition whitespace-nowrap ${
                filterPriority === p
                  ? 'bg-zinc-100 text-zinc-950'
                  : 'text-zinc-500 hover:bg-zinc-800/50 hover:text-zinc-200'
              }`}
            >
              {p === 'all' ? 'All Tasks' : `${p} Priority`}
            </button>
          ))}
        </div>
      </div>

      {/* Task List */}
      <div className="space-y-3">
        {filteredTasks.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-zinc-800 bg-zinc-900/20 p-12 text-center text-xs text-zinc-500">
            No study tasks found matching the filter.
          </div>
        ) : (
          filteredTasks.map((task) => {
            return (
              <div
                key={task.id}
                className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-4 backdrop-blur-sm transition hover:border-zinc-700 ${
                  task.complete ? 'opacity-60' : ''
                }`}
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <button
                    onClick={() => onToggleTask(task.id)}
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition ${
                      task.complete ? 'bg-zinc-200 border-zinc-200' : 'border-zinc-700 hover:border-zinc-500'
                    }`}
                  >
                    {task.complete && <Check className="h-3.5 w-3.5 text-zinc-950 stroke-[3]" />}
                  </button>

                  <div>
                    <h3
                      className={`text-sm font-medium ${
                        task.complete ? 'line-through text-zinc-500' : 'text-zinc-100'
                      }`}
                    >
                      {task.title}
                    </h3>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] text-zinc-500">
                      <span
                        className={`rounded-md px-1.5 py-0.2 font-medium uppercase tracking-wider ${
                          task.priority === 'high'
                            ? 'bg-rose-950/60 text-rose-300 border border-rose-900/50'
                            : task.priority === 'medium'
                            ? 'bg-amber-950/60 text-amber-300 border border-amber-900/50'
                            : 'bg-zinc-800 text-zinc-400'
                        }`}
                      >
                        {task.priority} Priority
                      </span>

                      {task.dueDate && (
                        <span className="flex items-center gap-1 text-zinc-400">
                          <Clock className="h-3 w-3" />
                          <span>{new Date(task.dueDate).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {!task.complete && (
                    <button
                      onClick={() => onStartFocusForTask(task.title)}
                      className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs text-zinc-200 hover:bg-zinc-700 hover:text-white transition"
                      title="Set as Focus Goal & Start Timer"
                    >
                      Start Focus
                    </button>
                  )}

                  <button
                    onClick={() => onRemoveTask(task.id)}
                    className="p-1.5 text-zinc-500 hover:text-red-400 transition"
                    title="Delete Task"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* AI Day Planner Modal (Feature 1) */}
      <AiDayPlannerModal
        isOpen={isPlanOpen}
        isGenerating={isPlanGenerating}
        isAccepting={isAcceptingPlan}
        error={planError}
        plan={dayPlan}
        onClose={() => {
          if (isAcceptingPlan || isPlanGenerating) return;
          setIsPlanOpen(false);
          setPlanError('');
        }}
        onRegenerate={handleGeneratePlan}
        onChangeBlocks={(blocks) =>
          setDayPlan((prev) => (prev ? { ...prev, blocks } : prev))
        }
        onAccept={handleAcceptPlan}
      />

      {/* Import CSV / Excel Dialog */}
      {isImportOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-label="Import tasks from CSV or Excel"
        >
          <div className="w-full max-w-lg rounded-3xl border border-zinc-800 bg-zinc-900 p-5 sm:p-6 shadow-2xl space-y-4 sm:space-y-5 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto no-scrollbar">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h2 className="text-base sm:text-lg font-medium text-zinc-100 flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-emerald-400" />
                Import Daily Tasks
              </h2>
              <button
                onClick={() => setIsImportOpen(false)}
                className="text-zinc-500 hover:text-zinc-300 transition p-1"
                aria-label="Close import dialog"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs text-zinc-400 leading-relaxed">
              Upload a <strong className="text-zinc-200">.csv</strong>, <strong className="text-zinc-200">.xlsx</strong> or{' '}
              <strong className="text-zinc-200">.xls</strong> file. For Excel files the first sheet is read. The first row must be a header row with at least a{' '}
              <code className="rounded bg-zinc-950 border border-zinc-800 px-1 py-0.5 text-[10px] text-emerald-300">title</code> column.
            </p>

            {/* CSV Format Specification */}
            <div className="rounded-2xl border border-zinc-800 bg-black/40 p-3.5 sm:p-4 space-y-2.5">
              <span className="block text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Required CSV format (comma-separated)</span>
              <pre className="rounded-xl bg-zinc-950 border border-zinc-800 p-3 text-[10px] sm:text-[11px] leading-relaxed text-zinc-300 overflow-x-auto no-scrollbar">{SAMPLE_CSV}</pre>
              <ul className="space-y-1.5 text-[11px] text-zinc-400">
                {IMPORT_COLUMNS.map((col) => (
                  <li key={col.key} className="flex flex-wrap items-baseline gap-x-1.5">
                    <code className="rounded bg-zinc-950 border border-zinc-800 px-1 py-0.5 text-[10px] text-emerald-300">{col.key}</code>
                    {col.required ? (
                      <span className="text-rose-400/90 font-medium">required</span>
                    ) : (
                      <span className="text-zinc-600">optional —</span>
                    )}
                    <span>{col.description}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* File Picker */}
            <input
              ref={fileInputRef}
              type="file"
              accept={IMPORT_ACCEPT}
              className="hidden"
              onChange={(e) => handleImportFile(e.target.files?.[0])}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isImporting}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 py-2.5 text-xs sm:text-sm font-medium hover:bg-emerald-500/20 transition disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isImporting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Importing…</span>
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  <span>Choose File & Import</span>
                </>
              )}
            </button>

            {importStatus.type !== 'idle' && (
              <div
                className={`flex items-start gap-2 rounded-xl border px-3 py-2.5 text-xs ${
                  importStatus.type === 'success'
                    ? 'border-emerald-900/50 bg-emerald-950/30 text-emerald-300'
                    : 'border-rose-900/50 bg-rose-950/30 text-rose-300'
                }`}
                role="status"
              >
                {importStatus.type === 'success' ? (
                  <Check className="h-4 w-4 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                )}
                <span>{importStatus.message}</span>
              </div>
            )}

            <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 pt-1">
              <button
                type="button"
                onClick={downloadSampleCsv}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:border-zinc-700 transition"
              >
                <Download className="h-3.5 w-3.5" />
                Download Sample CSV
              </button>
              <button
                type="button"
                onClick={() => setIsImportOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-400 hover:text-zinc-200 transition"
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
