export interface PrayerTime {
  name: string;
  start: string;
  iqamah?: string; // Sunrise doesn't have iqamah
}

export interface DailyPrayers {
  fajr: PrayerTime;
  sunrise: string; // Time string
  dhuhr: PrayerTime;
  asr: PrayerTime;
  maghrib: PrayerTime;
  isha: PrayerTime;
  sunset: string; // Time string used for footer
}

export interface AnnouncementItem {
  id: string;
  text: string;
  color: string; // Hex code
  animation: 'none' | 'pulse' | 'blink';
}

export interface Announcement {
  id: string;
  title: string;
  items: AnnouncementItem[];
}

export interface Event {
  id: string;
  title: string;
  date: string;
}

// --- Scheduling Types ---

export interface PrayerScheduleValue {
  start: string;
  iqamah: string;
}

// Represents one day from the Excel file
export interface ExcelDaySchedule {
  date: string; // YYYY-MM-DD
  fajr: PrayerScheduleValue;
  dhuhr: PrayerScheduleValue;
  asr: PrayerScheduleValue;
  maghrib: PrayerScheduleValue;
  isha: PrayerScheduleValue;
  jumuahIqamah?: string;
}

// Represents a manual override range
export interface ManualOverride {
  id: string;
  prayerKey: 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha' | 'jumuah'; 
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  start: string;
  iqamah: string;
}