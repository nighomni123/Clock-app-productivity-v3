import { TaskItem, ExamState } from '../types';

/**
 * Format Date to Google Calendar UTC ISO format YYYYMMDDTHHmmssZ
 */
const formatToGCalDate = (date: Date): string => {
  return date.toISOString().replace(/-|:|\.\d+/g, '');
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
