
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
}
