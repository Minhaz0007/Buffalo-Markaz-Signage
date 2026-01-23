/**
 * Hijri Date Calculator - Shariah Board NY Convention
 *
 * IMPORTANT: This follows the Shariah Board NY ruling where:
 * - The Islamic date changes at 1:00 AM EST/EDT (America/New_York timezone)
 * - NOT at sunset/Maghrib as in traditional Islamic calendar
 *
 * This convention is used by many North American Islamic communities
 * for consistency and practical purposes.
 */

const BUFFALO_TIMEZONE = 'America/New_York';
const HIJRI_TRANSITION_HOUR = 1; // 1:00 AM

// CACHED FORMATTERS
const buffaloTimeFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: BUFFALO_TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false
});

const hijriDateFormatter = new Intl.DateTimeFormat('en-US-u-ca-islamic', {
  timeZone: BUFFALO_TIMEZONE,
  day: 'numeric',
  month: 'long',
  year: 'numeric'
});


/**
 * Gets the date/time components in Buffalo timezone
 */
function getBuffaloTime(date: Date = new Date()) {
  const parts = buffaloTimeFormatter.formatToParts(date);
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
}

/**
 * Gets the Hijri date following Shariah Board NY convention
 *
 * Logic:
 * - If current time is BEFORE 1:00 AM: Use previous civil day's Hijri date
 * - If current time is 1:00 AM or AFTER: Use current civil day's Hijri date
 *
 * Example:
 * - Friday 11:30 PM → Shows Friday's Hijri date
 * - Saturday 12:30 AM (after midnight but before 1 AM) → Still shows Friday's Hijri date
 * - Saturday 1:00 AM → Shows Saturday's Hijri date
 *
 * @param date - The date to get Hijri date for (defaults to now)
 * @returns Formatted Hijri date string (e.g., "27 RAJAB 1447")
 */
export function getHijriDate(date: Date = new Date()): string {
  try {
    const buffaloTime = getBuffaloTime(date);

    // CRITICAL ADJUSTMENT:
    // JavaScript's Islamic calendar uses traditional sunset-based date changes
    // Shariah Board NY uses 1 AM date changes
    // This causes JS to be ~1 day ahead of Shariah Board NY
    // Solution: subtract 1 day from civil date before querying

    let dateForHijri: Date;

    if (buffaloTime.hour < HIJRI_TRANSITION_HOUR) {
      // Before 1:00 AM on day D
      // We want day D-1's Hijri date (Shariah Board NY)
      // JS calendar is ahead, so ask for day D-2
      dateForHijri = new Date(date);
      dateForHijri.setDate(dateForHijri.getDate() - 2);
    } else {
      // 1:00 AM or later on day D
      // We want day D's Hijri date (Shariah Board NY)
      // JS calendar is ahead, so ask for day D-1
      dateForHijri = new Date(date);
      dateForHijri.setDate(dateForHijri.getDate() - 1);
    }

    // Format the Hijri date using JavaScript Intl API
    const hijriFormatted = hijriDateFormatter.format(dateForHijri);

    // Convert to uppercase and remove "AH" suffix
    // Example: "27 Rajab 1447 AH" → "27 RAJAB 1447"
    return hijriFormatted.replace(' AH', '').toUpperCase();

  } catch (error) {
    console.error('Error calculating Hijri date:', error);
    return 'HIJRI DATE UNAVAILABLE';
  }
}

/**
 * Gets the Hijri date with additional metadata
 * Useful for debugging or displaying additional information
 *
 * @param date - The date to get Hijri date for (defaults to now)
 * @returns Object with formatted date and metadata
 */
export function getHijriDateWithMetadata(date: Date = new Date()) {
  const buffaloTime = getBuffaloTime(date);
  const isBeforeTransition = buffaloTime.hour < HIJRI_TRANSITION_HOUR;
  const formattedDate = getHijriDate(date);

  return {
    formattedDate,
    buffaloTime: `${buffaloTime.hour.toString().padStart(2, '0')}:${buffaloTime.minute.toString().padStart(2, '0')}`,
    isBeforeTransition,
    transitionTime: `${HIJRI_TRANSITION_HOUR}:00 AM`,
    note: isBeforeTransition
      ? 'Before 1 AM - showing previous day\'s Islamic date'
      : 'After 1 AM - showing current day\'s Islamic date'
  };
}

/**
 * Formats just the Hijri day and month (without year)
 *
 * @param date - The date to format
 * @returns Formatted string (e.g., "27 RAJAB")
 */
export function getHijriDayMonth(date: Date = new Date()): string {
  const fullDate = getHijriDate(date);
  // Remove the year (last 4-5 digits)
  return fullDate.replace(/\s+\d{4,5}\s*$/, '').trim();
}

/**
 * Gets just the Hijri year
 *
 * @param date - The date to get year for
 * @returns Year number (e.g., 1447)
 */
export function getHijriYear(date: Date = new Date()): number {
  const fullDate = getHijriDate(date);
  const yearMatch = fullDate.match(/\d{4,5}/);
  return yearMatch ? Number(yearMatch[0]) : 0;
}
