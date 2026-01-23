
import { useState, useEffect, useRef } from 'react';

/**
 * Hook to measure the screen's actual refresh rate.
 * Uses requestAnimationFrame to count frames over a 1-second period.
 *
 * @returns {number} Estimated refresh rate in Hz (e.g., 60, 120, 144)
 */
export const useRefreshRate = (): number => {
  const [refreshRate, setRefreshRate] = useState<number>(60); // Default to 60Hz
  const framesRef = useRef(0);
  const startTimeRef = useRef<number | null>(null);
  const requestRef = useRef<number | null>(null);

  useEffect(() => {
    const measure = (timestamp: number) => {
      if (!startTimeRef.current) {
        startTimeRef.current = timestamp;
      }

      const elapsed = timestamp - startTimeRef.current;

      if (elapsed >= 1000) {
        // One second passed, calculate fps
        const fps = Math.round((framesRef.current * 1000) / elapsed);

        // Sanity check: common refresh rates are usually multiples of 24, 30, 60
        // We'll trust the measurement but ensure it's at least 30 to avoid div/0 issues
        const safeFps = Math.max(30, fps);

        setRefreshRate(safeFps);

        // Reset for next measurement (optional, but good for adaptive changes)
        // For now, we just stop after one successful measurement to save resources
        return;
      }

      framesRef.current++;
      requestRef.current = requestAnimationFrame(measure);
    };

    requestRef.current = requestAnimationFrame(measure);

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, []);

  return refreshRate;
};
