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
      completed: false
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
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });

  const priorityColors = {
    high: 'bg-red-500/10 text-red-400 border-red-500/20',
    medium: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    low: 'bg-blue-500/10 text-blue-400 border-blue-500/20'
  };

  return (
    <div className="min-h-screen bg-black text-zinc-100 pb-24">
      <div className="max-w-4xl mx-auto px-4 pt-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-white mb-2">Tasks</h1>
          <p className="text-sm text-zinc-500">
            {tasks.filter((t) => !t.completed).length} active · {tasks.filter((t) => t.completed).length} completed
          </p>
        </motion.div>

        {/* Add Task Form */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8"
        >
          <div className="bg-zinc-900/50 backdrop-blur-xl rounded-2xl p-6 border border-zinc-800/50">
            <div className="space-y-4">
              <div>
                <input
                  type="text"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
                  placeholder="Add a new task..."
                  className="w-full bg-zinc-800/50 border border-zinc-700/50 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-zinc-500 mb-2 font-medium">Estimate (min)</label>
                  <input
                    type="number"
                    value={newTaskEstimate}
                    onChange={(e) => setNewTaskEstimate(Number(e.target.value))}
                    min={5}
                    step={5}
                    className="w-full bg-zinc-800/50 border border-zinc-700/50 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-500 mb-2 font-medium">Priority</label>
                  <select
                    value={newTaskPriority}
                    onChange={(e) => setNewTaskPriority(e.target.value as 'high' | 'medium' | 'low')}
                    className="w-full bg-zinc-800/50 border border-zinc-700/50 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
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
                disabled={!newTaskTitle.trim()}
                className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-zinc-800 disabled:text-zinc-600 text-white font-medium py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Task
              </motion.button>
            </div>
          </div>
        </motion.section>

        {/* Filter */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mb-6"
        >
          <div className="flex items-center gap-1.5">
            {['all', 'high', 'medium', 'low'].map((p) => (
              <motion.button
                key={p}
                whileTap={{ scale: 0.95 }}
                onClick={() => setFilterPriority(p as any)}
                className={`rounded-full px-4 py-2 text-xs font-medium capitalize transition-all ${
                  filterPriority === p
                    ? 'bg-zinc-800 text-white'
                    : 'bg-zinc-900/50 text-zinc-500 hover:bg-zinc-900'
                }`}
              >
                {p}
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* Task List */}
        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {sortedTasks.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-zinc-900/50 backdrop-blur-xl rounded-2xl p-12 border border-zinc-800/50 text-center"
                >
                  <AlertCircle className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
                  <p className="text-zinc-500 text-sm">No tasks yet. Add one above to get started.</p>
                </motion.div>
              ) : (
                sortedTasks.map((task) => (
                  <motion.div
                    key={task.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -100 }}
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    className="bg-zinc-900/50 backdrop-blur-xl rounded-2xl p-4 border border-zinc-800/50"
                  >
                    <div className="flex items-start gap-3">
                      {/* Checkbox */}
                      <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={() => onToggleTask(task.id)}
                        className={`mt-0.5 w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
                          task.completed
                            ? 'bg-blue-500 border-blue-500'
                            : 'border-zinc-700 hover:border-zinc-600'
                        }`}
                      >
                        {task.completed && <Check className="w-4 h-4 text-white" />}
                      </motion.button>

                      {/* Task Content */}
                      <div className="flex-1 min-w-0">
                        <h3
                          className={`text-base font-medium mb-1 transition-all ${
                            task.completed ? 'line-through text-zinc-600' : 'text-white'
                          }`}
                        >
                          {task.title}
                        </h3>
                        <div className="flex items-center gap-3 text-xs text-zinc-500">
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>{task.estimatedMinutes}m</span>
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize border ${priorityColors[task.priority]}`}
                          >
                            {task.priority}
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1.5">
                        {!task.completed && (
                          <motion.button
                            whileTap={{ scale: 0.9 }}
                            onClick={() => onStartFocusForTask(task.title)}
                            className="p-2 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 transition-colors"
                            title="Start focus session"
                          >
                            <CheckSquare className="w-4 h-4" />
                          </motion.button>
                        )}
                        <a
                          href={createGCalLinkForTask(task)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 text-zinc-400 transition-colors"
                          title="Add to Google Calendar"
                        >
                          <CalendarPlus className="w-4 h-4" />
                        </a>
                        <motion.button
                          whileTap={{ scale: 0.9 }}
                          onClick={() => onRemoveTask(task.id)}
                          className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors"
                          title="Delete task"
                        >
                          <Trash2 className="w-4 h-4" />
                        </motion.button>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>
        </motion.section>
      </div>
    </div>
  );
};
