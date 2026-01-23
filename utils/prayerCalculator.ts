import { Coordinates, CalculationMethod, PrayerTimes, Prayer, Madhab } from 'adhan';
import { DailyPrayers } from '../types';

// Buffalo, NY coordinates (14212 zip code area)
const BUFFALO_COORDINATES = new Coordinates(42.8864, -78.8784);
const BUFFALO_TIMEZONE = 'America/New_York';

// Use ISNA (Islamic Society of North America) calculation method
// This is the most commonly used method in North America
const CALCULATION_PARAMS = CalculationMethod.NorthAmerica();

// Use Hanafi madhab for Asr calculation (common in many communities)
// Can be changed to Madhab.Shafi if needed
CALCULATION_PARAMS.madhab = Madhab.Hanafi;

/**
 * Formats a Date object to "H:MM AM/PM" format
 */
function formatTime(date: Date): string {
  let hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';

  hours = hours % 12;
  hours = hours ? hours : 12; // the hour '0' should be '12'

  const minutesStr = minutes < 10 ? '0' + minutes : minutes;

  return `${hours}:${minutesStr} ${ampm}`;
}

/**
 * Gets the date components for a specific timezone
 */
const getTimeZoneParts = (date: Date, timeZone: string) => {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  const parts = formatter.formatToParts(date);
  const values = Object.fromEntries(
    parts.filter(part => part.type !== 'literal').map(part => [part.type, part.value])
  );

  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
    hour: Number(values.hour),
    minute: Number(values.minute),
    second: Number(values.second)
  };
};

/**
 * Helper to find the UTC date that corresponds to midnight in Buffalo
 * Optimized to check likely offsets (EST/EDT) first
 */
function findBuffaloMidnightUTC(buffaloParts: { year: number, month: number, day: number }): Date {
  // Try likely offsets first: EST (UTC-5) -> 5:00 UTC, EDT (UTC-4) -> 4:00 UTC
  // We check 5 first because standard time is the "base"
  const likelyHours = [5, 4];

  for (const hour of likelyHours) {
    const testDate = new Date(Date.UTC(buffaloParts.year, buffaloParts.month - 1, buffaloParts.day, hour, 0, 0));
    const testParts = getTimeZoneParts(testDate, BUFFALO_TIMEZONE);

    if (testParts.hour === 0 && testParts.minute === 0 &&
        testParts.year === buffaloParts.year &&
        testParts.month === buffaloParts.month &&
        testParts.day === buffaloParts.day) {
      return testDate;
    }
  }

  // Fallback to searching all hours (just in case of weird timezone rules or changes)
  for (let hour = 0; hour < 24; hour++) {
    // Skip hours we already checked
    if (likelyHours.includes(hour)) continue;

    const testDate = new Date(Date.UTC(buffaloParts.year, buffaloParts.month - 1, buffaloParts.day, hour, 0, 0));
    const testParts = getTimeZoneParts(testDate, BUFFALO_TIMEZONE);

    if (testParts.hour === 0 && testParts.minute === 0 &&
        testParts.year === buffaloParts.year &&
        testParts.month === buffaloParts.month &&
        testParts.day === buffaloParts.day) {
      return testDate;
    }
  }

  // Ultimate fallback
  return new Date(Date.UTC(buffaloParts.year, buffaloParts.month - 1, buffaloParts.day, 5, 0, 0));
}

/**
 * Calculates prayer times for a specific date in Buffalo, NY
 *
 * TIMEZONE HANDLING:
 * - This code may run on servers in different timezones (e.g., UTC)
 * - The adhan library calculates astronomical times but returns Date objects in system timezone
 * - Solution: Pass a Date representing midnight in Buffalo timezone to the adhan library
 * - This ensures the library calculates for the correct civil date in Buffalo
 * - Prayer times are returned as Date objects whose hours/minutes represent Buffalo local time
 *
 * DAYLIGHT SAVING TIME (DST) SUPPORT:
 * - Buffalo, NY observes DST (America/New_York timezone: EST/EDT)
 * - Midnight in Buffalo is 5:00 AM UTC during EST (winter) or 4:00 AM UTC during EDT (summer)
 * - We dynamically find the correct UTC hour that corresponds to midnight Buffalo time
 * - Prayer times will automatically adjust during DST changes
 *
 * @param date - The date to calculate prayer times for (defaults to today)
 * @returns DailyPrayers object with calculated times
 */
