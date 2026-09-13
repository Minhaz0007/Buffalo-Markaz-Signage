/**
 * Hijri Date Calculator - Central Hilal Committee of North America (CHC) Convention
 *
 * Two modes:
 *
 * 1. ANCHOR MODE (preferred): Admin sets the Islamic month name, Gregorian start
 *    date, and month length (29/30) once per month after the CHC moon-sighting
 *    announcement. The app counts forward from that anchor date.
 *
 * 2. FALLBACK MODE: Uses JavaScript's built-in Islamic calendar, which currently
 *    aligns with CHC dates. Active when no anchor is configured, or when today
 *    falls outside the configured month's range.
 */

import { HijriSettings } from '../types';
import { toEasternDateStr, easternTimeStrToDate, findEasternMidnightMs } from './easternTime';
import { calculatePrayerTimes } from './prayerCalculator';

const BUFFALO_TIMEZONE = 'America/New_York';

const hijriDateFormatter = new Intl.DateTimeFormat('en-US-u-ca-islamic', {
  timeZone: BUFFALO_TIMEZONE,
  day: 'numeric',
  month: 'long',
  year: 'numeric'
});

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Parse a YYYY-MM-DD string into a local-midnight timestamp (DST-safe). */
function parseLocalDate(dateStr: string): number {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).getTime();
}

/**
 * Returns the "Islamic effective date" to use for Hijri calculations.
 *
 * The Islamic day begins at Maghrib (sunset), not at midnight, so once today's
 * sunset has passed, every Hijri calculation (anchor-mode and JS-fallback
 * alike) should already use tomorrow's Gregorian date/day number even though
 * the Gregorian calendar day hasn't turned over yet.
 *
 * Computed here (rather than passed in by callers) so every caller — the
 * signage screen and the Settings preview alike — rolls over at exactly the
 * same instant using the same sunset.
 */
function getIslamicEffectiveDate(now: Date): Date {
  let sunsetTimeStr: string;
  try {
    sunsetTimeStr = calculatePrayerTimes(now).sunset;
  } catch {
    return now;
  }

  const sunset = easternTimeStrToDate(sunsetTimeStr, now);
  if (!sunset || now.getTime() < sunset.getTime()) return now;

  const todayStr = toEasternDateStr(now);
  const [y, m, d] = todayStr.split('-').map(Number);
  const tomorrow = new Date(Date.UTC(y, m - 1, d));
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  const tomorrowStr = tomorrow.toISOString().slice(0, 10);

  // Anchor to noon Eastern on tomorrow's date so the Hijri formatters (which
  // read the Eastern calendar day) are unambiguous regardless of DST.
  return new Date(findEasternMidnightMs(tomorrowStr) + 12 * 60 * 60 * 1000);
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Returns the Hijri date string using the CHC anchor settings if configured,
 * otherwise falls back to the JS Islamic calendar.
 *
 * @param settings - HijriSettings from the database (may be unconfigured)
 * @param date     - Defaults to now
 * @returns e.g. "6 SHAWWAL 1447"
 */
export function getHijriDateFromSettings(
  settings: HijriSettings,
  date: Date = new Date()
): string {
  const effectiveDate = getIslamicEffectiveDate(date);

  if (settings.monthStartGregorian && settings.monthName && settings.year) {
    try {
      const effectiveStr = toEasternDateStr(effectiveDate);
      // monthStartGregorian is the Gregorian date whose sunset begins Day 1,
      // so Day 1 doesn't "arrive" (in effective-date terms) until the day
      // after it — no +1 offset needed here.
      const dayNumber = Math.round(
        (parseLocalDate(effectiveStr) - parseLocalDate(settings.monthStartGregorian)) /
        (24 * 60 * 60 * 1000)
      );

      if (dayNumber >= 1 && dayNumber <= settings.monthLength) {
        return `${dayNumber} ${settings.monthName.toUpperCase()} ${settings.year}`;
      }
    } catch {
      // fall through to JS calculation
    }
  }
  return getHijriDate(effectiveDate);
}

/**
 * Returns metadata about the current anchor status (used for the settings preview).
 */
export function getHijriAnchorStatus(
  settings: HijriSettings,
  date: Date = new Date()
): { dayNumber: number; isActive: boolean; isExpired: boolean; isNotStarted: boolean } {
  if (!settings.monthStartGregorian || !settings.monthName || !settings.year) {
    return { dayNumber: 0, isActive: false, isExpired: false, isNotStarted: false };
  }
  const effectiveStr = toEasternDateStr(getIslamicEffectiveDate(date));
  const dayNumber = Math.round(
    (parseLocalDate(effectiveStr) - parseLocalDate(settings.monthStartGregorian)) /
    (24 * 60 * 60 * 1000)
  );
  return {
    dayNumber,
    isActive: dayNumber >= 1 && dayNumber <= settings.monthLength,
    isExpired: dayNumber > settings.monthLength,
    isNotStarted: dayNumber < 1,
  };
}

/**
 * JS fallback: formats a date using the built-in Islamic calendar.
 * Currently aligns with CHC dates. Used when no anchor is configured.
 *
 * @param date - Defaults to now
 * @returns e.g. "6 SHAWWAL 1447"
 */
export function getHijriDate(date: Date = new Date()): string {
  try {
    const hijriFormatted = hijriDateFormatter.format(date);
    return hijriFormatted.replace(' AH', '').toUpperCase();
  } catch (error) {
    console.error('Error calculating Hijri date:', error);
    return 'HIJRI DATE UNAVAILABLE';
  }
}

/** Returns only the day and month portion, e.g. "6 SHAWWAL". */
export function getHijriDayMonth(date: Date = new Date()): string {
  return getHijriDate(date).replace(/\s+\d{4,5}\s*$/, '').trim();
}

/** Returns only the Hijri year number, e.g. 1447. */
export function getHijriYear(date: Date = new Date()): number {
  const yearMatch = getHijriDate(date).match(/\d{4,5}/);
  return yearMatch ? Number(yearMatch[0]) : 0;
}
