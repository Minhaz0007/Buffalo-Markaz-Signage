import { Coordinates, CalculationMethod, PrayerTimes, Prayer, Madhab } from 'adhan';
import { DailyPrayers } from '../types';

// Buffalo, NY coordinates (14212 zip code area)
const BUFFALO_COORDINATES = new Coordinates(42.8864, -78.8784);
const BUFFALO_TIMEZONE = 'America/New_York';

// Use custom calculation parameters for Hanafi madhab
// 18 degrees for both Fajr and Isha angles (Hanafi standard for Buffalo, NY)
// ISNA uses 15 degrees, but Hanafi madhab requires 18 degrees
const CALCULATION_PARAMS = CalculationMethod.NorthAmerica();
CALCULATION_PARAMS.fajrAngle = 18;  // Change from 15 to 18 for Hanafi
CALCULATION_PARAMS.ishaAngle = 18;  // Change from 15 to 18 for Hanafi

// Use Hanafi madhab for Asr calculation (common in many communities)
// Can be changed to Madhab.Shafi if needed
CALCULATION_PARAMS.madhab = Madhab.Hanafi;

// Memoization cache for Intl.DateTimeFormat instances
const formatterCache = new Map<string, Intl.DateTimeFormat>();

/**
 * Gets the date components for a specific timezone, with memoization for performance.
 */
const getTimeZoneParts = (date: Date, timeZone: string) => {
  let formatter = formatterCache.get(timeZone);

  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
    formatterCache.set(timeZone, formatter);
  }

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
 * Formats a Date object to "H:MM AM/PM" format in Buffalo timezone
 */
function formatTime(date: Date): string {
  const parts = getTimeZoneParts(date, BUFFALO_TIMEZONE);
  let hours = parts.hour;
  const minutes = parts.minute;
  const ampm = hours >= 12 ? 'PM' : 'AM';

  hours = hours % 12;
  hours = hours ? hours : 12; // the hour '0' should be '12'

  const minutesStr = minutes < 10 ? '0' + minutes : minutes;

  return `${hours}:${minutesStr} ${ampm}`;
}

/**
 * Finds the Date object corresponding to midnight in the Buffalo timezone for a given date.
 * This is crucial for correctly calculating prayer times across different server timezones and DST changes.
 */
const findBuffaloMidnight = (date: Date): Date => {
  const buffaloParts = getTimeZoneParts(date, BUFFALO_TIMEZONE);

  for (let hour = 0; hour < 24; hour++) {
    const testDate = new Date(Date.UTC(buffaloParts.year, buffaloParts.month - 1, buffaloParts.day, hour, 0, 0));
    const testParts = getTimeZoneParts(testDate, BUFFALO_TIMEZONE);

    if (
      testParts.hour === 0 &&
      testParts.minute === 0 &&
      testParts.year === buffaloParts.year &&
      testParts.month === buffaloParts.month &&
      testParts.day === buffaloParts.day
    ) {
      return testDate;
    }
  }

  // Fallback if not found (shouldn't happen in practice)
  return new Date(Date.UTC(buffaloParts.year, buffaloParts.month - 1, buffaloParts.day, 5, 0, 0));
};

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
  const calculationDate = findBuffaloMidnight(date);

  // Log calculation parameters for debugging
  console.log('🕌 Prayer Time Calculation:', {
    date: calculationDate.toISOString().split('T')[0],
    fajrAngle: CALCULATION_PARAMS.fajrAngle,
    ishaAngle: CALCULATION_PARAMS.ishaAngle,
    ishaInterval: CALCULATION_PARAMS.ishaInterval,
    madhab: 'Hanafi'
  });

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

  const result = {
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

  console.log('✅ Calculated Prayer Times:', {
    fajr: result.fajr.start,
    isha: result.isha.start
  });

  return result;
}

/**
 * Gets the next prayer after the current time
 * @param prayerTimes - The prayer times object
 * @returns The name of the next prayer
 */
export function getNextPrayer(prayerTimes: DailyPrayers): string {
  const now = new Date();

  // Get current time in Buffalo
  const buffaloParts = getTimeZoneParts(now, BUFFALO_TIMEZONE);
  const currentTime = buffaloParts.hour * 60 + buffaloParts.minute;

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
  const calculationDate = findBuffaloMidnight(date);

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
