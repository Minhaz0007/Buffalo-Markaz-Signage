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

const getTimeZoneOffset = (date: Date, timeZone: string) => {
  const parts = getTimeZoneParts(date, timeZone);
  const utcTime = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  return (utcTime - date.getTime()) / 60000;
};

const toTimeZoneDate = (date: Date, timeZone: string) => {
  const parts = getTimeZoneParts(date, timeZone);
  return new Date(parts.year, parts.month - 1, parts.day);
};

const shiftToTimeZone = (date: Date, baseDate: Date, timeZone: string) => {
  const localOffset = baseDate.getTimezoneOffset();
  const targetOffset = getTimeZoneOffset(baseDate, timeZone);
  const diffMinutes = targetOffset - localOffset;
  return new Date(date.getTime() + diffMinutes * 60 * 1000);
};

/**
 * Calculates prayer times for a specific date in Buffalo, NY
 *
 * DAYLIGHT SAVING TIME (DST) SUPPORT:
 * - Buffalo, NY observes DST (America/New_York timezone: EST/EDT)
 * - JavaScript Date objects automatically handle DST transitions
 * - The Adhan library uses local timezone from Date objects
 * - Prayer times will automatically adjust during DST changes
 * - No manual timezone configuration needed for client-side calculations
 *
 * @param date - The date to calculate prayer times for (defaults to today)
 * @returns DailyPrayers object with calculated times
 */
export function calculatePrayerTimes(date: Date = new Date()): DailyPrayers {
  // Create a new date at midnight in Buffalo timezone to avoid host TZ skew
  const calculationDate = toTimeZoneDate(date, BUFFALO_TIMEZONE);

  const prayerTimes = new PrayerTimes(BUFFALO_COORDINATES, calculationDate, CALCULATION_PARAMS);
  const shift = (time: Date) => shiftToTimeZone(time, calculationDate, BUFFALO_TIMEZONE);

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
      start: formatTime(shift(prayerTimes.fajr)),
      iqamah: formatTime(shift(fajrIqamah))
    },
    sunrise: formatTime(shift(prayerTimes.sunrise)),
    dhuhr: {
      name: 'Dhuhr',
      start: formatTime(shift(prayerTimes.dhuhr)),
      iqamah: formatTime(shift(dhuhrIqamah))
    },
    asr: {
      name: 'Asr',
      start: formatTime(shift(prayerTimes.asr)),
      iqamah: formatTime(shift(asrIqamah))
    },
    maghrib: {
      name: 'Maghrib',
      start: formatTime(shift(prayerTimes.maghrib)),
      iqamah: formatTime(shift(maghribIqamah))
    },
    isha: {
      name: 'Isha',
      start: formatTime(shift(prayerTimes.isha)),
      iqamah: formatTime(shift(ishaIqamah))
    },
    sunset: formatTime(shift(prayerTimes.sunset))
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
  const calculationDate = toTimeZoneDate(date, BUFFALO_TIMEZONE);
  const prayerTimes = new PrayerTimes(BUFFALO_COORDINATES, calculationDate, CALCULATION_PARAMS);
  const shift = (time: Date) => shiftToTimeZone(time, calculationDate, BUFFALO_TIMEZONE);

  // Khutbah typically starts 15-20 minutes before Dhuhr time
  const khutbahStart = new Date(prayerTimes.dhuhr.getTime() - 15 * 60 * 1000);
  // Salah starts at Dhuhr time or a few minutes after
  const salahTime = new Date(prayerTimes.dhuhr.getTime() + 5 * 60 * 1000);

  return {
    start: formatTime(shift(khutbahStart)),
    iqamah: formatTime(shift(salahTime))
  };
}
