import React from 'react';
import { Clock, Target, CheckSquare, Settings, BookOpen, Wifi, WifiOff, User as UserIcon } from 'lucide-react';
import { UserAuth } from '../types';
import { motion } from 'motion/react';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isOnline: boolean;
  userAuth: UserAuth | null;
  onOpenAuth: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  isOnline,
  userAuth,
  onOpenAuth
}) => {
  const tabs = [
    { id: 'clock', label: 'Clock', icon: Clock },
    { id: 'focus', label: 'Focus', icon: Target },
    { id: 'tasks', label: 'Tasks', icon: CheckSquare },
    { id: 'journal', label: 'Journal', icon: BookOpen },
    { id: 'settings', label: 'Settings', icon: Settings }
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-xl border-t border-zinc-800/50">
      <div className="max-w-7xl mx-auto px-4 pb-safe">
        <div className="flex items-center justify-between h-16">
          {/* Tabs */}
          <div className="flex items-center gap-1 flex-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              
              return (
                <motion.button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  whileTap={{ scale: 0.92 }}
                  className="relative flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-xl transition-colors"
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute inset-0 bg-zinc-800/60 rounded-xl"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                  <Icon
                    className={`relative z-10 w-5 h-5 transition-colors ${
                      isActive ? 'text-white' : 'text-zinc-500'
                    }`}
                    strokeWidth={isActive ? 2.5 : 2}
                  />
                  <span
                    className={`relative z-10 text-xs font-medium transition-colors ${
                      isActive ? 'text-white' : 'text-zinc-500'
                    }`}
                  >
                    {tab.label}
                  </span>
                </motion.button>
              );
            })}
          </div>

          {/* Status & User */}
          <div className="flex items-center gap-2 ml-2">
            {/* Online Status */}
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-zinc-900/50">
              {isOnline ? (
                <Wifi className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <WifiOff className="w-3.5 h-3.5 text-zinc-500" />
              )}
              <span className="text-xs text-zinc-400 hidden sm:inline">
                {isOnline ? 'Online' : 'Offline'}
              </span>
            </div>

            {/* User Button */}
            <motion.button
              onClick={onOpenAuth}
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-900/50 hover:bg-zinc-800/50 transition-colors"
            >
              <UserIcon className="w-4 h-4 text-zinc-400" />
              <span className="text-xs text-zinc-300 max-w-[80px] truncate">
                {userAuth ? (userAuth.isAnonymous ? 'Guest' : userAuth.displayName || userAuth.email || 'User') : 'Sign In'}
              </span>
            </motion.button>
          </div>
        </div>
      </div>
    </nav>
  );
};
