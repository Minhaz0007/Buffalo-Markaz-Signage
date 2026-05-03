import React, { useEffect, useRef, useState } from 'react';

// How often to check for a new deployment (polls /index.html and compares
// the build-version meta tag injected by vite.config.ts).
const POLL_INTERVAL_MS = 60_000;  // every minute
const INITIAL_DELAY_MS =  5_000;  // let the app settle before first check
const STABILIZE_MS     = 30_000;  // wait 30 s after first detection so the
                                   // full build has time to finish deploying

export const AutoUpdate: React.FC = () => {
  const [isUpdating, setIsUpdating] = useState(false);

  const baselineRef     = useRef<string | null>(null); // version on page load
  const pendingVersion  = useRef<string | null>(null); // version being stabilised
  const pendingTimer    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reloadScheduled = useRef(false);

  // ── Smooth reload ────────────────────────────────────────────────────────
  const doReload = () => {
    if (reloadScheduled.current) return;
    reloadScheduled.current = true;
    console.log('[AutoUpdate] New build confirmed — reloading display.');

    // Show the navy splash synchronously so the GPU compositor always has a
    // navy frame during navigation (prevents green flash on HDMI displays).
    const splash = document.getElementById('nav-splash');
    if (splash) splash.style.display = 'block';
    setIsUpdating(true);

    // Two RAFs guarantee the splash frame is in the GPU pipeline before we
    // navigate. 1 s covers even the slowest HDMI TV pipelines (300–800 ms).
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setTimeout(() => {
          // ?_r= cache-busts the CDN so fresh HTML is always fetched.
          const url = new URL(window.location.href);
          url.searchParams.set('_r', Date.now().toString());
          window.location.replace(url.toString());
        }, 1_000);
      });
    });
  };

  // ── Version check ────────────────────────────────────────────────────────
  const checkVersion = async () => {
    try {
      const res = await fetch(`/index.html?_=${Date.now()}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' },
      });
      if (!res.ok) return;

      const html    = await res.text();
      const match   = html.match(/<meta name="build-version" content="([^"]+)"/);
      const fetched = match?.[1] ?? null;
      if (!fetched) return;

      // First call — establish the baseline from the currently-running page.
      if (!baselineRef.current) {
        const localMeta  = document.querySelector<HTMLMetaElement>('meta[name="build-version"]');
        baselineRef.current = localMeta?.content ?? fetched;
        console.log('[AutoUpdate] Baseline version:', baselineRef.current);
        return;
      }

      // No change — clear any in-flight stabilisation timer (deploy reverted?).
      if (fetched === baselineRef.current) {
        if (pendingTimer.current) {
          clearTimeout(pendingTimer.current);
          pendingTimer.current  = null;
          pendingVersion.current = null;
        }
        return;
      }

      // New version already being waited on — do nothing.
      if (pendingVersion.current === fetched) return;

      // Different new version seen while already waiting — reset the timer.
      if (pendingTimer.current) clearTimeout(pendingTimer.current);

      pendingVersion.current = fetched;
      console.log('[AutoUpdate] New version detected, stabilising for 30 s:', fetched);

      pendingTimer.current = setTimeout(() => {
        // Re-confirm the version is still different before committing to reload.
        if (pendingVersion.current === fetched && !reloadScheduled.current) {
          pendingVersion.current = null;
          doReload();
        }
      }, STABILIZE_MS);

    } catch {
      // Network errors during a deploy are expected — silently retry next poll.
    }
  };

  // ── Poll ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    const initial = setTimeout(checkVersion, INITIAL_DELAY_MS);
    const poll    = setInterval(checkVersion, POLL_INTERVAL_MS);
    return () => {
      clearTimeout(initial);
      clearInterval(poll);
      if (pendingTimer.current) clearTimeout(pendingTimer.current);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Navy overlay shown briefly while the new page loads.
  return (
    <div
      className={`fixed inset-0 z-[9999] bg-[#0B1E3B] flex items-center justify-center transition-opacity duration-150 ease-out ${
        isUpdating ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
      }`}
    >
      <div className="text-white text-2xl font-semibold animate-pulse tracking-widest uppercase">
        Updating Display…
      </div>
    </div>
  );
};
