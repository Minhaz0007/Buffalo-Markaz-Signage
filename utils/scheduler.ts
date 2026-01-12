import { DailyPrayers, ExcelDaySchedule, ManualOverride } from '../types';
import { DEFAULT_PRAYER_TIMES, DEFAULT_JUMUAH_TIMES } from '../constants';
import { calculatePrayerTimes, calculateJumuahTimes } from './prayerCalculator';

// Helper function to ensure time has AM/PM suffix and convert 24-hour to 12-hour format
const ensureAmPm = (timeStr: string, isAfternoon: boolean = true): string => {
  if (!timeStr) return timeStr;

  // If already has AM/PM, return as-is
  if (/AM|PM/i.test(timeStr)) {
    return timeStr;
  }

  // Match HH:MM or H:MM format without AM/PM
  const match = timeStr.match(/^(\d{1,2}):(\d{2})$/);
  if (match) {
    let hours = parseInt(match[1]);
    const minutes = match[2];

    // Convert 24-hour format to 12-hour format with AM/PM
    let suffix: string;
    if (hours >= 13) {
      // 13:00-23:59 → 1:00 PM - 11:59 PM
      suffix = 'PM';
      hours -= 12;
    } else if (hours === 12) {
      // 12:00-12:59 → 12:00 PM - 12:59 PM (noon)
      suffix = 'PM';
    } else if (hours === 0) {
      // 00:00-00:59 → 12:00 AM - 12:59 AM (midnight)
      hours = 12;
      suffix = 'AM';
    } else if (hours >= 1 && hours <= 2 && isAfternoon) {
      // 1:00-2:59 with isAfternoon flag → assume PM (Jumu'ah case)
      suffix = 'PM';
    } else if (hours >= 1 && hours <= 11) {
      // 1:00-11:59 → 1:00 AM - 11:59 AM
      suffix = hours >= 4 && hours <= 7 ? 'AM' : (isAfternoon ? 'PM' : 'AM');
    } else {
      // Fallback
      suffix = 'AM';
    }

    return `${hours}:${minutes} ${suffix}`;
  }

  return timeStr;
};

export const addMinutesToTime = (timeStr: string, minutesToAdd: number): string => {
  const match = timeStr.match(/(\d+):(\d+)\s?(AM|PM)/i);
  if (!match) return timeStr;
  let [_, h, m, ampm] = match;
  let hours = parseInt(h);
  let minutes = parseInt(m);

  if (ampm.toUpperCase() === 'PM' && hours < 12) hours += 12;
  if (ampm.toUpperCase() === 'AM' && hours === 12) hours = 0;

  const date = new Date();
  date.setHours(hours, minutes + minutesToAdd, 0, 0);

  let newHours = date.getHours();
  const newMinutes = date.getMinutes();
  const newAmpm = newHours >= 12 ? 'PM' : 'AM';
  newHours = newHours % 12;
  if (newHours === 0) newHours = 12;

  return `${newHours}:${newMinutes.toString().padStart(2, '0')} ${newAmpm}`;
};

