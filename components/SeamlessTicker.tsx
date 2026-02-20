import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';


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

export const SeamlessTicker: React.FC<SeamlessTickerProps> = ({
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

  // ── Measurement ─────────────────────────────────────────────────────────────
  // getBoundingClientRect returns sub-pixel widths (e.g. 1438.75 px).
  // offsetWidth rounds to integers and would cause a 1-pixel seam at the
  // loop point every ~24 s — the faint "jump" that was visible before.
  const measure = useCallback(() => {
    if (!contentRef.current || !outerRef.current) return;
    const cw = contentRef.current.getBoundingClientRect().width;
    const ow = outerRef.current.getBoundingClientRect().width;
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
  useEffect(() => {
    if (!contentWidth || !containerRef.current) return;

    const sign    = direction === 'left' ? -1 : 1;
    const pxPerMs = baseSpeed / 1000;

    // Reset to start position whenever content or speed changes.
    positionRef.current = 0;
    lastTimeRef.current = null;

    const tick = (timestamp: number) => {
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
      if (direction === 'left' && positionRef.current <= -contentWidth) {
        positionRef.current += contentWidth;
      } else if (direction === 'right' && positionRef.current >= contentWidth) {
        positionRef.current -= contentWidth;
      }

      // Write directly to the DOM — bypasses React diffing entirely.
      if (containerRef.current) {
        containerRef.current.style.transform = `translateX(${positionRef.current}px)`;
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafRef.current);
    };
  }, [contentWidth, baseSpeed, direction]);

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