export function calculatePrayerTimes(date: Date = new Date()): DailyPrayers {
  // Get the current date in Buffalo timezone
  const buffaloParts = getTimeZoneParts(date, BUFFALO_TIMEZONE);

  // CRITICAL: We need to create a Date that represents midnight in Buffalo
  // The adhan library uses this date to calculate prayer times
  // We need to find what UTC hour corresponds to midnight Buffalo time
  // This changes with DST: EST (winter) = UTC-5, EDT (summer) = UTC-4

  // Find midnight in Buffalo by testing which UTC hour gives us 00:00 in Buffalo
  // Optimized to check likely hours first
  const calculationDate = findBuffaloMidnightUTC(buffaloParts);

  // Calculate prayer times using the adhan library
  const prayerTimes = new PrayerTimes(BUFFALO_COORDINATES, calculationDate, CALCULATION_PARAMS);

  // Format times directly - they're already in the correct timezone because
  // we passed midnight Buffalo time to the adhan library
  const formatPrayerTime = (time: Date) => formatTime(time);

  // Calculate Iqamah times (typically 10-15 minutes after adhan)
  // These are reasonable defaults, can be adjusted based on masjid practice
  const fajrIqamah = new Date(prayerTimes.fajr.getTime() + 15 * 60 * 1000); // +15 min
  const dhuhrIqamah = new Date(prayerTimes.dhuhr.getTime() + 10 * 60 * 1000); // +10 min
  const asrIqamah = new Date(prayerTimes.asr.getTime() + 10 * 60 * 1000); // +10 min
  const maghribIqamah = new Date(prayerTimes.maghrib.getTime() + 5 * 60 * 1000); // +5 min
  const ishaIqamah = new Date(prayerTimes.isha.getTime() + 15 * 60 * 1000); // +15 min

  return {
    fajr: {
      name: 'Fajr',
      start: formatPrayerTime(prayerTimes.fajr),
      iqamah: formatPrayerTime(fajrIqamah)
    },
    sunrise: formatPrayerTime(prayerTimes.sunrise),
    dhuhr: {
      name: 'Dhuhr',
      start: formatPrayerTime(prayerTimes.dhuhr),
      iqamah: formatPrayerTime(dhuhrIqamah)
    },
    asr: {
      name: 'Asr',
      start: formatPrayerTime(prayerTimes.asr),
      iqamah: formatPrayerTime(asrIqamah)
    },
    maghrib: {
      name: 'Maghrib',
      start: formatPrayerTime(prayerTimes.maghrib),
      iqamah: formatPrayerTime(maghribIqamah)
    },
    isha: {
      name: 'Isha',
      start: formatPrayerTime(prayerTimes.isha),
      iqamah: formatPrayerTime(ishaIqamah)
    },
    sunset: formatPrayerTime(prayerTimes.sunset)
  };
}

/**
 * Gets the next prayer after the current time
 * @param prayerTimes - The prayer times object
 * @returns The name of the next prayer
 */
export function getNextPrayer(prayerTimes: DailyPrayers): string {
  const now = new Date();
  const currentTime = now.getHours() * 60 + now.getMinutes();

  const parseToMinutes = (timeStr: string): number => {
    const [time, modifier] = timeStr.split(' ');
    let [hours, minutes] = time.split(':').map(Number);
    if (modifier === 'PM' && hours < 12) hours += 12;
    if (modifier === 'AM' && hours === 12) hours = 0;
    return hours * 60 + minutes;
  };

  const prayers = [
    { name: 'Fajr', time: parseToMinutes(prayerTimes.fajr.start) },
    { name: 'Dhuhr', time: parseToMinutes(prayerTimes.dhuhr.start) },
    { name: 'Asr', time: parseToMinutes(prayerTimes.asr.start) },
    { name: 'Maghrib', time: parseToMinutes(prayerTimes.maghrib.start) },
    { name: 'Isha', time: parseToMinutes(prayerTimes.isha.start) }
  ];

  const nextPrayer = prayers.find(p => p.time > currentTime);
  return nextPrayer ? nextPrayer.name : 'Fajr'; // If all passed, next is tomorrow's Fajr
}

/**
 * Calculates Jumu'ah (Friday prayer) times
 * Typically Jumu'ah replaces Dhuhr on Fridays
 * @param date - The date (should be a Friday)
 * @returns Object with start (Khutbah) and iqamah times
 */
export function calculateJumuahTimes(date: Date = new Date()): { start: string; iqamah: string } {
  // Get the current date in Buffalo timezone
  const buffaloParts = getTimeZoneParts(date, BUFFALO_TIMEZONE);

  // Find midnight in Buffalo (same logic as calculatePrayerTimes)
  // Optimized to check likely hours first
  const calculationDate = findBuffaloMidnightUTC(buffaloParts);

  // Calculate prayer times
  const prayerTimes = new PrayerTimes(BUFFALO_COORDINATES, calculationDate, CALCULATION_PARAMS);

  // Khutbah typically starts 15-20 minutes before Dhuhr time
  const khutbahStart = new Date(prayerTimes.dhuhr.getTime() - 15 * 60 * 1000);
  // Salah starts at Dhuhr time or a few minutes after
  const salahTime = new Date(prayerTimes.dhuhr.getTime() + 5 * 60 * 1000);

  return {
    start: formatTime(khutbahStart),
    iqamah: formatTime(salahTime)
  };
}
