import React, { useState } from 'react';
import { CheckSquare, Plus, Trash2, CalendarPlus, Check, Clock, AlertCircle } from 'lucide-react';
import { TaskItem } from '../types';
import { createGCalLinkForTask } from '../lib/gcal';

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
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState<'high' | 'medium' | 'low'>('medium');
  const [estimatedMinutes, setEstimatedMinutes] = useState<number>(30);

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

  return (
    <div className="mx-auto w-full max-w-5xl animate-in fade-in zoom-in-95 duration-500">
      {/* Header Banner */}
      <div className="mb-6 rounded-3xl border border-zinc-800/80 bg-zinc-900/55 p-6 backdrop-blur-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <CheckSquare className="h-6 w-6 text-emerald-400" />
            <h1 className="text-xl font-semibold text-zinc-100">Daily Study Task Queue</h1>
          </div>
          <p className="mt-1 text-xs text-zinc-400">
            Organize daily tasks by priority, sync completed items to Firestore, and schedule on Google Calendar.
          </p>
        </div>

        <div className="flex items-center gap-2 rounded-full border border-zinc-800 bg-black/40 px-4 py-2 text-xs">
          <span className="text-zinc-400">Progress:</span>
          <span className="font-semibold text-zinc-100">
            {completedCount} / {tasks.length} Completed
          </span>
        </div>
      </div>

      {/* Task Creation Form */}
      <section className="mb-8 rounded-3xl border border-zinc-800/80 bg-zinc-900/55 p-6 backdrop-blur-sm">
        <h2 className="text-sm font-medium text-zinc-200 mb-4">Add Daily Study Task</h2>
        <form onSubmit={handleCreateTask} className="grid gap-3 sm:grid-cols-12">
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
      <div className="mb-4 flex items-center justify-between gap-2 border-b border-zinc-800/60 pb-3">
        <div className="flex items-center gap-1">
          {['all', 'high', 'medium', 'low'].map((p) => (
            <button
              key={p}
              onClick={() => setFilterPriority(p)}
              className={`rounded-full px-3.5 py-1 text-xs font-medium capitalize transition ${
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
            const gcalUrl = createGCalLinkForTask(task);
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

                  <a
                    href={gcalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 rounded-lg border border-indigo-900/40 bg-indigo-950/30 px-3 py-1.5 text-xs text-indigo-300 hover:bg-indigo-950/60 transition"
                    title="Add to Google Calendar"
                  >
                    <CalendarPlus className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Calendar</span>
                  </a>

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
    </div>
  );
};
