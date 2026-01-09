import { DailyPrayers, Event, Announcement } from './types';

export const MOSQUE_NAME = "Buffalo Markaz Masjid";
export const ADDRESS = "123 Main St, Buffalo, NY 14212";
export const WEBSITE = "www.buffalomarkaz.com";
export const PHONE = "716-555-0100";

export const DEFAULT_PRAYER_TIMES: DailyPrayers = {
  fajr: { name: 'Fajr', start: '5:45 AM', iqamah: '6:15 AM' },
  sunrise: '6:58 AM',
  dhuhr: { name: 'Dhuhr', start: '1:15 PM', iqamah: '1:45 PM' },
  asr: { name: 'Asr', start: '4:30 PM', iqamah: '5:00 PM' },
  maghrib: { name: 'Maghrib', start: '6:15 PM', iqamah: '6:25 PM' },
  isha: { name: 'Isha', start: '8:00 PM', iqamah: '8:30 PM' },
  sunset: '6:15 PM'
};

export const DEFAULT_JUMUAH_TIMES = {
  start: '1:15 PM',
  iqamah: '1:45 PM'
};

export const DEFAULT_EVENTS: Event[] = [
  { id: '1', title: 'Community Iftar', date: 'Thu, Nov 2' },
  { id: '2', title: 'Youth Halaqa', date: 'Fri, Nov 3' },
  { id: '3', title: "Sisters' Tafseer", date: 'Sun, Nov 5' },
];

export const DEFAULT_ANNOUNCEMENT: Announcement = {
  id: '1',
  title: 'ANNOUNCEMENTS',
  content: 'Please park responsibly. Do not block neighbor driveways during Jumuah prayer.'
};