export const getScheduleForDate = (
  dateStr: string, // YYYY-MM-DD
  excelSchedule: Record<string, ExcelDaySchedule>,
  manualOverrides: ManualOverride[],
  maghribOffset: number
): { prayers: DailyPrayers, jumuah: { start: string, iqamah: string } } => {

  /**
   * PRIORITY HIERARCHY FOR IQAMAH TIMES:
   * 1. Adhan Library (Auto-calculation) - Base layer, always calculated
   * 2. Year-Round Calendar (Excel) - Overrides auto-calculation for Fajr, Dhuhr, Asr, Isha
   * 3. Maghrib Auto-Calculation - ALWAYS sunset + offset (never overridden by Excel/Manual)
   * 4. Manual Scheduling - Highest priority, overrides everything except Maghrib
   *
   * SPECIAL CASE: Maghrib is ALWAYS calculated as sunset + offset, regardless of Excel or manual overrides.
   * This is because Maghrib iqamah is tied to the daily sunset time, which changes every day.
   *
   * SPECIAL CASE: Jumu'ah start ALWAYS uses Dhuhr start time.
   * Only Jumu'ah iqamah can be overridden by Excel or manual schedules.
   *
   * DAYLIGHT SAVING TIME (DST):
   * - All prayer times automatically adjust for DST transitions
   * - Buffalo, NY observes DST (America/New_York: EST/EDT)
   * - JavaScript Date objects handle DST automatically using system timezone
   * - No manual adjustment needed
   */

  // 1. Start with Auto-Calculated Prayer Times (Autopilot Mode)
  // Parse the date string to create a Date object for the specific day
  // Using T12:00:00 creates the date at noon LOCAL time (handles DST automatically)
  const targetDate = new Date(dateStr + 'T12:00:00');

  let newPrayers: DailyPrayers;
  let newJumuah: { start: string, iqamah: string };

  try {
    // Calculate prayer times automatically for Buffalo, NY
    newPrayers = calculatePrayerTimes(targetDate);
    newJumuah = calculateJumuahTimes(targetDate);
  } catch (error) {
    // Fallback to defaults if calculation fails
    console.warn('Auto-calculation failed, using defaults:', error);
    newPrayers = { ...DEFAULT_PRAYER_TIMES };
    newJumuah = { ...DEFAULT_JUMUAH_TIMES };
  }

  // 2. Apply Excel (if exists for date) - WITH YEAR-ROUND EXTRAPOLATION
  let hasExcelMaghrib = false;
  let excelDataForDate: ExcelDaySchedule | null = null;

  // First, try exact date match
  if (excelSchedule[dateStr]) {
    excelDataForDate = excelSchedule[dateStr];
  } else {
    // Year-round calendar logic: If no exact match, find the same month-day from any year
    // This allows a 2026 calendar to work for 2027, 2028, etc.
    const [year, month, day] = dateStr.split('-');
    const monthDay = `${month}-${day}`; // e.g., "01-15"

    // Find all Excel entries with the same month-day
    const matchingEntries = Object.entries(excelSchedule)
      .filter(([key]) => key.endsWith(monthDay)) // Match MM-DD suffix
      .sort(([keyA], [keyB]) => keyB.localeCompare(keyA)); // Sort descending (most recent year first)

    // Use the most recent year's data for this month-day
    if (matchingEntries.length > 0) {
      excelDataForDate = matchingEntries[0][1];
    }
  }

  // Apply the Excel data if found (either exact match or year-round match)
  // NOTE: Maghrib is EXCLUDED from Excel - always calculated from sunset + offset
  if (excelDataForDate) {
    const day = excelDataForDate;
    newPrayers.fajr = { name: 'Fajr', ...day.fajr };
    newPrayers.dhuhr = { name: 'Dhuhr', ...day.dhuhr };
    newPrayers.asr = { name: 'Asr', ...day.asr };
    // newPrayers.maghrib = { name: 'Maghrib', ...day.maghrib }; // SKIP MAGHRIB - always auto-calculated
    newPrayers.isha = { name: 'Isha', ...day.isha };

    // Override Jumu'ah iqamah from Excel if available
    // Note: Jumu'ah start ALWAYS uses Dhuhr start (set below)
    if (day.jumuahIqamah) {
       newJumuah.iqamah = ensureAmPm(day.jumuahIqamah, true);
    }
  }

  // Always set Jumu'ah start to match Dhuhr start (per user requirement)
  // This happens AFTER Excel data is applied but BEFORE manual overrides
  // Manual overrides can still override Jumu'ah if needed
  // Ensure AM/PM is added to Jumu'ah start time (isAfternoon: true to correctly handle times like 1:30 as PM)
  newJumuah.start = ensureAmPm(newPrayers.dhuhr.start, true);

  // 3. Apply Maghrib Offset (ALWAYS - tied to daily sunset)
  // Maghrib is never overridden by Excel or manual schedules - always calculated from sunset
  if (newPrayers.maghrib.start) {
     newPrayers.maghrib.iqamah = addMinutesToTime(newPrayers.maghrib.start, maghribOffset);
  }

  // 4. Apply Manual Overrides (Highest Priority)
  // NOTE: Maghrib is excluded - always uses sunset + offset calculation
  manualOverrides.forEach(override => {
     if (dateStr >= override.startDate && dateStr <= override.endDate) {
        if (override.prayerKey === 'jumuah') {
            // Ensure manual override Jumu'ah times have AM/PM
            newJumuah = {
              start: ensureAmPm(override.start, true),
              iqamah: ensureAmPm(override.iqamah, true)
            };
        } else if (override.prayerKey !== 'maghrib') {
            // It's a daily prayer (but NOT maghrib - maghrib is always auto-calculated)
            const key = override.prayerKey as keyof Omit<DailyPrayers, 'sunrise'|'sunset'>;
            if (newPrayers[key]) {
                newPrayers[key] = {
                    ...newPrayers[key],
                    start: override.start,
                    iqamah: override.iqamah
                };
            }
        }
     }
  });

  return { prayers: newPrayers, jumuah: newJumuah };
};
