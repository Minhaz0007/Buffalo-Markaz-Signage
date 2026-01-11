import { DailyPrayers, ExcelDaySchedule, ManualOverride } from '../types';
import { DEFAULT_PRAYER_TIMES, DEFAULT_JUMUAH_TIMES } from '../constants';
import { calculatePrayerTimes, calculateJumuahTimes } from './prayerCalculator';

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

  // 1. Start with Auto-Calculated Prayer Times (Autopilot Mode)
  // Parse the date string to create a Date object for the specific day
  const targetDate = new Date(dateStr + 'T12:00:00'); // Use noon to avoid timezone issues

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

  // 2. Apply Excel (if exists for date)
  if (excelSchedule[dateStr]) {
    const day = excelSchedule[dateStr];
    newPrayers.fajr = { name: 'Fajr', ...day.fajr };
    newPrayers.dhuhr = { name: 'Dhuhr', ...day.dhuhr };
    newPrayers.asr = { name: 'Asr', ...day.asr };
    newPrayers.maghrib = { name: 'Maghrib', ...day.maghrib };
    newPrayers.isha = { name: 'Isha', ...day.isha };
    
    if (day.jumuahIqamah) {
       newJumuah.iqamah = day.jumuahIqamah;
    }
  }

  // 3. Apply Maghrib Offset (Before Manual Overrides)
  if (newPrayers.maghrib.start) {
     newPrayers.maghrib.iqamah = addMinutesToTime(newPrayers.maghrib.start, maghribOffset);
  }

  // 4. Apply Manual Overrides (Highest Priority)
  manualOverrides.forEach(override => {
     if (dateStr >= override.startDate && dateStr <= override.endDate) {
        if (override.prayerKey === 'jumuah') {
            newJumuah = { start: override.start, iqamah: override.iqamah };
        } else {
            // It's a daily prayer
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
