import React, { useState } from 'react';
import { CheckSquare, Plus, Trash2, CalendarPlus, Check, Clock, AlertCircle } from 'lucide-react';
import { TaskItem } from '../types';
import { createGCalLinkForTask } from '../lib/gcal';
import { motion, AnimatePresence } from 'motion/react';

interface TaskQueueProps {
  tasks: TaskItem[];
  onAddTask: (task: Omit<TaskItem, 'id' | 'userId' | 'createdAt'>) => void;
  onToggleTask: (id: string) => void;
  onRemoveTask: (id: string) => void;
  onStartFocusForTask: (taskTitle: string) => void;
}

export const TaskQueue: React.FC<TaskQueueProps> = ({
  tasks,
  onAddTask,
  onToggleTask,
  onRemoveTask,
  onStartFocusForTask
}) => {
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskEstimate, setNewTaskEstimate] = useState(25);
  const [newTaskPriority, setNewTaskPriority] = useState<'high' | 'medium' | 'low'>('medium');
  const [filterPriority, setFilterPriority] = useState<'all' | 'high' | 'medium' | 'low'>('all');

  const handleAddTask = () => {
    if (!newTaskTitle.trim()) return;
    onAddTask({
      title: newTaskTitle.trim(),
      estimatedMinutes: newTaskEstimate,
      priority: newTaskPriority,
      complete: false
    });
    setNewTaskTitle('');
    setNewTaskEstimate(25);
    setNewTaskPriority('medium');
  };

  const filteredTasks = tasks.filter((t) => {
    if (filterPriority === 'all') return true;
    return t.priority === filterPriority;
  });

  const sortedTasks = [...filteredTasks].sort((a, b) => {
    if (a.complete !== b.complete) return a.complete ? 1 : -1;
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });

  const priorityStyles = {
    high: 'bg-rose-500/10 text-rose-300 border-rose-500/20',
    medium: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
    low: 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20'
  };

  const isAddDisabled = !newTaskTitle.trim();

  return (
    <div className="w-full">
      <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 flex flex-wrap items-end justify-between gap-3"
        >
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Tasks</h1>
            <p className="mt-1 text-sm text-zinc-400">
              <span className="font-medium text-zinc-300 tabular-nums">
                {tasks.filter((t) => !t.complete).length}
              </span>{' '}
              active ·{' '}
              <span className="font-medium text-zinc-300 tabular-nums">
                {tasks.filter((t) => t.complete).length}
              </span>{' '}
              completed
            </p>
          </div>
        </motion.header>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
          {/* Add Task Form */}
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="lg:col-span-2"
          >
            <div className="glass card-shadow rounded-3xl p-5 sm:p-6">
              <div className="mb-4 flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-500/15 text-indigo-300">
                  <Plus className="h-4 w-4" />
                </span>
                <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-300">
                  New Task
                </h2>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-zinc-500">
                    Title
                  </label>
                  <input
                    type="text"
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
                    placeholder="What do you need to focus on?"
                    className="w-full rounded-2xl border border-white/5 bg-white/5 px-4 py-3 text-white placeholder-zinc-600 outline-none transition-all focus:border-indigo-400/40 focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-zinc-500">
                      Estimate (min)
                    </label>
                    <div className="relative">
                      <Clock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                      <input
                        type="number"
                        value={newTaskEstimate}
                        onChange={(e) => setNewTaskEstimate(Number(e.target.value))}
                        min={5}
                        step={5}
                        className="w-full rounded-2xl border border-white/5 bg-white/5 py-3 pl-9 pr-4 text-white tabular-nums outline-none transition-all focus:border-indigo-400/40 focus:ring-2 focus:ring-indigo-500/20"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-zinc-500">
                      Priority
                    </label>
                    <select
                      value={newTaskPriority}
                      onChange={(e) => setNewTaskPriority(e.target.value as 'high' | 'medium' | 'low')}
                      className="w-full appearance-none rounded-2xl border border-white/5 bg-white/5 px-4 py-3 text-white outline-none transition-all focus:border-indigo-400/40 focus:ring-2 focus:ring-indigo-500/20 [&>option]:bg-zinc-900"
                    >
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                    </select>
                  </div>
                </div>

                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={handleAddTask}
                  disabled={isAddDisabled}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-indigo-500 py-3 font-medium text-white shadow-lg shadow-indigo-500/20 transition-colors hover:bg-indigo-400 disabled:cursor-not-allowed disabled:bg-white/5 disabled:text-zinc-600 disabled:shadow-none"
                >
                  <Plus className="h-4 w-4" />
                  Add Task
                </motion.button>
              </div>
            </div>
          </motion.section>

          {/* Task List Column */}
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 }}
            className="lg:col-span-3"
          >
            {/* Filter Pills */}
            <div className="mb-4 flex flex-wrap items-center gap-2">
              {(['all', 'high', 'medium', 'low'] as const).map((p) => (
                <motion.button
                  key={p}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setFilterPriority(p)}
                  className={`rounded-full border px-4 py-1.5 text-xs font-medium capitalize transition-all ${
                    filterPriority === p
                      ? 'border-indigo-400/40 bg-indigo-500/15 text-indigo-200'
                      : 'border-white/5 bg-white/5 text-zinc-500 hover:bg-white/10 hover:text-zinc-300'
                  }`}
                >
                  {p}
                </motion.button>
              ))}
            </div>

            <div className="space-y-3">
              <AnimatePresence mode="popLayout">
                {sortedTasks.length === 0 ? (
                  <motion.div
                    key="empty"
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    className="glass card-shadow flex flex-col items-center justify-center rounded-3xl px-6 py-14 text-center"
                  >
                    <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5">
                      <AlertCircle className="h-7 w-7 text-zinc-600" />
                    </span>
                    <p className="text-sm text-zinc-400">No tasks yet.</p>
                    <p className="mt-1 text-xs text-zinc-600">
                      Add one above to start focusing.
                    </p>
                  </motion.div>
                ) : (
                  sortedTasks.map((task) => (
                    <motion.div
                      key={task.id}
                      layout
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -60 }}
                      transition={{ type: 'spring', stiffness: 360, damping: 32 }}
                      className="glass card-shadow group flex items-start gap-3 rounded-2xl p-4 transition-colors hover:bg-white/[0.06]"
                    >
                      {/* Checkbox */}
                      <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={() => onToggleTask(task.id)}
                        aria-label={task.complete ? 'Mark as incomplete' : 'Mark as complete'}
                        className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border-2 transition-all ${
                          task.complete
                            ? 'border-emerald-400 bg-emerald-500'
                            : 'border-white/15 hover:border-indigo-400/60'
                        }`}
                      >
                        {task.complete && <Check className="h-4 w-4 text-white" />}
                      </motion.button>

                      {/* Task Content */}
                      <div className="min-w-0 flex-1">
                        <h3
                          className={`truncate text-base font-medium transition-all ${
                            task.complete ? 'text-zinc-500 line-through' : 'text-white'
                          }`}
                        >
                          {task.title}
                        </h3>
                        <div className="mt-1.5 flex items-center gap-2.5 text-xs text-zinc-500">
                          <span className="flex items-center gap-1 tabular-nums">
                            <Clock className="h-3 w-3" />
                            {task.estimatedMinutes}m
                          </span>
                          <span
                            className={`rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${
                              priorityStyles[task.priority]
                            }`}
                          >
                            {task.priority}
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex shrink-0 items-center gap-1.5">
                        {!task.complete && (
                          <motion.button
                            whileTap={{ scale: 0.9 }}
                            onClick={() => onStartFocusForTask(task.title)}
                            title="Start focus session"
                            aria-label="Start focus session"
                            className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-300 transition-colors hover:bg-indigo-500/20"
                          >
                            <CheckSquare className="h-4 w-4" />
                          </motion.button>
                        )}
                        <a
                          href={createGCalLinkForTask(task)}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Add to Google Calendar"
                          aria-label="Add to Google Calendar"
                          className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 text-zinc-400 transition-colors hover:bg-white/10 hover:text-zinc-200"
                        >
                          <CalendarPlus className="h-4 w-4" />
                        </a>
                        <motion.button
                          whileTap={{ scale: 0.9 }}
                          onClick={() => onRemoveTask(task.id)}
                          title="Delete task"
                          aria-label="Delete task"
                          className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-500/10 text-rose-400 transition-colors hover:bg-rose-500/20"
                        >
                          <Trash2 className="h-4 w-4" />
                        </motion.button>
                      </div>
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </div>
          </motion.section>
        </div>
      </div>
    </div>
  );
};
