import { TimetableBlock } from '../types';

export const requestNotificationPermission = async (): Promise<boolean> => {
  if (!('Notification' in window)) {
    console.warn('This browser does not support Web Notifications');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  return false;
};

export const getNotificationPermissionStatus = (): NotificationPermission | 'unsupported' => {
  if (!('Notification' in window)) return 'unsupported';
  return Notification.permission;
};

export const sendNotification = (title: string, options?: NotificationOptions) => {
  if (!('Notification' in window) || Notification.permission !== 'granted') {
    return;
  }

  // Try using Service Worker registration first for PWA consistency
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.ready.then((reg) => {
      reg.showNotification(title, {
        icon: '/manifest.json',
        badge: '/manifest.json',
        ...options
      } as NotificationOptions).catch(() => {
        new Notification(title, options);
      });
    }).catch(() => {
      new Notification(title, options);
    });
  } else {
    new Notification(title, options);
  }
};

const notifiedBlocks = new Set<string>();

export const checkUpcomingStudyBlocks = (blocks: TimetableBlock[], leadMinutes: number = 5) => {
  if (Notification.permission !== 'granted' || !blocks.length) return;

  const now = new Date();
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const currentDay = days[now.getDay()];

  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  blocks.forEach((block) => {
    if (block.dayOfWeek !== currentDay) return;

    const [startHour, startMin] = block.startTime.split(':').map(Number);
    const blockStartMinutes = startHour * 60 + startMin;

    const minutesUntilStart = blockStartMinutes - currentMinutes;

    const blockKey = `${block.id}-${now.toDateString()}-${block.startTime}`;

    // Notify 5 minutes before
    if (minutesUntilStart > 0 && minutesUntilStart <= leadMinutes && !notifiedBlocks.has(`lead-${blockKey}`)) {
      notifiedBlocks.add(`lead-${blockKey}`);
      sendNotification(`Upcoming Study Block: ${block.title}`, {
        body: `Starting in ${minutesUntilStart} minute${minutesUntilStart === 1 ? '' : 's'} (${block.startTime}${block.location ? ' at ' + block.location : ''}). Get ready!`,
        tag: `lead-${blockKey}`
      });
    }

    // Notify right at start
    if (minutesUntilStart === 0 && !notifiedBlocks.has(`start-${blockKey}`)) {
      notifiedBlocks.add(`start-${blockKey}`);
      sendNotification(`Study Block Starting Now: ${block.title}`, {
        body: `Time for ${block.subject || block.title}! (${block.startTime} - ${block.endTime})`,
        tag: `start-${blockKey}`
      });
    }
  });
};
