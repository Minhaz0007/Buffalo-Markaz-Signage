/**
 * Eastern Timezone Utilities
 *
 * All time/date logic in this app must operate in America/New_York (Eastern)
 * regardless of the device's system timezone.  This module centralises the
 * Intl-based helpers so every component uses exactly the same approach —
 * the same pattern already used by prayerCalculator.ts and hijriDate.ts.
 *
 * DST is handled automatically: the Intl API knows the America/New_York
 * DST rules (spring-forward / fall-back) for many years into the future,
 * so no manual year-by-year adjustment is ever required.
 */

export const EASTERN_TZ = 'America/New_York';

// Module-level cached formatters (created once, reused on every call).
const easternDateFmt = new Intl.DateTimeFormat('en-CA', {
  timeZone: EASTERN_TZ,
  // en-CA locale produces YYYY-MM-DD which is the ISO format we need
});

const easternPartsFmt = new Intl.DateTimeFormat('en-US', {
  timeZone: EASTERN_TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

/** Returns 'YYYY-MM-DD' for the given instant in America/New_York timezone. */
export const toEasternDateStr = (date: Date): string => easternDateFmt.format(date);

/** Returns hours×60+minutes for the given instant in America/New_York timezone. */
export const toEasternMinutes = (date: Date): number => {
  const parts = Object.fromEntries(
    easternPartsFmt.formatToParts(date)
      .filter(p => p.type !== 'literal')
      .map(p => [p.type, p.value])
  );
  return Number(parts.hour) * 60 + Number(parts.minute);
};

/**
 * Returns 0 (Sun) … 6 (Sat) for the given instant in America/New_York timezone.
 * Use this instead of Date.getDay() to avoid device-timezone drift (e.g. a UTC
 * server sees Saturday at midnight while Buffalo is still Friday 8 PM).
 */
const DOW = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const easternDowFmt = new Intl.DateTimeFormat('en-US', {
  timeZone: EASTERN_TZ,
  weekday: 'long',
});
export const toEasternDayOfWeek = (date: Date): number =>
  DOW.indexOf(easternDowFmt.format(date));

/**
 * Returns the UTC millisecond timestamp of 00:00 (midnight) in Eastern
 * timezone for the supplied YYYY-MM-DD Eastern date string.
 *
 * Strategy: iterate candidate UTC hours and find the one whose Eastern
 * representation is 00:00 on that calendar date.  This correctly handles
 * both EST (UTC-5) and EDT (UTC-4) without any hardcoded offset, so it
 * remains accurate through every future DST transition automatically.
 *
 * Fallback: if the loop finds nothing (should never happen in practice),
 * returns UTC-5 (EST) midnight as a safe default.
 */
export const findEasternMidnightMs = (easternDateStr: string): number => {
  const [year, month, day] = easternDateStr.split('-').map(Number);
  for (let h = 0; h < 24; h++) {
    const t = new Date(Date.UTC(year, month - 1, day, h, 0, 0));
    const parts = Object.fromEntries(
      easternPartsFmt.formatToParts(t)
        .filter(p => p.type !== 'literal')
        .map(p => [p.type, p.value])
    );
    if (
      Number(parts.hour) === 0 &&
      Number(parts.minute) === 0 &&
      Number(parts.year) === year &&
      Number(parts.month) === month &&
      Number(parts.day) === day
    ) {
      return t.getTime();
    }
  }
  // Fallback: EST = UTC-5
  return Date.UTC(year, month - 1, day, 5, 0, 0);
};

/**
 * Converts an Eastern prayer time string ("H:MM AM/PM") to an absolute Date
 * object anchored to the Eastern civil date that `now` falls on.
 *
 * Unlike `new Date(); date.setHours(h, m)` this is correct regardless of the
 * device's system timezone, and handles DST automatically.
 *
 * Returns null if the time string is invalid.
 */
export const easternTimeStrToDate = (timeStr: string, now: Date): Date | null => {
  const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})\s?(AM|PM)$/i);
  if (!match) return null;
  let hours = parseInt(match[1]);
  const minutes = parseInt(match[2]);
  const ampm = match[3].toUpperCase();
  if (ampm === 'PM' && hours < 12) hours += 12;
  if (ampm === 'AM' && hours === 12) hours = 0;
  const midnightMs = findEasternMidnightMs(toEasternDateStr(now));
  return new Date(midnightMs + (hours * 60 + minutes) * 60 * 1000);
};
