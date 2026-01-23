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

export type ScheduleIndex = Record<string, ExcelDaySchedule>;

/**
 * Pre-indexes the excel schedule by MM-DD for O(1) lookup.
 * When multiple years exist for the same MM-DD, the most recent year is prioritized.
 */
export const buildScheduleIndex = (excelSchedule: Record<string, ExcelDaySchedule>): ScheduleIndex => {
  const index: ScheduleIndex = {};

  // Sort entries by year descending to ensure most recent year takes precedence
  const sortedEntries = Object.entries(excelSchedule).sort(([keyA], [keyB]) => keyB.localeCompare(keyA));

  for (const [dateStr, schedule] of sortedEntries) {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const monthDay = `${parts[1]}-${parts[2]}`; // MM-DD

      // Since we sorted descending (newest year first), the first time we see a month-day,
      // it's from the most recent year available for that date.
      if (!index[monthDay]) {
        index[monthDay] = schedule;
      }
    }
  }

  return index;
};

export const getScheduleForDate = (
  dateStr: string, // YYYY-MM-DD
  excelSchedule: Record<string, ExcelDaySchedule>,
  manualOverrides: ManualOverride[],
  maghribOffset: number,
  scheduleIndex?: ScheduleIndex // Optional optimized index for O(1) fallback lookup
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

    if (scheduleIndex) {
      // O(1) lookup using pre-built index
      if (scheduleIndex[monthDay]) {
        excelDataForDate = scheduleIndex[monthDay];
      }
    } else {
      // Fallback: O(N) search (Original logic)
      // Find all Excel entries with the same month-day
      const matchingEntries = Object.entries(excelSchedule)
        .filter(([key]) => key.endsWith(monthDay)) // Match MM-DD suffix
        .sort(([keyA], [keyB]) => keyB.localeCompare(keyA)); // Sort descending (most recent year first)

      // Use the most recent year's data for this month-day
      if (matchingEntries.length > 0) {
        excelDataForDate = matchingEntries[0][1];
      }
    }
  }

  // Apply the Excel data if found (either exact match or year-round match)
  // NOTE: Maghrib is EXCLUDED from Excel - always calculated from sunset + offset
  // IMPORTANT: Apply ensureAmPm to all Excel times to ensure AM/PM formatting
  if (excelDataForDate) {
    const day = excelDataForDate;

    // Apply Excel data with AM/PM formatting
    if (day.fajr) {
      newPrayers.fajr = {
        name: 'Fajr',
        start: ensureAmPm(day.fajr.start, false),  // Fajr is morning
        iqamah: ensureAmPm(day.fajr.iqamah, false)
      };
    }
    if (day.dhuhr) {
      newPrayers.dhuhr = {
        name: 'Dhuhr',
        start: ensureAmPm(day.dhuhr.start, true),  // Dhuhr is afternoon
        iqamah: ensureAmPm(day.dhuhr.iqamah, true)
      };
    }
    if (day.asr) {
      newPrayers.asr = {
        name: 'Asr',
        start: ensureAmPm(day.asr.start, true),  // Asr is afternoon
        iqamah: ensureAmPm(day.asr.iqamah, true)
      };
    }
    // newPrayers.maghrib = { name: 'Maghrib', ...day.maghrib }; // SKIP MAGHRIB - always auto-calculated
    if (day.isha) {
      newPrayers.isha = {
        name: 'Isha',
        start: ensureAmPm(day.isha.start, true),  // Isha is evening/night
        iqamah: ensureAmPm(day.isha.iqamah, true)
      };
    }

    // Override Jumu'ah iqamah from Excel if available
    // Note: Jumu'ah start ALWAYS uses Dhuhr start (set below)
    if (day.jumuahIqamah) {
       newJumuah.iqamah = ensureAmPm(day.jumuahIqamah, true);
    }
  }

  // ALWAYS set Jumu'ah times to match Dhuhr times (per user requirement)
  // This happens AFTER Excel data is applied but BEFORE manual overrides
  // This ensures Jumu'ah always uses Dhuhr times on Fridays, even if Excel specifies different jumuahIqamah
  // Manual overrides below can still override these if needed
  newJumuah.start = ensureAmPm(newPrayers.dhuhr.start, true);
  newJumuah.iqamah = ensureAmPm(newPrayers.dhuhr.iqamah, true);

  // 3. Apply Maghrib Offset (ALWAYS - tied to daily sunset)
  // Maghrib is never overridden by Excel or manual schedules - always calculated from sunset
  if (newPrayers.maghrib.start) {
     newPrayers.maghrib.iqamah = addMinutesToTime(newPrayers.maghrib.start, maghribOffset);
  }

  // 4. Apply Manual Overrides (Highest Priority)
  // NOTE: Maghrib is excluded - always uses sunset + offset calculation
  // NOTE: Jumu'ah iqamah is excluded - always uses Dhuhr iqamah (per user requirement)
  manualOverrides.forEach(override => {
     if (dateStr >= override.startDate && dateStr <= override.endDate) {
        if (override.prayerKey === 'jumuah') {
            // Allow manual override of Jumu'ah START time (khutbah time)
            // But DO NOT override iqamah - it must always match Dhuhr iqamah
            newJumuah.start = ensureAmPm(override.start, true);
            // iqamah is NOT overridden - keeps Dhuhr iqamah value set above
        } else if (override.prayerKey !== 'maghrib') {
            // It's a daily prayer (but NOT maghrib - maghrib is always auto-calculated)
            const key = override.prayerKey as keyof Omit<DailyPrayers, 'sunrise'|'sunset'>;
            if (newPrayers[key]) {
                // Determine if this is an afternoon prayer to correctly handle AM/PM
                const isAfternoonPrayer = ['dhuhr', 'asr'].includes(override.prayerKey);
                newPrayers[key] = {
                    ...newPrayers[key],
                    start: ensureAmPm(override.start, isAfternoonPrayer || override.prayerKey !== 'fajr'),
                    iqamah: ensureAmPm(override.iqamah, isAfternoonPrayer || override.prayerKey !== 'fajr')
                };
            }
        }
     }
  });

  // 5. FINAL ENFORCEMENT: Jumu'ah iqamah MUST always equal Dhuhr iqamah
  // This happens AFTER all overrides to ensure it's never changed
  // Manual overrides can still change Jumu'ah start time, but never iqamah
  newJumuah.iqamah = ensureAmPm(newPrayers.dhuhr.iqamah, true);

  return { prayers: newPrayers, jumuah: newJumuah };
};
