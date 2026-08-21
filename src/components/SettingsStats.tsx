import React, { useState } from 'react';
import { Settings, Volume2, Target, Bell, User, Cloud, HardDrive, Play, Key, ChevronRight, Check, AlertCircle, Wifi, WifiOff, Clock, Coffee, RotateCcw, Hash, Zap, Shield, BarChart3, Flame, Copy, Link2, Unlink } from 'lucide-react';
import { UserSettings, DailyTarget, DailyStats, UserAuth } from '../types';
import { SOUND_NAMES, playSound } from '../lib/audio';
import { requestNotificationPermission, getNotificationPermissionStatus } from '../lib/notifications';
import { motion, AnimatePresence } from 'motion/react';

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

/* ── iOS-style toggle ───────────────────────────────────────────── */
const IOSToggle: React.FC<{ value: boolean; onToggle: () => void }> = ({ value, onToggle }) => (
  <motion.button
    whileTap={{ scale: 0.92 }}
    onClick={onToggle}
    className={`relative w-[51px] h-[31px] rounded-full transition-colors duration-300 flex-shrink-0 ${
      value ? 'bg-green-500' : 'bg-zinc-700'
    }`}
  >
    <motion.div
      layout
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      className={`absolute top-[2px] w-[27px] h-[27px] rounded-full bg-white shadow-md ${
        value ? 'left-[22px]' : 'left-[2px]'
      }`}
    />
  </motion.button>
);

