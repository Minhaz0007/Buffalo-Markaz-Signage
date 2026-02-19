import { useEffect, useRef, useState } from 'react';
import { supabase, isSupabaseConfigured } from '../utils/supabase';

/**
 * AutoUpdate — zero-green-screen deployment handler
 *
 * Problems solved:
 *
 * 1. GREEN SCREEN on new Vercel deployment
 *    Vercel replaces JS chunk files with new content-hash filenames. If the
 *    running app tries to lazy-load an old chunk URL → 404 → React crash →
 *    Chrome GPU compositor flashes green. A synchronous guard in index.html
 *    catches those failures first (see the <script> block in index.html).
 *    This component handles the graceful version-change reload path.
 *
 * 2. TABS RELOADING OUT OF SYNC
 *    Each Chrome tab previously polled independently. Tab 1 could reload
 *    60 seconds before Tab 2, so the two HDMI screens showed different
 *    content for up to a minute.
 *    Fix: Supabase Realtime BROADCAST (not postgres_changes — no SQL needed,
 *    pure WebSocket). The first tab to detect a new build broadcasts
 *    "reload" to the shared channel. ALL subscribed tabs receive it in
 *    milliseconds and reload simultaneously.
 *
 * 3. 30-SECOND BLIND WINDOW
 *    The old component waited 30 s before the first check. During that
 *    window a chunk-load crash could occur with no reload guard.
 *    Fix: first check runs after 5 s (enough time for the app to settle).
 */

const BROADCAST_CHANNEL = 'signage-app-updates';
const BROADCAST_EVENT    = 'reload';
const POLL_INTERVAL_MS   = 60_000; // 1 minute fallback poll
const INITIAL_DELAY_MS   =  5_000; // 5 s — enough for app to fully mount

export const AutoUpdate: React.FC = () => {
  const [isUpdating, setIsUpdating] = useState(false);

  // Stable refs — never need to re-create the effect
  const currentVersionRef  = useRef<string | null>(null);
  const reloadScheduledRef = useRef(false);       // guard against double-reload
  const channelRef         = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // ── Smooth reload ──────────────────────────────────────────────────────────
  // Shows a navy overlay for 800 ms (long enough to hide any compositor
  // flash) then reloads. The html/body navy background in index.html means
  // the screen stays dark navy throughout — no green, no white.
  const performSmoothReload = () => {
    if (reloadScheduledRef.current) return; // prevent double-trigger
    reloadScheduledRef.current = true;
    console.log('[AutoUpdate] Performing smooth reload...');
    setIsUpdating(true);
    setTimeout(() => window.location.reload(), 800);
  };

  // ── Broadcast reload signal to ALL tabs ───────────────────────────────────
  // Supabase Realtime Broadcast sends a raw WebSocket message to every
  // client subscribed to the same channel. No database write, no SQL.
  // The sending tab also calls performSmoothReload() immediately after.
  const broadcastReload = async (newVersion: string) => {
    if (!channelRef.current) { performSmoothReload(); return; }
    try {
      await channelRef.current.send({
        type:    'broadcast',
        event:   BROADCAST_EVENT,
        payload: { version: newVersion },
      });
    } catch (err) {
      console.warn('[AutoUpdate] Broadcast failed, reloading locally only.', err);
    }
    // Always reload this tab too (sender doesn't receive its own broadcast)
    performSmoothReload();
  };

  // ── Version check ──────────────────────────────────────────────────────────
  const checkForUpdates = async () => {
    try {
      const res = await fetch(`/index.html?_=${Date.now()}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate', 'Pragma': 'no-cache' },
      });
      if (!res.ok) return;

      const html = await res.text();
      const match = html.match(/<meta name="build-version" content="([^"]+)"/);
      const fetched = match?.[1] ?? null;
      if (!fetched) return;

      if (!currentVersionRef.current) {
        // First check — establish baseline
        const localMeta = document.querySelector<HTMLMetaElement>('meta[name="build-version"]');
        currentVersionRef.current = localMeta?.content || fetched;
        console.log('[AutoUpdate] Version baseline:', currentVersionRef.current);
        return;
      }

      if (fetched !== currentVersionRef.current) {
        console.log('[AutoUpdate] New version detected:', fetched, '(was:', currentVersionRef.current + ')');
        // Broadcast to all tabs → all reload simultaneously
        broadcastReload(fetched);
      }
    } catch {
      // Network errors are expected during deploys — ignore and retry next poll
    }
  };

  // ── Effect: subscribe + poll ───────────────────────────────────────────────
  useEffect(() => {
    // Subscribe to the broadcast channel so this tab reloads when ANY other
    // tab (or the same tab) broadcasts the reload signal.
    if (isSupabaseConfigured() && supabase) {
      const ch = supabase
        .channel(BROADCAST_CHANNEL)
        .on('broadcast', { event: BROADCAST_EVENT }, () => {
          console.log('[AutoUpdate] Received reload broadcast — reloading now.');
          performSmoothReload();
        })
        .subscribe();
      channelRef.current = ch;
    }

    // Initial check after a short settle delay, then poll every minute
    const initialTimer = setTimeout(checkForUpdates, INITIAL_DELAY_MS);
    const pollInterval = setInterval(checkForUpdates, POLL_INTERVAL_MS);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(pollInterval);
      if (channelRef.current && supabase) {
        supabase.removeChannel(channelRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally empty — refs keep values stable

  // ── Navy overlay ───────────────────────────────────────────────────────────
  return (
    <div
      className={`fixed inset-0 z-[9999] bg-[#0B1E3B] flex items-center justify-center transition-opacity duration-700 ease-in-out ${
        isUpdating ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
      }`}
    >
      <div className="text-white text-2xl font-semibold animate-pulse tracking-widest uppercase">
        Updating Display…
      </div>
    </div>
  );
};
