import { DailyPrayers, Announcement, MobileSilentAlertSettings } from './types';

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

export const DEFAULT_ANNOUNCEMENT: Announcement = {
  id: '1',
  title: 'ANNOUNCEMENTS',
  items: [
    { 
      id: '1', 
      text: 'Please park responsibly.', 
      color: '#000000', 
      animation: 'none' 
    },
    { 
      id: '2', 
      text: 'Do not block neighbor driveways during Jumuah prayer.', 
      color: '#0B1E3B', // Navy
      animation: 'pulse' 
    },
    { 
      id: '3', 
      text: 'Donate generously for the masjid construction.', 
      color: '#000000', 
      animation: 'none' 
    }
  ]
};

export const DEFAULT_MOBILE_SILENT_ALERT: MobileSilentAlertSettings = {
  enabled: true,
  mode: 'panel', // 'fullscreen' or 'panel'
  triggerMinutes: 0.5, // 30 seconds default
  backgroundColor: '#ef4444', // Red-500
  text: 'Please silence your cell phones.',
  icon: 'phone-off',
  animation: 'pulse',
  beepEnabled: true,
  beepType: 'single',
  beepVolume: 75 // Default 75%
};

export const ALERT_MESSAGES = [
  "Please silence your cell phones.",
  "Please straighten the rows and fill the gaps.",
  "Turn off mobile phones and connect with Allah.",
  "Please keep children close and silence devices."
];
