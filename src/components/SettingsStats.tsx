import React, { useState } from 'react';
import { Settings, Volume2, Target, Bell, User, Cloud, HardDrive, Play, Key } from 'lucide-react';
import { UserSettings, DailyTarget, DailyStats, UserAuth } from '../types';
import { SOUND_NAMES, playSound } from '../lib/audio';
import { requestNotificationPermission, getNotificationPermissionStatus } from '../lib/notifications';

interface SettingsStatsProps {
  settings: UserSettings;
  onUpdateSettings: (settings: UserSettings) => void;
  dailyTarget: DailyTarget;
  onUpdateDailyTarget: (target: DailyTarget) => void;
  todayStats: DailyStats;
  userAuth: UserAuth | null;
  onOpenAuth: () => void;
  isOnline: boolean;
  syncCode: string | null;
  onGenerateSyncCode: () => Promise<void>;
  onJoinSyncCode: (code: string) => Promise<boolean>;
  onDisconnectSyncCode: () => void;
}

export const SettingsStats: React.FC<SettingsStatsProps> = ({
  settings,
  onUpdateSettings,
  dailyTarget,
  onUpdateDailyTarget,
  todayStats,
  userAuth,
  onOpenAuth,
  isOnline,
  syncCode,
  onGenerateSyncCode,
  onJoinSyncCode,
  onDisconnectSyncCode
}) => {
  const notifStatus = getNotificationPermissionStatus();
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [joinError, setJoinError] = useState('');

  const formatSyncCodeInput = (val: string) => {
    const v = val.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    if (v.length <= 3) return v;
    if (v.length <= 6) return `${v.slice(0,3)}-${v.slice(3)}`;
    return `${v.slice(0,3)}-${v.slice(3,6)}-${v.slice(6,9)}`;
  };

  const handleJoinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (joinCodeInput.length !== 11) {
      setJoinError('Code must be 9 characters (e.g. ABC-DEF-GHI)');
      return;
    }
    setJoinError('');
    const success = await onJoinSyncCode(joinCodeInput);
    if (!success) {
      setJoinError('Sync code not found. Please check and try again.');
    } else {
      setJoinCodeInput('');
    }
  };

  const handleToggleNotifications = async () => {
    if (!settings.enableNotifications) {
      const granted = await requestNotificationPermission();
      if (granted) {
        onUpdateSettings({ ...settings, enableNotifications: true });
      } else {
        alert('Browser notification permissions were not granted. Check browser settings.');
      }
    } else {
      onUpdateSettings({ ...settings, enableNotifications: false });
    }
  };

  const focusPercent = Math.min(100, Math.round((todayStats.focusMinutes / (dailyTarget.minutes || 1)) * 100));
  const sessionPercent = Math.min(100, Math.round((todayStats.sessions / (dailyTarget.sessions || 1)) * 100));
  const distractionPercent = Math.min(
    100,
    Math.round((todayStats.distractions / (dailyTarget.maxDistractions || 1)) * 100)
  );

  return (
    <div className="mx-auto w-full max-w-4xl space-y-8 animate-in fade-in zoom-in-95 duration-500">
      {/* Account & Firestore Sync Banner */}
      <section className="rounded-3xl border border-zinc-800/80 bg-zinc-900/55 p-6 backdrop-blur-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-zinc-800 border border-zinc-700 text-zinc-100">
            <User className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-zinc-100">
                {userAuth
                  ? userAuth.isAnonymous
                    ? 'Anonymous Session'
                    : userAuth.displayName || userAuth.email || 'Registered User'
                  : 'Not Signed In'}
              </h2>
              <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-400 border border-zinc-700">
                {userAuth?.isAnonymous ? 'Guest ID: ' + userAuth.uid.slice(0, 6) : 'Synced Account'}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-zinc-400">
              {userAuth?.isAnonymous
                ? 'Sign in with Google to persist study sessions across mobile, desktop, and other devices.'
                : 'Data is synced live to your private Firestore database.'}
            </p>
          </div>
        </div>

        <button
          onClick={onOpenAuth}
          className="rounded-xl bg-zinc-100 px-4 py-2 text-xs font-semibold text-zinc-950 transition hover:bg-white shadow"
        >
          {userAuth?.isAnonymous ? 'Link Google Account' : 'Account Details'}
        </button>
      </section>

      {/* Device Pairing & Sync Code */}
      <section className="rounded-3xl border border-zinc-800/80 bg-zinc-900/55 p-6 backdrop-blur-sm">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Key className="h-5 w-5 text-emerald-400" />
            <h2 className="font-semibold text-zinc-200">Device Pairing & Sync Code</h2>
          </div>
          <span className="text-xs text-zinc-500">Sync data without an account</span>
        </div>

        {syncCode ? (
          <div className="rounded-2xl border border-emerald-900/50 bg-emerald-950/20 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-emerald-300">Sync is Active</h3>
                <p className="text-xs text-emerald-500/70">Your data is synced live to this code</p>
              </div>
              <button 
                onClick={onDisconnectSyncCode}
                className="rounded-lg bg-zinc-900 px-3 py-1.5 text-xs text-rose-400 border border-zinc-800 hover:bg-rose-950 transition cursor-pointer"
              >
                Disconnect
              </button>
            </div>
            <div className="flex flex-col items-center p-4 bg-black/40 rounded-xl border border-zinc-800/50">
              <span className="text-xs text-zinc-500 mb-1">Your Unique Sync Code</span>
              <span className="text-3xl font-mono tracking-widest text-emerald-400">{syncCode}</span>
              <span className="text-xs text-zinc-500 mt-2 text-center max-w-sm">
                Enter this code on another device to instantly mirror your current session.
              </span>
            </div>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {/* Generate Code */}
            <div className="rounded-2xl border border-zinc-800 bg-black/30 p-5 space-y-4 flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-medium text-zinc-300 mb-1">Create New Sync Code</h3>
                <p className="text-xs text-zinc-500">
                  Generate a secure 9-character code to share your current session with other devices.
                </p>
              </div>
              <button
                onClick={onGenerateSyncCode}
                className="w-full rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 py-2 text-sm font-medium hover:bg-emerald-500/20 transition cursor-pointer"
              >
                Generate Sync Code
              </button>
            </div>

            {/* Join Code */}
            <div className="rounded-2xl border border-zinc-800 bg-black/30 p-5 space-y-4">
              <div>
                <h3 className="text-sm font-medium text-zinc-300 mb-1">Connect Existing Device</h3>
                <p className="text-xs text-zinc-500">
                  Enter a code from another device to sync and override your current local data.
                </p>
              </div>
              <form onSubmit={handleJoinSubmit} className="space-y-2">
                <input
                  type="text"
                  placeholder="XXX-XXX-XXX"
                  value={joinCodeInput}
                  onChange={(e) => setJoinCodeInput(formatSyncCodeInput(e.target.value))}
                  maxLength={11}
                  className="w-full rounded-xl bg-zinc-950 border border-zinc-800 px-4 py-2 text-center font-mono text-zinc-100 outline-none focus:border-emerald-500/50 uppercase tracking-widest"
                />
                <button
                  type="submit"
                  disabled={joinCodeInput.length !== 11}
                  className="w-full rounded-xl bg-zinc-800 py-2 text-sm font-medium text-zinc-200 hover:bg-zinc-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Sync with Code
                </button>
                {joinError && <p className="text-xs text-rose-400 text-center mt-1">{joinError}</p>}
              </form>
            </div>
          </div>
        )}
      </section>

      {/* Daily Targets & Real-time Progress */}
      <section className="rounded-3xl border border-zinc-800/80 bg-zinc-900/55 p-6 backdrop-blur-sm">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-zinc-400" />
            <h2 className="font-semibold text-zinc-200">Daily Study Targets & Live Stats</h2>
          </div>
          <span className="text-xs text-zinc-500">Auto-calculated from logged sessions</span>
        </div>

        <div className="grid gap-6 md:grid-cols-3 text-xs">
          {/* Target 1: Focus Minutes */}
          <div className="rounded-2xl border border-zinc-800 bg-black/30 p-4 space-y-3">
            <div className="flex justify-between items-center text-zinc-300">
              <span>Focus Minutes</span>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min="10"
                  max="1440"
                  value={dailyTarget.minutes}
                  onChange={(e) => onUpdateDailyTarget({ ...dailyTarget, minutes: Number(e.target.value) || 60 })}
                  className="w-16 rounded border border-zinc-800 bg-zinc-950 px-2 py-1 text-right text-xs text-zinc-100 outline-none"
                />
                <span className="text-zinc-500">m</span>
              </div>
            </div>
            <div className="text-zinc-400">
              Logged today: <strong className="text-zinc-100">{todayStats.focusMinutes}m</strong> / {dailyTarget.minutes}m
            </div>
            <div className="h-2 w-full rounded-full bg-zinc-800 overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${focusPercent}%` }}
              />
            </div>
          </div>

          {/* Target 2: Sessions */}
          <div className="rounded-2xl border border-zinc-800 bg-black/30 p-4 space-y-3">
            <div className="flex justify-between items-center text-zinc-300">
              <span>Target Sessions</span>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={dailyTarget.sessions}
                  onChange={(e) => onUpdateDailyTarget({ ...dailyTarget, sessions: Number(e.target.value) || 1 })}
                  className="w-16 rounded border border-zinc-800 bg-zinc-950 px-2 py-1 text-right text-xs text-zinc-100 outline-none"
                />
                <span className="text-zinc-500">sessions</span>
              </div>
            </div>
            <div className="text-zinc-400">
              Completed today: <strong className="text-zinc-100">{todayStats.sessions}</strong> / {dailyTarget.sessions}
            </div>
            <div className="h-2 w-full rounded-full bg-zinc-800 overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all duration-500"
                style={{ width: `${sessionPercent}%` }}
              />
            </div>
          </div>

          {/* Target 3: Max Distractions */}
          <div className="rounded-2xl border border-zinc-800 bg-black/30 p-4 space-y-3">
            <div className="flex justify-between items-center text-zinc-300">
              <span>Max Distractions</span>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={dailyTarget.maxDistractions}
                  onChange={(e) => onUpdateDailyTarget({ ...dailyTarget, maxDistractions: Number(e.target.value) || 0 })}
                  className="w-16 rounded border border-zinc-800 bg-zinc-950 px-2 py-1 text-right text-xs text-zinc-100 outline-none"
                />
                <span className="text-zinc-500">max</span>
              </div>
            </div>
            <div className="text-zinc-400">
              Logged today: <strong className="text-zinc-100">{todayStats.distractions}</strong> / max {dailyTarget.maxDistractions}
            </div>
            <div className="h-2 w-full rounded-full bg-zinc-800 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  todayStats.distractions > dailyTarget.maxDistractions ? 'bg-rose-500' : 'bg-amber-500'
                }`}
                style={{ width: `${distractionPercent}%` }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Grid: Timer Durations & Audio Notifications */}
      <div className="grid gap-6 md:grid-cols-2 text-xs">
        {/* Timer Config */}
        <section className="rounded-3xl border border-zinc-800/80 bg-zinc-900/55 p-6 backdrop-blur-sm space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Settings className="h-4 w-4 text-zinc-400" />
            <h2 className="font-semibold text-zinc-200">Timer Intervals</h2>
          </div>

          <div className="space-y-3">
            <label className="flex items-center justify-between text-zinc-300">
              <span>Focus Block (minutes)</span>
              <input
                type="number"
                min="1"
                max="180"
                value={settings.focusMinutes}
                onChange={(e) => onUpdateSettings({ ...settings, focusMinutes: Math.max(1, Number(e.target.value)) })}
                className="w-16 rounded border border-zinc-800 bg-zinc-950 px-2 py-1 text-right outline-none"
              />
            </label>

            <label className="flex items-center justify-between text-zinc-300">
              <span>Short Break (minutes)</span>
              <input
                type="number"
                min="1"
                max="60"
                value={settings.breakMinutes}
                onChange={(e) => onUpdateSettings({ ...settings, breakMinutes: Math.max(1, Number(e.target.value)) })}
                className="w-16 rounded border border-zinc-800 bg-zinc-950 px-2 py-1 text-right outline-none"
              />
            </label>

            <label className="flex items-center justify-between text-zinc-300">
              <span>Long Break (minutes)</span>
              <input
                type="number"
                min="1"
                max="60"
                value={settings.longBreakMinutes}
                onChange={(e) => onUpdateSettings({ ...settings, longBreakMinutes: Math.max(1, Number(e.target.value)) })}
                className="w-16 rounded border border-zinc-800 bg-zinc-950 px-2 py-1 text-right outline-none"
              />
            </label>

            <label className="flex items-center justify-between text-zinc-300 border-t border-zinc-800/60 pt-3">
              <span>Sessions before Long Break</span>
              <input
                type="number"
                min="1"
                max="10"
                value={settings.sessionsBeforeLongBreak}
                onChange={(e) => onUpdateSettings({ ...settings, sessionsBeforeLongBreak: Math.max(1, Number(e.target.value)) })}
                className="w-16 rounded border border-zinc-800 bg-zinc-950 px-2 py-1 text-right outline-none"
              />
            </label>
          </div>
        </section>

        {/* Audio Sound Chimes & Web Notifications */}
        <section className="rounded-3xl border border-zinc-800/80 bg-zinc-900/55 p-6 backdrop-blur-sm space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Volume2 className="h-4 w-4 text-zinc-400" />
            <h2 className="font-semibold text-zinc-200">Audio Chimes & Push Alerts</h2>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-zinc-400 mb-1">Completion Bell Sound</label>
              <div className="flex gap-2">
                <select
                  value={settings.sound}
                  onChange={(e) => {
                    const nextSound = e.target.value;
                    onUpdateSettings({ ...settings, sound: nextSound });
                    playSound(nextSound, settings.volume);
                  }}
                  className="flex-grow rounded border border-zinc-800 bg-zinc-950 px-3 py-1.5 outline-none text-zinc-200"
                >
                  {SOUND_NAMES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>

                <button
                  onClick={() => playSound(settings.sound, settings.volume)}
                  className="flex items-center gap-1 rounded bg-zinc-800 px-3 py-1.5 text-zinc-300 hover:bg-zinc-700 hover:text-white"
                >
                  <Play className="h-3.5 w-3.5" />
                  <span>Test</span>
                </button>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-zinc-400 mb-1">
                <span>Volume</span>
                <span>{Math.round(settings.volume * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={settings.volume}
                onChange={(e) => onUpdateSettings({ ...settings, volume: Number(e.target.value) })}
                className="w-full accent-zinc-400"
              />
            </div>

            <div className="border-t border-zinc-800/60 pt-3 space-y-2">
              <label className="flex items-center justify-between text-zinc-300 cursor-pointer">
                <span>Web Push Notifications</span>
                <button
                  type="button"
                  onClick={handleToggleNotifications}
                  className={`rounded-full px-3 py-1 text-[11px] font-medium transition ${
                    settings.enableNotifications
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                      : 'bg-zinc-800 text-zinc-400'
                  }`}
                >
                  {settings.enableNotifications ? 'Enabled' : 'Disabled'}
                </button>
              </label>

              <label className="flex items-center justify-between text-zinc-300 cursor-pointer">
                <span>Auto-start Break Sessions</span>
                <input
                  type="checkbox"
                  checked={settings.autoStartBreaks}
                  onChange={(e) => onUpdateSettings({ ...settings, autoStartBreaks: e.target.checked })}
                  className="accent-zinc-400"
                />
              </label>
            </div>
          </div>
        </section>
      </div>

      {/* Offline PWA & Storage Details */}
      <section className="rounded-3xl border border-zinc-800/80 bg-zinc-900/55 p-6 backdrop-blur-sm text-xs space-y-2 text-zinc-400">
        <div className="flex items-center gap-2 font-medium text-zinc-200">
          {isOnline ? <Cloud className="h-4 w-4 text-emerald-400" /> : <HardDrive className="h-4 w-4 text-amber-400" />}
          <span>PWA Offline Persistence Status</span>
        </div>
        <p>
          {isOnline
            ? 'Connected to Google Cloud Run and Firestore. Offline cached reads and writes enabled.'
            : 'Working offline without an active internet connection. All session data, tasks, and timetables are saved locally in IndexedDB and will automatically sync when back online.'}
        </p>
      </section>
    </div>
  );
};