/* ── Reusable iOS row wrapper ───────────────────────────────────── */
const IOSRow: React.FC<{
  icon: React.ReactNode;
  label: string;
  subtitle?: string;
  children?: React.ReactNode;
  onClick?: () => void;
  showChevron?: boolean;
  isLast?: boolean;
}> = ({ icon, label, subtitle, children, onClick, showChevron, isLast }) => (
  <motion.button
    whileTap={onClick ? { scale: 0.98 } : undefined}
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-3 ${!isLast ? 'border-b border-zinc-800/40' : ''} ${
      onClick ? 'active:bg-zinc-800/30' : ''
    } transition-colors`}
  >
    {icon}
    <div className="flex-1 min-w-0 text-left">
      <div className="text-[15px] text-white leading-tight">{label}</div>
      {subtitle && <div className="text-[13px] text-zinc-500 mt-0.5">{subtitle}</div>}
    </div>
    {children}
    {showChevron && <ChevronRight className="w-4 h-4 text-zinc-600 flex-shrink-0" />}
  </motion.button>
);

/* ── Section header ─────────────────────────────────────────────── */
const SectionHeader: React.FC<{ title: string }> = ({ title }) => (
  <h2 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2 px-4">{title}</h2>
);

/* ── Card wrapper ───────────────────────────────────────────────── */
const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`bg-zinc-900/60 backdrop-blur-xl rounded-2xl border border-zinc-800/50 overflow-hidden ${className}`}>
    {children}
  </div>
);

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
  const [joinCode, setJoinCode] = useState('');
  const [notifStatus, setNotifStatus] = useState(getNotificationPermissionStatus());
  const [copied, setCopied] = useState(false);

  const sessionPercent = Math.min(100, (todayStats.sessions / dailyTarget.sessions) * 100);
  const minutesPercent = Math.min(100, (todayStats.focusMinutes / dailyTarget.focusMinutes) * 100);
  const distractionPercent = dailyTarget.maxDistractions > 0
    ? Math.min(100, (todayStats.distractions / dailyTarget.maxDistractions) * 100)
    : 0;

  const handleRequestNotifs = async () => {
    const granted = await requestNotificationPermission();
    setNotifStatus(granted ? 'granted' : 'denied');
    if (granted) {
      onUpdateSettings({ ...settings, enableNotifications: true });
    }
  };

  const handleCopyCode = () => {
    if (syncCode) {
      navigator.clipboard.writeText(syncCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const containerVariants = {
    hidden: {},
    visible: {
      transition: { staggerChildren: 0.06, delayChildren: 0.05 }
    }
  };

  const sectionVariants = {
    hidden: { opacity: 0, y: 16 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { type: 'spring', stiffness: 260, damping: 24 }
    }
  };

  return (
    <div className="min-h-screen bg-black text-zinc-100 pb-24">
      <div className="max-w-lg mx-auto px-4 pt-14">
        {/* ── Header ──────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 20 }}
          className="mb-8"
        >
          <h1 className="text-[34px] font-bold text-white tracking-tight leading-tight">Settings</h1>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* ── Account ────────────────────────────────────────── */}
          <motion.div variants={sectionVariants} className="mb-7">
            <Card>
              <IOSRow
                icon={
                  <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-white" />
                  </div>
                }
                label={userAuth ? (userAuth.isAnonymous ? 'Guest Account' : userAuth.displayName || userAuth.email || 'Account') : 'Sign In'}
                subtitle={userAuth ? (userAuth.isAnonymous ? 'Sync across devices with a code' : 'Manage your account') : 'Sign in to sync your data'}
                onClick={onOpenAuth}
                showChevron
                isLast
              />
            </Card>
          </motion.div>

          {/* ── Timer Settings ─────────────────────────────────── */}
          <motion.div variants={sectionVariants} className="mb-7">
            <SectionHeader title="Timer" />
            <Card>
              {/* Focus Duration */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-800/40">
                <div className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center flex-shrink-0">
                  <Clock className="w-4 h-4 text-white" />
                </div>
                <span className="flex-1 text-[15px] text-white">Focus Duration</span>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min={1}
                    max={120}
                    value={settings.focusDuration}
                    onChange={(e) => onUpdateSettings({ ...settings, focusDuration: Number(e.target.value) || 25 })}
                    className="w-14 text-right bg-transparent text-[15px] text-white focus:outline-none tabular-nums"
                  />
                  <span className="text-[13px] text-zinc-500 w-6">min</span>
                </div>
              </div>
              {/* Short Break */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-800/40">
                <div className="w-8 h-8 rounded-lg bg-green-500 flex items-center justify-center flex-shrink-0">
                  <Coffee className="w-4 h-4 text-white" />
                </div>
                <span className="flex-1 text-[15px] text-white">Short Break</span>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={settings.breakDuration}
                    onChange={(e) => onUpdateSettings({ ...settings, breakDuration: Number(e.target.value) || 5 })}
                    className="w-14 text-right bg-transparent text-[15px] text-white focus:outline-none tabular-nums"
                  />
                  <span className="text-[13px] text-zinc-500 w-6">min</span>
                </div>
              </div>
              {/* Long Break */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-800/40">
                <div className="w-8 h-8 rounded-lg bg-purple-500 flex items-center justify-center flex-shrink-0">
                  <RotateCcw className="w-4 h-4 text-white" />
                </div>
                <span className="flex-1 text-[15px] text-white">Long Break</span>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min={1}
                    max={60}
                    value={settings.longBreakDuration}
                    onChange={(e) => onUpdateSettings({ ...settings, longBreakDuration: Number(e.target.value) || 15 })}
                    className="w-14 text-right bg-transparent text-[15px] text-white focus:outline-none tabular-nums"
                  />
                  <span className="text-[13px] text-zinc-500 w-6">min</span>
                </div>
              </div>
              {/* Sessions Before Long Break */}
              <div className="flex items-center gap-3 px-4 py-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center flex-shrink-0">
                  <Hash className="w-4 h-4 text-white" />
                </div>
                <span className="flex-1 text-[15px] text-white">Sessions Before Long Break</span>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={settings.sessionsBeforeLongBreak}
                  onChange={(e) => onUpdateSettings({ ...settings, sessionsBeforeLongBreak: Number(e.target.value) || 4 })}
                  className="w-12 text-right bg-transparent text-[15px] text-white focus:outline-none tabular-nums"
                />
              </div>
            </Card>
          </motion.div>

          {/* ── Behavior ───────────────────────────────────────── */}
          <motion.div variants={sectionVariants} className="mb-7">
            <SectionHeader title="Behavior" />
            <Card>
              <IOSRow
                icon={
                  <div className="w-8 h-8 rounded-lg bg-cyan-500 flex items-center justify-center flex-shrink-0">
                    <Zap className="w-4 h-4 text-white" />
                  </div>
                }
                label="Auto-Start Breaks"
                subtitle="Automatically start break after focus"
                isLast={false}
              >
                <IOSToggle value={settings.autoStartBreaks} onToggle={() => onUpdateSettings({ ...settings, autoStartBreaks: !settings.autoStartBreaks })} />
              </IOSRow>
              <IOSRow
                icon={
                  <div className="w-8 h-8 rounded-lg bg-teal-500 flex items-center justify-center flex-shrink-0">
                    <Zap className="w-4 h-4 text-white" />
                  </div>
                }
                label="Auto-Start Focus"
                subtitle="Automatically start next focus session"
                isLast={false}
              >
                <IOSToggle value={settings.autoStartFocus} onToggle={() => onUpdateSettings({ ...settings, autoStartFocus: !settings.autoStartFocus })} />
              </IOSRow>
              <IOSRow
                icon={
                  <div className="w-8 h-8 rounded-lg bg-rose-500 flex items-center justify-center flex-shrink-0">
                    <Shield className="w-4 h-4 text-white" />
                  </div>
                }
                label="Strict Mode"
                subtitle="Log distractions during focus"
                isLast
              >
                <IOSToggle value={settings.strictMode} onToggle={() => onUpdateSettings({ ...settings, strictMode: !settings.strictMode })} />
              </IOSRow>
            </Card>
          </motion.div>

          {/* ── Sound & Notifications ──────────────────────────── */}
          <motion.div variants={sectionVariants} className="mb-7">
            <SectionHeader title="Sound & Notifications" />
            <Card>
              {/* Sound selector */}
              <div className="px-4 py-3 border-b border-zinc-800/40">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center flex-shrink-0">
                    <Volume2 className="w-4 h-4 text-white" />
                  </div>
                  <span className="flex-1 text-[15px] text-white">Sound</span>
                  <select
                    value={settings.sound}
                    onChange={(e) => onUpdateSettings({ ...settings, sound: e.target.value })}
                    className="bg-zinc-800/80 border border-zinc-700/50 rounded-lg px-3 py-1.5 text-[13px] text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 appearance-none pr-7"
                  >
                    {SOUND_NAMES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-3 pl-11">
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={settings.volume}
                    onChange={(e) => onUpdateSettings({ ...settings, volume: Number(e.target.value) })}
                    className="flex-1 accent-blue-500 h-1"
                  />
                  <motion.button
                    whileTap={{ scale: 0.85 }}
                    onClick={() => playSound(settings.sound, settings.volume)}
                    className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 active:bg-zinc-700 transition-colors"
                  >
                    <Play className="w-3 h-3 ml-0.5" />
                  </motion.button>
                </div>
              </div>
              {/* Notifications */}
              <div className="flex items-center gap-3 px-4 py-3">
                <div className="w-8 h-8 rounded-lg bg-red-500 flex items-center justify-center flex-shrink-0">
                  <Bell className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[15px] text-white">Notifications</div>
                  <div className="text-[13px] text-zinc-500">
                    {notifStatus === 'granted' ? 'Enabled' : notifStatus === 'denied' ? 'Blocked' : 'Not enabled'}
                  </div>
                </div>
                {notifStatus !== 'granted' ? (
                  <motion.button
                    whileTap={{ scale: 0.92 }}
                    onClick={handleRequestNotifs}
                    className="px-3.5 py-1.5 rounded-lg bg-blue-500/20 text-blue-400 text-[13px] font-medium active:bg-blue-500/30 transition-colors"
                  >
                    Enable
                  </motion.button>
                ) : (
                  <IOSToggle
                    value={settings.enableNotifications}
                    onToggle={() => onUpdateSettings({ ...settings, enableNotifications: !settings.enableNotifications })}
                  />
                )}
              </div>
            </Card>
          </motion.div>

          {/* ── Today's Progress ───────────────────────────────── */}
          <motion.div variants={sectionVariants} className="mb-7">
            <SectionHeader title="Today's Progress" />
            <div className="grid grid-cols-3 gap-3">
              {/* Sessions */}
              <motion.div
                whileHover={{ scale: 1.02 }}
                className="bg-zinc-900/60 backdrop-blur-xl rounded-2xl border border-zinc-800/50 p-4 flex flex-col items-center"
              >
                <div className="w-8 h-8 rounded-full bg-blue-500/15 flex items-center justify-center mb-2">
                  <Target className="w-4 h-4 text-blue-400" />
                </div>
                <span className="text-2xl font-bold text-white tabular-nums">{todayStats.sessions}</span>
                <span className="text-[11px] text-zinc-500 mt-0.5">Sessions</span>
                <div className="w-full h-1 rounded-full bg-zinc-800 mt-2 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${sessionPercent}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    className="h-full bg-blue-500 rounded-full"
                  />
                </div>
              </motion.div>
              {/* Focus Minutes */}
              <motion.div
                whileHover={{ scale: 1.02 }}
                className="bg-zinc-900/60 backdrop-blur-xl rounded-2xl border border-zinc-800/50 p-4 flex flex-col items-center"
              >
                <div className="w-8 h-8 rounded-full bg-green-500/15 flex items-center justify-center mb-2">
                  <Clock className="w-4 h-4 text-green-400" />
                </div>
                <span className="text-2xl font-bold text-white tabular-nums">{todayStats.focusMinutes}</span>
                <span className="text-[11px] text-zinc-500 mt-0.5">Minutes</span>
                <div className="w-full h-1 rounded-full bg-zinc-800 mt-2 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${minutesPercent}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    className="h-full bg-green-500 rounded-full"
                  />
                </div>
              </motion.div>
              {/* Distractions */}
              <motion.div
                whileHover={{ scale: 1.02 }}
                className="bg-zinc-900/60 backdrop-blur-xl rounded-2xl border border-zinc-800/50 p-4 flex flex-col items-center"
              >
                <div className="w-8 h-8 rounded-full bg-amber-500/15 flex items-center justify-center mb-2">
                  <AlertCircle className="w-4 h-4 text-amber-400" />
                </div>
                <span className="text-2xl font-bold text-white tabular-nums">{todayStats.distractions}</span>
                <span className="text-[11px] text-zinc-500 mt-0.5">Distractions</span>
                <div className="w-full h-1 rounded-full bg-zinc-800 mt-2 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${distractionPercent}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    className="h-full bg-amber-500 rounded-full"
                  />
                </div>
              </motion.div>
            </div>
          </motion.div>

          {/* ── Daily Targets ──────────────────────────────────── */}
          <motion.div variants={sectionVariants} className="mb-7">
            <SectionHeader title="Daily Targets" />
            <Card>
              {/* Sessions target */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-800/40">
                <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center flex-shrink-0">
                  <Target className="w-4 h-4 text-white" />
                </div>
                <span className="flex-1 text-[15px] text-white">Sessions</span>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={dailyTarget.sessions}
                  onChange={(e) => onUpdateDailyTarget({ ...dailyTarget, sessions: Number(e.target.value) || 8 })}
                  className="w-12 text-right bg-transparent text-[15px] text-white focus:outline-none tabular-nums"
                />
              </div>
              {/* Focus minutes target */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-800/40">
                <div className="w-8 h-8 rounded-lg bg-green-500 flex items-center justify-center flex-shrink-0">
                  <Clock className="w-4 h-4 text-white" />
                </div>
                <span className="flex-1 text-[15px] text-white">Focus Minutes</span>
                <input
                  type="number"
                  min={1}
                  max={600}
                  value={dailyTarget.focusMinutes}
                  onChange={(e) => onUpdateDailyTarget({ ...dailyTarget, focusMinutes: Number(e.target.value) || 120 })}
                  className="w-14 text-right bg-transparent text-[15px] text-white focus:outline-none tabular-nums"
                />
              </div>
              {/* Max distractions target */}
              <div className="flex items-center gap-3 px-4 py-3">
                <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center flex-shrink-0">
                  <AlertCircle className="w-4 h-4 text-white" />
                </div>
                <span className="flex-1 text-[15px] text-white">Max Distractions</span>
                <input
                  type="number"
                  min={0}
                  max={50}
                  value={dailyTarget.maxDistractions}
                  onChange={(e) => onUpdateDailyTarget({ ...dailyTarget, maxDistractions: Number(e.target.value) || 5 })}
                  className="w-12 text-right bg-transparent text-[15px] text-white focus:outline-none tabular-nums"
                />
              </div>
            </Card>
          </motion.div>

          {/* ── Device Sync ────────────────────────────────────── */}
          <motion.div variants={sectionVariants} className="mb-7">
            <SectionHeader title="Device Sync" />
            <Card className="p-5">
              {/* Status indicator */}
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-full bg-emerald-500/15 flex items-center justify-center flex-shrink-0">
                  {isOnline ? (
                    <Wifi className="w-5 h-5 text-emerald-400" />
                  ) : (
                    <WifiOff className="w-5 h-5 text-zinc-500" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="text-[15px] font-medium text-white">
                    {syncCode ? 'Connected' : 'Not Connected'}
                  </div>
                  <div className="text-[13px] text-zinc-500">
                    {isOnline ? 'Online' : 'Offline'} — Sync data across devices
                  </div>
                </div>
              </div>

              {/* Active sync code display */}
              {syncCode && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-4"
                >
                  <div className="bg-zinc-800/50 rounded-xl p-4 flex items-center justify-between">
                    <div>
                      <div className="text-[11px] text-zinc-500 uppercase tracking-wider mb-1">Your Sync Code</div>
                      <div className="text-lg font-mono font-semibold text-white tracking-widest">{syncCode}</div>
                    </div>
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={handleCopyCode}
                      className="w-9 h-9 rounded-full bg-zinc-700/50 flex items-center justify-center text-zinc-400 active:bg-zinc-700 transition-colors"
                    >
                      <AnimatePresence mode="wait">
                        {copied ? (
                          <motion.div key="check" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                            <Check className="w-4 h-4 text-green-400" />
                          </motion.div>
                        ) : (
                          <motion.div key="copy" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                            <Copy className="w-4 h-4" />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.button>
                  </div>
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={onDisconnectSyncCode}
                    className="w-full mt-3 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-500/10 text-red-400 text-[13px] font-medium active:bg-red-500/20 transition-colors"
                  >
                    <Unlink className="w-3.5 h-3.5" />
                    Disconnect
                  </motion.button>
                </motion.div>
              )}

              {/* Join code input */}
              {!syncCode && (
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={joinCode}
                      onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                      placeholder="Enter code"
                      className="flex-1 bg-zinc-800/50 border border-zinc-700/50 rounded-xl px-4 py-2.5 text-[15px] text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 font-mono tracking-wider uppercase"
                    />
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={async () => {
                        if (joinCode.trim()) {
                          const ok = await onJoinSyncCode(joinCode.trim());
                          if (ok) setJoinCode('');
                        }
                      }}
                      className="px-4 py-2.5 rounded-xl bg-blue-500 text-white text-[13px] font-semibold active:bg-blue-600 transition-colors flex items-center gap-1.5"
                    >
                      <Link2 className="w-3.5 h-3.5" />
                      Join
                    </motion.button>
                  </div>
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={onGenerateSyncCode}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/15 text-emerald-400 text-[13px] font-medium active:bg-emerald-500/25 transition-colors"
                  >
                    <Key className="w-3.5 h-3.5" />
                    Generate New Code
                  </motion.button>
                </div>
              )}
            </Card>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};
