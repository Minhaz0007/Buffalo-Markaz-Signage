/**
 * Hijri Date Calculator - Central Hilal Committee of North America (CHC) Convention
 *
 * IMPORTANT: This follows the CHC convention where:
 * - The Hijri date maps directly to the civil (Gregorian) date
 * - CHC determines Islamic months by actual moon sighting (ru'yah)
 * - This code uses JavaScript's built-in Islamic calendar which aligns with CHC dates
 *
 * If CHC announces a date that differs from the calculated result by ±1 day,
 * adjust the HIJRI_OFFSET constant below accordingly.
 */

// Set to 0 for CHC-aligned output.
// If CHC is 1 day ahead of what displays, set to +1.
// If CHC is 1 day behind, set to -1.
const HIJRI_OFFSET = 0;

const BUFFALO_TIMEZONE = 'America/New_York';

// CACHED FORMATTERS
const hijriDateFormatter = new Intl.DateTimeFormat('en-US-u-ca-islamic', {
  timeZone: BUFFALO_TIMEZONE,
  day: 'numeric',
  month: 'long',
  year: 'numeric'
});


/**
 * Gets the Hijri date following CHC (Central Hilal Committee of North America) convention.
 *
 * Logic: The civil (Gregorian) date maps directly to the CHC Hijri date.
 * e.g., Wednesday March 25, 2026 → 6 SHAWWAL 1447
 *
 * @param date - The date to get Hijri date for (defaults to now)
 * @returns Formatted Hijri date string (e.g., "6 SHAWWAL 1447")
 */
export function getHijriDate(date: Date = new Date()): string {
  try {
    let dateForHijri = date;

    if (HIJRI_OFFSET !== 0) {
      dateForHijri = new Date(date);
      dateForHijri.setDate(dateForHijri.getDate() + HIJRI_OFFSET);
    }

    // Format using JavaScript's built-in Islamic calendar
    const hijriFormatted = hijriDateFormatter.format(dateForHijri);

    // Convert to uppercase and remove "AH" suffix
    // Example: "6 Shawwal 1447 AH" → "6 SHAWWAL 1447"
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
  const formattedDate = getHijriDate(date);

  return {
    formattedDate,
    offset: HIJRI_OFFSET,
    note: HIJRI_OFFSET === 0
      ? 'CHC convention: civil date maps directly to Hijri date'
      : `CHC manual offset applied: ${HIJRI_OFFSET > 0 ? '+' : ''}${HIJRI_OFFSET} day(s)`
  };
}

/**
 * Formats just the Hijri day and month (without year)
 *
 * @param date - The date to format
 * @returns Formatted string (e.g., "6 SHAWWAL")
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
