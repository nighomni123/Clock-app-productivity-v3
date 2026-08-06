import React, { useState } from 'react';
import { Calendar, CalendarPlus, Download, Plus, Trash2, MapPin, Clock, Bell, CheckCircle2, AlertCircle } from 'lucide-react';
import { TimetableBlock } from '../types';
import { createGCalLinkForTimetableBlock, generateICSForTimetable, downloadICSFile } from '../lib/gcal';
import { requestNotificationPermission, getNotificationPermissionStatus } from '../lib/notifications';
import { TimePickerInput } from './TimePickerInput';

interface TimetableCalendarProps {
  blocks: TimetableBlock[];
  onAddBlock: (block: Omit<TimetableBlock, 'id' | 'userId' | 'createdAt'>) => void;
  onRemoveBlock: (id: string) => void;
  notificationLeadMinutes: number;
}

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;

const COLOR_OPTIONS = [
  { name: 'Indigo', value: '#6366f1', bgClass: 'bg-indigo-950/40 border-indigo-800/60 text-indigo-200' },
  { name: 'Emerald', value: '#10b981', bgClass: 'bg-emerald-950/40 border-emerald-800/60 text-emerald-200' },
  { name: 'Amber', value: '#f59e0b', bgClass: 'bg-amber-950/40 border-amber-800/60 text-amber-200' },
  { name: 'Rose', value: '#f43f5e', bgClass: 'bg-rose-950/40 border-rose-800/60 text-rose-200' },
  { name: 'Sky', value: '#0ea5e9', bgClass: 'bg-sky-950/40 border-sky-800/60 text-sky-200' },
  { name: 'Purple', value: '#a855f7', bgClass: 'bg-purple-950/40 border-purple-800/60 text-purple-200' }
];

