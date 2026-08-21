import React from 'react';
import { Clock, Target, CheckSquare, Settings, BookOpen, Wifi, WifiOff, User as UserIcon, Timer } from 'lucide-react';
import { UserAuth, DailyStats } from '../types';
import { motion } from 'motion/react';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isOnline: boolean;
  userAuth: UserAuth | null;
  onOpenAuth: () => void;
  todayStats?: DailyStats;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  isOnline,
  userAuth,
  onOpenAuth,
  todayStats
}) => {
  const tabs = [
    { id: 'focus', label: 'Focus', icon: Target, hint: 'Timer & tasks' },
    { id: 'clock', label: 'Clock', icon: Clock, hint: 'Time & exam' },
    { id: 'tasks', label: 'Tasks', icon: CheckSquare, hint: 'To-do queue' },
    { id: 'journal', label: 'Journal', icon: BookOpen, hint: 'Time log' },
    { id: 'settings', label: 'Settings', icon: Settings, hint: 'Preferences' }
  ];

  const focusMinutes = todayStats?.focusMinutes ?? 0;

  return (
    <>
      {/* ── Desktop / Tablet Sidebar (lg+) ─────────────────────── */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-64 flex-col border-r border-white/5 bg-zinc-950/60 backdrop-blur-xl z-40">
        <div className="px-6 pt-8 pb-6">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Timer className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="text-[15px] font-semibold text-white leading-tight">Focus Clock</div>
              <div className="text-[11px] text-zinc-500 leading-tight">Study & Time</div>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 space-y-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors ${
                  isActive ? 'text-white' : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="sidebarActive"
                    className="absolute inset-0 rounded-xl bg-white/10 ring-1 ring-white/10"
                    transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                  />
                )}
                <Icon className={`relative z-10 w-5 h-5 ${isActive ? 'text-indigo-300' : ''}`} strokeWidth={isActive ? 2.4 : 2} />
                <div className="relative z-10 flex-1">
                  <div className="text-sm font-medium">{tab.label}</div>
                </div>
              </button>
            );
          })}
        </nav>

        {/* Today mini-summary */}
        <div className="mx-3 mb-3 px-4 py-3 rounded-xl bg-white/5 border border-white/5">
          <div className="text-[11px] uppercase tracking-wider text-zinc-500 mb-1">Today</div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-semibold text-white tabular-nums">{focusMinutes}</span>
            <span className="text-xs text-zinc-500">min focused</span>
          </div>
          <div className="mt-2 h-1.5 rounded-full bg-white/10 overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-indigo-500 to-fuchsia-500"
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, (focusMinutes / 120) * 100)}%` }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            />
          </div>
        </div>

        {/* User / status */}
        <div className="px-3 pb-6">
          <button
            onClick={onOpenAuth}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 transition-colors text-left"
          >
            <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center">
              <UserIcon className="w-4 h-4 text-zinc-300" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm text-zinc-200 truncate">
                {userAuth ? (userAuth.isAnonymous ? 'Guest' : userAuth.displayName || userAuth.email || 'Account') : 'Sign In'}
              </div>
              <div className="flex items-center gap-1 text-[11px] text-zinc-500">
                {isOnline ? <Wifi className="w-3 h-3 text-emerald-400" /> : <WifiOff className="w-3 h-3" />}
                {isOnline ? 'Online' : 'Offline'}
              </div>
            </div>
          </button>
        </div>
      </aside>

      {/* ── Mobile Bottom Tab Bar (< lg) ───────────────────────── */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-zinc-950/80 backdrop-blur-2xl border-t border-white/5">
        <div className="grid grid-cols-5 px-1 pb-[env(safe-area-inset-bottom)]">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <motion.button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                whileTap={{ scale: 0.9 }}
                className="relative flex flex-col items-center justify-center gap-1 py-2.5"
              >
                {isActive && (
                  <motion.div
                    layoutId="mobileActive"
                    className="absolute top-1 bottom-1 left-1.5 right-1.5 rounded-xl bg-white/10"
                    transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                  />
                )}
                <Icon
                  className={`relative z-10 w-5 h-5 transition-colors ${isActive ? 'text-white' : 'text-zinc-500'}`}
                  strokeWidth={isActive ? 2.4 : 2}
                />
                <span className={`relative z-10 text-[10px] font-medium transition-colors ${isActive ? 'text-white' : 'text-zinc-500'}`}>
                  {tab.label}
                </span>
              </motion.button>
            );
          })}
        </div>
      </nav>
    </>
  );
};
