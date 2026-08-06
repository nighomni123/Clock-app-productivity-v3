import { TimetableBlock, TaskItem, ExamState } from '../types';

/**
 * Format Date or Time string to Google Calendar UTC ISO format YYYYMMDDTHHmmssZ
 */
const formatToGCalDate = (date: Date): string => {
  return date.toISOString().replace(/-|:|\.\d+/g, '');
};

/**
 * Convert Day of Week and HH:mm to next occurrence Date
 */
const getNextDateForDayAndTime = (dayName: string, timeStr: string): Date => {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const targetDayIdx = days.findIndex(d => d.toLowerCase() === dayName.toLowerCase());
  
  const now = new Date();
  const currentDayIdx = now.getDay();
  
  let daysAhead = targetDayIdx - currentDayIdx;
  if (daysAhead < 0) {
    daysAhead += 7;
  }
  
  const [hours, minutes] = timeStr.split(':').map(Number);
  const targetDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + daysAhead, hours, minutes, 0);
  
  return targetDate;
};

/**
 * Create Google Calendar Web Link for a Timetable Block
 */
export const createGCalLinkForTimetableBlock = (block: TimetableBlock): string => {
  const startDate = getNextDateForDayAndTime(block.dayOfWeek, block.startTime);
  const endDate = getNextDateForDayAndTime(block.dayOfWeek, block.endTime);
  
  // Handle case where end time is earlier than start time (overnight)
  if (endDate <= startDate) {
    endDate.setDate(endDate.getDate() + 1);
  }

  const startIso = formatToGCalDate(startDate);
  const endIso = formatToGCalDate(endDate);

  const title = encodeURIComponent(`[Study Block] ${block.title} (${block.subject})`);
  const details = encodeURIComponent(`Study Block scheduled via Focus Study Clock.\nSubject: ${block.subject}\nDay: ${block.dayOfWeek}`);
  const location = encodeURIComponent(block.location || 'Focus Study Space');

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startIso}/${endIso}&details=${details}&location=${location}&recur=RRULE:FREQ=WEEKLY`;
};

/**
 * Create Google Calendar Web Link for a Task
 */
export const createGCalLinkForTask = (task: TaskItem): string => {
  let startDate = new Date();
  if (task.dueDate) {
    startDate = new Date(task.dueDate);
  } else {
    startDate.setHours(startDate.getHours() + 1, 0, 0, 0);
  }

  const durationMin = task.estimatedMinutes || 30;
  const endDate = new Date(startDate.getTime() + durationMin * 60 * 1000);

  const startIso = formatToGCalDate(startDate);
  const endIso = formatToGCalDate(endDate);

  const title = encodeURIComponent(`[Task] ${task.title}`);
  const details = encodeURIComponent(`Task from Focus Study Clock.\nPriority: ${task.priority.toUpperCase()}\nEstimated duration: ${durationMin} min`);

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startIso}/${endIso}&details=${details}`;
};

/**
 * Create Google Calendar Web Link for Exam
 */
export const createGCalLinkForExam = (exam: ExamState): string => {
  if (!exam.date) return '#';
  const startDate = new Date(`${exam.date}T09:00:00`);
  const endDate = new Date(`${exam.date}T12:00:00`);

  const startIso = formatToGCalDate(startDate);
  const endIso = formatToGCalDate(endDate);

  const title = encodeURIComponent(`[EXAM] ${exam.name || 'Important Exam'}`);
  const details = encodeURIComponent(`Exam target countdown from Focus Study Clock.`);

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startIso}/${endIso}&details=${details}`;
};

/**
 * Generate .ics iCalendar file content for exporting full Timetable
 */
export const generateICSForTimetable = (blocks: TimetableBlock[]): string => {
  let icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Focus Study Clock//Study Timetable Export//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH'
  ].join('\r\n');

  blocks.forEach((block) => {
    const startDate = getNextDateForDayAndTime(block.dayOfWeek, block.startTime);
    const endDate = getNextDateForDayAndTime(block.dayOfWeek, block.endTime);
    if (endDate <= startDate) endDate.setDate(endDate.getDate() + 1);

    const startIso = formatToGCalDate(startDate);
    const endIso = formatToGCalDate(endDate);

    icsContent += '\r\n' + [
      'BEGIN:VEVENT',
      `UID:block-${block.id}@focusstudyclock`,
      `DTSTAMP:${formatToGCalDate(new Date())}`,
      `DTSTART:${startIso}`,
      `DTEND:${endIso}`,
      `RRULE:FREQ=WEEKLY`,
      `SUMMARY:[Study] ${block.title}`,
      `DESCRIPTION:Subject: ${block.subject}`,
      `LOCATION:${block.location || 'Focus Study Space'}`,
      'STATUS:CONFIRMED',
      'END:VEVENT'
    ].join('\r\n');
  });

  icsContent += '\r\nEND:VCALENDAR';
  return icsContent;
};

export const downloadICSFile = (filename: string, content: string) => {
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
