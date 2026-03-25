
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
  jumuahIqamah?: string; // Only iqamah from Excel, start always uses Dhuhr time
}

// Represents a manual override range
export interface ManualOverride {
  id: string;
  prayerKey: 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha' | 'jumuah';
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  iqamah: string;
}

// --- Slideshow Types ---

export type SlideType = 'CLOCK' | 'ANNOUNCEMENT' | 'SCHEDULE';

export interface BaseSlideConfig {
  id: string;
  type: SlideType;
  enabled: boolean;
  duration: number; // Seconds
}

export interface ClockSlideConfig extends BaseSlideConfig {
  type: 'CLOCK';
}

export interface AnnouncementSlideConfig extends BaseSlideConfig {
  type: 'ANNOUNCEMENT';
  content: string;
  styles: {
    backgroundColor: string; // Hex or 'gradient-...' class token logic
    textColor: string;
    textAnimation: 'none' | 'gradient-flow' | 'pulse' | 'typewriter';
    fontSize: 'normal' | 'large' | 'huge';
  };
}

export interface ScheduleSlideConfig extends BaseSlideConfig {
  type: 'SCHEDULE';
  daysToShow: number;
}

export type SlideConfig = ClockSlideConfig | AnnouncementSlideConfig | ScheduleSlideConfig;

// --- Hijri Date Types ---

export const HIJRI_MONTHS = [
  'Muharram', 'Safar', "Rabi' al-Awwal", "Rabi' al-Thani",
  "Jumada al-Awwal", "Jumada al-Thani", 'Rajab', "Sha'ban",
  'Ramadan', 'Shawwal', "Dhul Qa'dah", 'Dhul Hijjah'
] as const;

export type HijriMonthName = typeof HIJRI_MONTHS[number];

export interface HijriSettings {
  /** Islamic month name, e.g. 'Shawwal'. Empty string = use JS fallback. */
  monthName: string;
  /** 1–12 corresponding to the month name. 0 = not set. */
  monthNumber: number;
  /** Hijri year, e.g. 1447. 0 = not set. */
  year: number;
  /** Gregorian date the month started on, YYYY-MM-DD. '' = not set. */
  monthStartGregorian: string;
  /** Number of days CHC declared for this month: 29 or 30. */
  monthLength: 29 | 30;
}

// --- Config Types ---
export interface AutoAlertSettings {
  enabled: boolean;
  template: string;
  color: string;
  animation: 'none' | 'pulse' | 'blink';
}

export interface MobileSilentAlertSettings {
  enabled: boolean;
  mode: 'fullscreen' | 'panel';
  triggerMinutes: number; // How many minutes before Iqamah to start
  backgroundColor: string;
  text: string;
  icon: 'phone-off' | 'align-rows' | 'shhh';
  animation: 'pulse' | 'flash' | 'none';
  beepEnabled: boolean;
  beepType: 'single' | 'double' | 'sonar' | 'soft';
  beepVolume: number; // 0 to 100
  disableForJumuah: boolean; // When true, alert will not trigger before Jumuah iqamah
}
