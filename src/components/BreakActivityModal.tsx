import React, { useState } from 'react';
import { X } from 'lucide-react';
import { BreakActivitySuggestion } from '../types';
import { BREAK_ACTIVITIES, getSuggestedActivitiesForBreakDuration } from '../lib/breakActivities';

interface BreakActivityModalProps {
  isOpen: boolean;
  onClose: () => void;
  breakDurationMinutes: number;
}

export const BreakActivityModal: React.FC<BreakActivityModalProps> = ({
  isOpen,
  onClose,
  breakDurationMinutes
}) => {
  const [selectedCategory, setSelectedCategory] = useState<BreakActivitySuggestion['category'] | 'all'>('all');

  if (!isOpen) return null;

  const suggestedActivities = getSuggestedActivitiesForBreakDuration(breakDurationMinutes);
  
  const categories: Array<{ id: BreakActivitySuggestion['category'] | 'all'; label: string; icon: string }> = [
    { id: 'all', label: 'All', icon: '🎯' },
    { id: 'stretch', label: 'Stretch', icon: '🧘' },
    { id: 'hydrate', label: 'Hydrate', icon: '💧' },
    { id: 'breathe', label: 'Breathe', icon: '🌬️' },
    { id: 'walk', label: 'Walk', icon: '🚶' },
    { id: 'rest', label: 'Rest', icon: '😌' }
  ];

  const filteredActivities = selectedCategory === 'all'
    ? BREAK_ACTIVITIES
    : BREAK_ACTIVITIES.filter(a => a.category === selectedCategory);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-zinc-900 rounded-2xl w-full max-w-lg max-h-[80vh] overflow-hidden border border-zinc-700 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-700">
          <div>
            <h2 className="text-lg font-semibold text-zinc-100">Break Activity Suggestions</h2>
            <p className="text-xs text-zinc-400">Make the most of your {breakDurationMinutes}-minute break</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
            aria-label="Close break activity suggestions"
          >
            <X className="w-5 h-5 text-zinc-400" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto p-4 space-y-4">
          {/* Suggested Activities */}
          {suggestedActivities.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-zinc-300 mb-2 flex items-center gap-2">
                <span>✨</span> Recommended for you
              </h3>
              <div className="space-y-2">
                {suggestedActivities.map(activity => (
                  <div
                    key={activity.id}
                    className="bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/30 rounded-lg p-3"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="font-medium text-zinc-100">{activity.title}</div>
                        <div className="text-xs text-zinc-400 mt-1">{activity.description}</div>
                        <div className="text-xs text-emerald-400 mt-2">{activity.durationMinutes} min • {activity.category}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Category Filter */}
          <div>
            <h3 className="text-sm font-medium text-zinc-300 mb-2">Browse by Category</h3>
            <div className="flex flex-wrap gap-2">
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                    selectedCategory === cat.id
                      ? 'bg-zinc-100 text-zinc-900'
                      : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                  }`}
                >
                  {cat.icon} {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* All Activities List */}
          <div>
            <h3 className="text-sm font-medium text-zinc-300 mb-2">
              {selectedCategory === 'all' ? 'All Activities' : `${selectedCategory.charAt(0).toUpperCase() + selectedCategory.slice(1)} Activities`}
            </h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {filteredActivities.map(activity => (
                <div
                  key={activity.id}
                  className="bg-zinc-800/50 rounded-lg p-3 border border-zinc-700/50"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="font-medium text-zinc-100">{activity.title}</div>
                      <div className="text-xs text-zinc-400 mt-1">{activity.description}</div>
                      <div className="text-xs text-zinc-500 mt-2">{activity.durationMinutes} minutes</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Tip */}
        <div className="p-4 border-t border-zinc-700 bg-zinc-800/30">
          <p className="text-xs text-zinc-400 text-center">
            💡 Taking regular breaks improves focus and productivity. Step away from screens when possible!
          </p>
        </div>
      </div>
    </div>
  );
};
