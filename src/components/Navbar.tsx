import React from 'react';
import { Clock, Target, Calendar, CheckSquare, Settings, Wifi, WifiOff, User as UserIcon, CalendarDays, Activity } from 'lucide-react';
import { UserAuth } from '../types';

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
    { id: 'clock', label: 'Clock & Exams', icon: Clock },
    { id: 'focus', label: 'Focus Space', icon: Target },
    { id: 'timetable', label: 'Timetable & GCal', icon: Calendar },
    { id: 'tasks', label: 'Daily Tasks', icon: CheckSquare },
    { id: 'journal', label: 'Journal', icon: Activity },
    { id: 'settings', label: 'Settings & Stats', icon: Settings }
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-zinc-800/80 bg-black/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 sm:gap-3 px-3 sm:px-4 py-2 lg:py-3">
        {/* Brand Logo / Title */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <div className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl bg-zinc-800 border border-zinc-700 text-zinc-100 shadow-inner">
            <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-zinc-100" />
          </div>
          <div>
            <span className="font-semibold text-sm sm:text-base tracking-tight text-zinc-100">FocusClock</span>
            <span className="ml-1.5 hidden rounded-md bg-zinc-800/80 px-1.5 py-0.5 text-[10px] font-medium tracking-wide text-zinc-400 sm:inline-block border border-zinc-700/50">
              PWA Sync
            </span>
          </div>
        </div>

        {/* Tab Navigation - Smooth Horizontal Scroll on Small Screens / Landscape */}
        <nav className="order-last md:order-none flex w-full md:w-auto items-center gap-1 rounded-full border border-zinc-800/80 bg-zinc-900/90 p-1 overflow-x-auto no-scrollbar scroll-smooth max-w-full">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`nav-tab-${tab.id}`}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 sm:gap-2 rounded-full px-2.5 sm:px-3.5 py-1 sm:py-1.5 text-[11px] sm:text-xs font-medium transition-all whitespace-nowrap shrink-0 ${
                  isActive
                    ? 'bg-zinc-100 text-zinc-950 shadow-sm'
                    : 'text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200'
                }`}
              >
                <Icon className={`h-3.5 w-3.5 ${isActive ? 'text-zinc-950' : 'text-zinc-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Right Info Badges & User Auth */}
        <div className="flex items-center gap-1.5 sm:gap-2 text-xs shrink-0">
          {/* Offline / Online indicator */}
          <div
            id="status-connectivity-badge"
            className={`flex items-center gap-1 sm:gap-1.5 rounded-full px-2 sm:px-2.5 py-0.5 sm:py-1 border transition-colors text-[11px] sm:text-xs ${
              isOnline
                ? 'border-emerald-900/40 bg-emerald-950/20 text-emerald-400'
                : 'border-amber-900/40 bg-amber-950/20 text-amber-300'
            }`}
            title={isOnline ? 'Online - Live Firestore Sync' : 'Offline Mode - Changes saved locally'}
          >
            {isOnline ? (
              <>
                <Wifi className="h-3 w-3 text-emerald-400" />
                <span className="hidden sm:inline">Online</span>
              </>
            ) : (
              <>
                <WifiOff className="h-3 w-3 text-amber-300" />
                <span>Offline</span>
              </>
            )}
          </div>

          {/* User Account / Anonymous Pill */}
          <button
            id="user-auth-button"
            onClick={onOpenAuth}
            className="flex items-center gap-1 sm:gap-1.5 rounded-full border border-zinc-800 bg-zinc-900 px-2.5 sm:px-3 py-0.5 sm:py-1 text-zinc-300 transition hover:border-zinc-700 hover:bg-zinc-800 hover:text-white text-[11px] sm:text-xs"
            title="Account & Sync Status"
          >
            <UserIcon className="h-3.5 w-3.5 text-zinc-400" />
            <span className="max-w-[80px] sm:max-w-[100px] truncate">
              {userAuth ? (userAuth.isAnonymous ? 'Guest Sync' : userAuth.displayName || userAuth.email || 'User') : 'Sign In'}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
};
