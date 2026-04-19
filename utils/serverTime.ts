// Server-time synchronization.
// On startup the app fetches /api/time (a Vercel Edge function that returns the
// server's UTC millisecond timestamp).  The round-trip time is halved and added
// to compute the drift between the server clock and the device's local clock.
// serverNow() applies that drift so all devices show the same time regardless
// of whether their system clocks are correct.

let driftMs = 0;

export async function syncServerTime(): Promise<void> {
  try {
    const t0 = Date.now();
    const res = await fetch('/api/time');
    if (!res.ok) return;
    const t1 = Date.now();
    const { utcMs } = (await res.json()) as { utcMs: number };
    // Estimate server time at the midpoint of the request to cancel network latency
    const networkDelayMs = (t1 - t0) / 2;
    driftMs = utcMs + networkDelayMs - t1;
  } catch {
    // Keep existing drift on failure; local time is the fallback
  }
}

export function serverNow(): Date {
  return new Date(Date.now() + driftMs);
}
