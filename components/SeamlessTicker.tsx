import React, { useEffect, useRef, useState, useCallback, useMemo, memo } from 'react';


interface SeamlessTickerProps {
  children: React.ReactNode;
  className?: string;
  /**
   * Scroll speed in pixels per second. Default: 60
   */
  baseSpeed?: number;
  /**
   * Scroll direction. Default: 'left' (right-to-left, standard ticker)
   */
  direction?: 'left' | 'right';
}

const SeamlessTickerInner: React.FC<SeamlessTickerProps> = ({
  children,
  className = '',
  baseSpeed = 60,
  direction = 'left',
}) => {
  const outerRef      = useRef<HTMLDivElement>(null);
  const containerRef  = useRef<HTMLDivElement>(null);
  const contentRef    = useRef<HTMLDivElement>(null);

  const [contentWidth,   setContentWidth]   = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);

  // Animation state kept in refs so rAF never triggers a React re-render.
  const rafRef      = useRef<number>(0);
  const positionRef = useRef<number>(0);
  const lastTimeRef = useRef<number | null>(null);

  // Mirror of contentWidth as a ref so the RAF loop can read the latest value
  // without needing to be restarted every time the content width changes.
  // This is the key fix for the stutter: when announcement items change and
  // the content is re-measured, the loop seamlessly picks up the new width
  // on the very next frame instead of being cancelled/restarted from pos=0.
  const contentWidthRef = useRef<number>(0);

  // ── Measurement ─────────────────────────────────────────────────────────────
  // getBoundingClientRect returns sub-pixel widths (e.g. 1438.75 px).
  // offsetWidth rounds to integers and would cause a 1-pixel seam at the
  // loop point every ~24 s — the faint "jump" that was visible before.
  const measure = useCallback(() => {
    if (!contentRef.current || !outerRef.current) return;
    const cw = contentRef.current.getBoundingClientRect().width;
    const ow = outerRef.current.getBoundingClientRect().width;

    // Update the ref immediately so the running RAF loop sees the new width
    // on the next frame — no loop restart required.
    const prevCw = contentWidthRef.current;
    contentWidthRef.current = cw;

    // Normalize the scroll position to the new content width so that if
    // contentWidth shrinks (e.g. an announcement item is removed), the position
    // stays within the valid [−cw, 0] range and the loop never jumps to 0.
    // JS `%` keeps the sign of the dividend, so negatives stay negative:
    //   e.g. (-800) % 600 = -200  ✓  (-300) % 1200 = -300  ✓
    if (prevCw > 0 && cw > 0 && positionRef.current !== 0) {
      positionRef.current = positionRef.current % cw;
    }

    // Update React state only when the change is significant (>0.5 px) so we
    // don't trigger extra re-renders for sub-pixel measurement noise.
    setContentWidth(prev  => Math.abs(prev  - cw) > 0.5 ? cw : prev);
    setContainerWidth(prev => Math.abs(prev - ow) > 0.5 ? ow : prev);
  }, []);

  useEffect(() => {
    measure();
    const ro = new ResizeObserver(measure);
    if (contentRef.current) ro.observe(contentRef.current);
    if (outerRef.current)   ro.observe(outerRef.current);
    return () => ro.disconnect();
  }, [measure]);

  // ── Clone count ──────────────────────────────────────────────────────────────
  // Enough copies to fill the visible area so the loop is always invisible.
  const repeatCount = useMemo(() => {
    if (!contentWidth || !containerWidth) return 4;
    return Math.ceil(containerWidth / contentWidth) + 2;
  }, [contentWidth, containerWidth]);

  // ── 60 Hz rAF animation loop ─────────────────────────────────────────────────
  // Advances position on every display frame using elapsed real time so the
  // ticker runs at the monitor's native refresh rate (60 Hz, 120 Hz, 144 Hz…).
  // Speed is defined in pixels/second via pxPerMs, so the scroll rate is
  // identical on every display — only motion smoothness improves at higher Hz.
  // The DOM transform is updated directly — no React state, no re-render, no
  // jitter from Supabase realtime or clock ticks.
  //
  // NOTE: contentWidth is intentionally NOT in the dependency array.
  // The loop reads contentWidthRef.current on every frame instead, so it
  // never needs to be restarted when announcement content changes.
  // This eliminates the stutter that occurred when Supabase pushed new items.
  useEffect(() => {
    const sign    = direction === 'left' ? -1 : 1;
    const pxPerMs = baseSpeed / 1000;

    // Reset to start position only when speed or direction actually changes.
    positionRef.current = 0;
    lastTimeRef.current = null;

    const tick = (timestamp: number) => {
      const cw = contentWidthRef.current;

      // Wait until first measurement is available — loop idles without moving.
      if (!cw || !containerRef.current) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      if (lastTimeRef.current === null) {
        lastTimeRef.current = timestamp;
      }

      // Cap elapsed to 200 ms so a tab becoming visible after being hidden
      // doesn't cause a massive single-frame jump.
      const elapsed = Math.min(timestamp - lastTimeRef.current, 200);
      lastTimeRef.current = timestamp;

      // Advance by the real elapsed time — runs at native display Hz.
      positionRef.current += sign * pxPerMs * elapsed;

      // Seamless loop: once we've scrolled exactly one content-width,
      // snap back to 0 — the first clone is visually identical to the
      // original so the jump is invisible.
      if (direction === 'left' && positionRef.current <= -cw) {
        positionRef.current += cw;
      } else if (direction === 'right' && positionRef.current >= cw) {
        positionRef.current -= cw;
      }

      // Write directly to the DOM — bypasses React diffing entirely.
      containerRef.current.style.transform = `translateX(${positionRef.current}px)`;

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafRef.current);
    };
  }, [baseSpeed, direction]); // contentWidth intentionally omitted — read via ref

  const isReady = contentWidth > 0;

  return (
    <div
      ref={outerRef}
      className={`overflow-hidden whitespace-nowrap flex ${className}`}
    >
      <div
        ref={containerRef}
        className="flex items-center"
        style={{
          // GPU compositing layer — keeps transform updates off the main thread.
          willChange: 'transform',
          // Hide until first measurement to prevent a single-frame flash.
          visibility: isReady ? 'visible' : 'hidden',
        }}
      >
        {/* Original — measured for width */}
        <div ref={contentRef} className="flex shrink-0">
          {children}
        </div>

        {/* Clones — fill viewport so the seamless loop is always off-screen */}
        {Array.from({ length: Math.max(0, repeatCount - 1) }).map((_, i) => (
          <div key={i} className="flex shrink-0">
            {children}
          </div>
        ))}
      </div>
    </div>
  );
};

// memo prevents re-renders when the parent clock ticks every second.
// The ticker only needs to re-render when the announcement items or speed change.
export const SeamlessTicker = memo(SeamlessTickerInner);
