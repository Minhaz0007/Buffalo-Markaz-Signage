import React, { useEffect, useRef, useState } from 'react';

// Returns milliseconds until the next 1:00 AM Eastern time.
// Uses the Intl API so DST transitions are handled correctly year-to-year.
function msUntilNextEastern1AM(): number {
  const now  = new Date();
  const fmt  = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    hour:     'numeric',
    minute:   'numeric',
    second:   'numeric',
    hour12:   false,
  });
  const parts = fmt.formatToParts(now);
  const get   = (type: string) =>
    parseInt(parts.find(p => p.type === type)!.value, 10);

  const secondsNow    = get('hour') * 3600 + get('minute') * 60 + get('second');
  const secondsTarget = 1 * 3600; // 01:00:00 Eastern

  // If we're already past 1 AM, target tomorrow's 1 AM
  const secondsLeft =
    secondsNow < secondsTarget
      ? secondsTarget - secondsNow
      : 24 * 3600 - secondsNow + secondsTarget;

  return secondsLeft * 1000;
}

export const AutoUpdate: React.FC = () => {
  const [isUpdating,      setIsUpdating]      = useState(false);
  const reloadScheduledRef = useRef(false);

  const performSmoothReload = () => {
    if (reloadScheduledRef.current) return;
    reloadScheduledRef.current = true;
    console.log('[DailyReload] 1:00 AM Eastern — performing nightly reload.');

    // Show the navy splash synchronously so the GPU compositor always has a
    // navy frame during navigation, preventing the green flash on HDMI displays.
    const splash = document.getElementById('nav-splash');
    if (splash) splash.style.display = 'block';

    setIsUpdating(true);

    // Two RAFs guarantee the splash is in the GPU pipeline.
    // 1 s covers the slowest HDMI TV pipelines (300–800 ms signal latency).
    // The ?_r= query param busts the CDN cache so fresh HTML is always fetched.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setTimeout(() => {
          const url = new URL(window.location.href);
          url.searchParams.set('_r', Date.now().toString());
          window.location.replace(url.toString());
        }, 1_000);
      });
    });
  };

  useEffect(() => {
    const ms = msUntilNextEastern1AM();
    console.log(
      `[DailyReload] Next refresh scheduled for 1:00 AM Eastern ` +
      `(in ${Math.round(ms / 60_000)} min).`
    );
    const timer = setTimeout(performSmoothReload, ms);
    return () => clearTimeout(timer);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      className={`fixed inset-0 z-[9999] bg-[#0B1E3B] flex items-center justify-center transition-opacity duration-150 ease-out ${
        isUpdating ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
      }`}
    >
      <div className="text-white text-2xl font-semibold animate-pulse tracking-widest uppercase">
        Refreshing Display…
      </div>
    </div>
  );
};
