import React from 'react';
import { Trophy, Flame, Target, Award } from 'lucide-react';
import { ACHIEVEMENTS } from '../hooks/useStreakTracker';

interface StreakTrackerProps {
  currentStreak: number;
  longestStreak: number;
  unlockedAchievements: string[];
  totalFocusMinutes: number;
  totalSessions: number;
}

export const StreakTracker: React.FC<StreakTrackerProps> = ({
  currentStreak,
  longestStreak,
  unlockedAchievements,
  totalFocusMinutes,
  totalSessions
}) => {
  const achievements = ACHIEVEMENTS.map(a => ({
    ...a,
    unlocked: unlockedAchievements.includes(a.id)
  }));

  const unlockedCount = unlockedAchievements.length;
  const totalCount = achievements.length;
  const progressPercent = Math.round((unlockedCount / totalCount) * 100);

  return (
    <div className="space-y-6">
      {/* Streak Display */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gradient-to-br from-orange-500/20 to-red-500/20 rounded-xl p-4 border border-orange-500/30">
          <div className="flex items-center gap-2 mb-2">
            <Flame className="w-5 h-5 text-orange-500" />
            <span className="text-sm font-medium text-orange-300">Current Streak</span>
          </div>
          <div className="text-3xl font-bold text-orange-400">{currentStreak}</div>
          <div className="text-xs text-orange-400/70">days</div>
        </div>
        
        <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-xl p-4 border border-purple-500/30">
          <div className="flex items-center gap-2 mb-2">
            <Award className="w-5 h-5 text-purple-500" />
            <span className="text-sm font-medium text-purple-300">Longest Streak</span>
          </div>
          <div className="text-3xl font-bold text-purple-400">{longestStreak}</div>
          <div className="text-xs text-purple-400/70">days</div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-zinc-800/50 rounded-lg p-3">
          <div className="text-xs text-zinc-400 mb-1">Total Focus Time</div>
          <div className="text-lg font-semibold text-zinc-200">
            {Math.floor(totalFocusMinutes / 60)}h {totalFocusMinutes % 60}m
          </div>
        </div>
        <div className="bg-zinc-800/50 rounded-lg p-3">
          <div className="text-xs text-zinc-400 mb-1">Sessions Completed</div>
          <div className="text-lg font-semibold text-zinc-200">{totalSessions}</div>
        </div>
      </div>

      {/* Achievements Progress */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-500" />
            <span className="text-sm font-medium text-zinc-300">Achievements</span>
          </div>
          <span className="text-xs text-zinc-400">{unlockedCount}/{totalCount}</span>
        </div>
        
        {/* Progress Bar */}
        <div className="h-2 bg-zinc-800 rounded-full overflow-hidden mb-4">
          <div 
            className="h-full bg-gradient-to-r from-yellow-500 to-amber-500 transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Achievement Grid */}
        <div className="grid grid-cols-4 gap-2">
          {achievements.map(achievement => (
            <div
              key={achievement.id}
              className={`aspect-square rounded-lg flex flex-col items-center justify-center p-2 transition-all ${
                achievement.unlocked
                  ? 'bg-gradient-to-br from-yellow-500/20 to-amber-500/20 border border-yellow-500/40'
                  : 'bg-zinc-800/30 border border-zinc-700/50 opacity-50'
              }`}
              title={`${achievement.name}: ${achievement.description}`}
            >
              <div className="text-2xl mb-1">{achievement.icon}</div>
              {achievement.unlocked && (
                <div className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
              )}
            </div>
          ))}
        </div>

        {/* Unlocked Achievements List */}
        {unlockedCount > 0 && (
          <div className="mt-4 space-y-2">
            <div className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Unlocked</div>
            {achievements
              .filter(a => a.unlocked)
              .map(achievement => (
                <div
                  key={achievement.id}
                  className="flex items-center gap-3 bg-zinc-800/30 rounded-lg p-2"
                >
                  <span className="text-xl">{achievement.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-zinc-200">{achievement.name}</div>
                    <div className="text-xs text-zinc-400 truncate">{achievement.description}</div>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
};
