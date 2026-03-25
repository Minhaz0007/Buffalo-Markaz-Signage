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
import { toEasternDateStr } from './easternTime';

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
  if (settings.monthStartGregorian && settings.monthName && settings.year) {
    try {
      const todayStr = toEasternDateStr(date);
      const daysDiff = Math.round(
        (parseLocalDate(todayStr) - parseLocalDate(settings.monthStartGregorian)) /
        (24 * 60 * 60 * 1000)
      );
      const dayNumber = daysDiff + 1; // 1-indexed

      if (dayNumber >= 1 && dayNumber <= settings.monthLength) {
        return `${dayNumber} ${settings.monthName.toUpperCase()} ${settings.year}`;
      }
    } catch {
      // fall through to JS calculation
    }
  }
  return getHijriDate(date);
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
  const todayStr = toEasternDateStr(date);
  const daysDiff = Math.round(
    (parseLocalDate(todayStr) - parseLocalDate(settings.monthStartGregorian)) /
    (24 * 60 * 60 * 1000)
  );
  const dayNumber = daysDiff + 1;
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