export const TimetableCalendar: React.FC<TimetableCalendarProps> = ({
  blocks,
  onAddBlock,
  onRemoveBlock,
  notificationLeadMinutes
}) => {
  const [selectedDay, setSelectedDay] = useState<string>('Monday');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [notifStatus, setNotifStatus] = useState(getNotificationPermissionStatus());

  // New Block Form State
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [dayOfWeek, setDayOfWeek] = useState<typeof DAYS_OF_WEEK[number]>('Monday');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:30');
  const [location, setLocation] = useState('');
  const [color, setColor] = useState(COLOR_OPTIONS[0].value);

  const handleCreateBlockSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !startTime || !endTime) return;

    onAddBlock({
      title: title.trim(),
      subject: subject.trim() || 'General Study',
      dayOfWeek,
      startTime,
      endTime,
      location: location.trim(),
      color
    });

    setTitle('');
    setSubject('');
    setLocation('');
    setIsAddModalOpen(false);
  };

  const handleExportICS = () => {
    const icsData = generateICSForTimetable(blocks);
    downloadICSFile('FocusStudy_Timetable.ics', icsData);
  };

  const handleEnableNotifications = async () => {
    const granted = await requestNotificationPermission();
    setNotifStatus(getNotificationPermissionStatus());
    if (granted) {
      alert('Push Notifications enabled! You will receive alerts before scheduled study blocks.');
    }
  };

  const filteredBlocks = blocks.filter((b) => b.dayOfWeek === selectedDay);

  return (
    <div className="mx-auto w-full max-w-7xl animate-in fade-in zoom-in-95 duration-500">
      {/* Header Banner & Google Calendar Actions */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-zinc-800/80 bg-zinc-900/55 p-6 backdrop-blur-sm">
        <div>
          <div className="flex items-center gap-2">
            <Calendar className="h-6 w-6 text-indigo-400" />
            <h1 className="text-xl font-semibold text-zinc-100">Study Session Timetable</h1>
          </div>
          <p className="mt-1 text-xs text-zinc-400">
            Schedule recurring weekly study blocks, sync push notifications, and export to Google Calendar.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Web Notification status pill */}
          {notifStatus === 'granted' ? (
            <div className="flex items-center gap-1.5 rounded-full border border-emerald-900/40 bg-emerald-950/20 px-3 py-1.5 text-xs text-emerald-400">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
              <span>Push Notifications Active ({notificationLeadMinutes}m prior)</span>
            </div>
          ) : (
            <button
              onClick={handleEnableNotifications}
              className="flex items-center gap-1.5 rounded-full border border-amber-900/50 bg-amber-950/30 px-3 py-1.5 text-xs text-amber-300 hover:bg-amber-950/60 transition"
            >
              <Bell className="h-3.5 w-3.5 text-amber-400" />
              <span>Enable Study Block Alerts</span>
            </button>
          )}

          {/* Export to ICS button */}
          <button
            onClick={handleExportICS}
            disabled={!blocks.length}
            className="flex items-center gap-1.5 rounded-full border border-zinc-700 bg-zinc-800 px-4 py-1.5 text-xs font-medium text-zinc-200 transition hover:border-zinc-600 hover:bg-zinc-700 disabled:opacity-50"
            title="Export timetable to iCalendar (.ics) for Google Calendar / Apple Calendar"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export .ics</span>
          </button>

          {/* Add Study Block button */}
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 rounded-full bg-zinc-100 px-4 py-1.5 text-xs font-medium text-zinc-950 shadow transition hover:bg-white"
          >
            <Plus className="h-4 w-4" />
            <span>Add Study Block</span>
          </button>
        </div>
      </div>

      {/* Day Selector Tabs */}
      <div className="mb-6 flex items-center gap-1 overflow-x-auto rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-1.5 backdrop-blur-sm">
        {DAYS_OF_WEEK.map((day) => {
          const count = blocks.filter((b) => b.dayOfWeek === day).length;
          const isSelected = selectedDay === day;
          return (
            <button
              key={day}
              onClick={() => setSelectedDay(day)}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2 px-3 text-xs font-medium transition ${
                isSelected
                  ? 'bg-zinc-100 text-zinc-950 shadow-sm'
                  : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'
              }`}
            >
              <span>{day}</span>
              {count > 0 && (
                <span
                  className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                    isSelected ? 'bg-zinc-900 text-zinc-100' : 'bg-zinc-800 text-zinc-400'
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Timetable Blocks Grid for Selected Day */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredBlocks.length === 0 ? (
          <div className="col-span-full rounded-3xl border border-dashed border-zinc-800 bg-zinc-900/30 p-12 text-center">
            <Calendar className="mx-auto h-10 w-10 text-zinc-600 mb-3" />
            <h3 className="text-sm font-medium text-zinc-400">No study blocks scheduled for {selectedDay}</h3>
            <p className="text-xs text-zinc-600 mt-1">Click "Add Study Block" to build your weekly timetable.</p>
          </div>
        ) : (
          filteredBlocks.map((block) => {
            const gcalUrl = createGCalLinkForTimetableBlock(block);
            const colorMatch = COLOR_OPTIONS.find((c) => c.value === block.color) || COLOR_OPTIONS[0];

            return (
              <div
                key={block.id}
                className={`relative flex flex-col justify-between rounded-3xl border p-5 backdrop-blur-sm transition hover:border-zinc-600 ${colorMatch.bgClass}`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                        {block.subject}
                      </span>
                      <h3 className="text-base font-semibold text-zinc-100 mt-0.5">{block.title}</h3>
                    </div>
                    <button
                      onClick={() => onRemoveBlock(block.id)}
                      className="text-zinc-500 hover:text-red-400 transition p-1"
                      title="Remove Block"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="mt-4 space-y-1.5 text-xs text-zinc-300">
                    <div className="flex items-center gap-2">
                      <Clock className="h-3.5 w-3.5 text-zinc-400" />
                      <span className="tabular-nums font-mono">
                        {block.startTime} - {block.endTime}
                      </span>
                    </div>
                    {block.location && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-3.5 w-3.5 text-zinc-400" />
                        <span>{block.location}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-5 border-t border-zinc-800/60 pt-3 flex items-center justify-between">
                  <a
                    href={gcalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs font-medium text-indigo-300 hover:text-indigo-200 transition"
                  >
                    <CalendarPlus className="h-3.5 w-3.5" />
                    <span>Sync to Google Calendar</span>
                  </a>
                  <span className="text-[10px] text-zinc-500">Weekly Recurring</span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add Study Block Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-3xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl">
            <h2 className="text-lg font-semibold text-zinc-100 mb-4">Add Study Block</h2>

            <form onSubmit={handleCreateBlockSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-zinc-400 mb-1">Session / Topic Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="E.g., Quantum Mechanics Lecture"
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-zinc-100 outline-none focus:border-zinc-600"
                />
              </div>

              <div>
                <label className="block text-zinc-400 mb-1">Subject / Category</label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="E.g., Physics 101"
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-zinc-100 outline-none focus:border-zinc-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 mb-1">Day of Week</label>
                  <select
                    value={dayOfWeek}
                    onChange={(e) => setDayOfWeek(e.target.value as typeof DAYS_OF_WEEK[number])}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-zinc-100 outline-none focus:border-zinc-600"
                  >
                    {DAYS_OF_WEEK.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-zinc-400 mb-1">Location / Link</label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Library Rm 3"
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-zinc-100 outline-none focus:border-zinc-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <TimePickerInput
                  label="Start Time"
                  value={startTime}
                  onChange={setStartTime}
                  required
                />
                <TimePickerInput
                  label="End Time"
                  value={endTime}
                  onChange={setEndTime}
                  required
                />
              </div>

              <div>
                <label className="block text-zinc-400 mb-1">Color Theme</label>
                <div className="flex gap-2">
                  {COLOR_OPTIONS.map((c) => (
                    <button
                      key={c.name}
                      type="button"
                      onClick={() => setColor(c.value)}
                      className={`h-7 w-7 rounded-full border-2 transition ${
                        color === c.value ? 'border-white scale-110' : 'border-transparent opacity-70'
                      }`}
                      style={{ backgroundColor: c.value }}
                      title={c.name}
                    />
                  ))}
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2 text-zinc-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-zinc-100 px-5 py-2 font-medium text-zinc-950 hover:bg-white"
                >
                  Save Study Block
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
