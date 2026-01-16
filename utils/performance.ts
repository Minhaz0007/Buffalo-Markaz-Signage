// Performance utility functions for React optimization

/**
 * Shallow equality check - much faster than JSON.stringify
 * Compares primitive values and object references at one level deep
 */
export function shallowEqual<T extends Record<string, any>>(objA: T, objB: T): boolean {
  if (objA === objB) return true;

  if (!objA || !objB) return false;

  const keysA = Object.keys(objA);
  const keysB = Object.keys(objB);

  if (keysA.length !== keysB.length) return false;

  for (const key of keysA) {
    if (objA[key] !== objB[key]) return false;
  }

  return true;
}

/**
 * Deep equality check for prayer times objects
 * Optimized for the specific structure of DailyPrayers
 */
export function prayerTimesEqual(a: any, b: any): boolean {
  if (a === b) return true;
  if (!a || !b) return false;

  const prayers = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];

  for (const prayer of prayers) {
    if (!a[prayer] || !b[prayer]) return false;
    if (a[prayer].start !== b[prayer].start) return false;
    if (a[prayer].iqamah !== b[prayer].iqamah) return false;
  }

  return true;
}

/**
 * Throttle function execution - prevents excessive calls
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  return function(this: any, ...args: Parameters<T>) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}
