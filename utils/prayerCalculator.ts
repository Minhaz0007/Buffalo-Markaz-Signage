import { Coordinates, CalculationMethod, PrayerTimes, Prayer, Madhab } from 'adhan';
import { DailyPrayers } from '../types';

// Buffalo, NY coordinates (14212 zip code area)
const BUFFALO_COORDINATES = new Coordinates(42.8864, -78.8784);

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
  // Create a new date at midnight in LOCAL timezone (handles DST automatically)
  const calculationDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  const prayerTimes = new PrayerTimes(BUFFALO_COORDINATES, calculationDate, CALCULATION_PARAMS);

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
      start: formatTime(prayerTimes.fajr),
      iqamah: formatTime(fajrIqamah)
    },
    sunrise: formatTime(prayerTimes.sunrise),
    dhuhr: {
      name: 'Dhuhr',
      start: formatTime(prayerTimes.dhuhr),
      iqamah: formatTime(dhuhrIqamah)
    },
    asr: {
      name: 'Asr',
      start: formatTime(prayerTimes.asr),
      iqamah: formatTime(asrIqamah)
    },
    maghrib: {
      name: 'Maghrib',
      start: formatTime(prayerTimes.maghrib),
      iqamah: formatTime(maghribIqamah)
    },
    isha: {
      name: 'Isha',
      start: formatTime(prayerTimes.isha),
      iqamah: formatTime(ishaIqamah)
    },
    sunset: formatTime(prayerTimes.sunset)
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
  const calculationDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
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
