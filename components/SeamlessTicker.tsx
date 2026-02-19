import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';

interface SeamlessTickerProps {
  children: React.ReactNode;
  className?: string;
  /**
   * Scroll speed in pixels per second.
   * Default: 60px/s — smooth and legible on any display (30Hz, 60Hz, 120Hz).
   */
  baseSpeed?: number;
  /**
   * Direction of scrolling.
   * Default: 'left' (right-to-left, standard news ticker style)
   */
  direction?: 'left' | 'right';
}

export const SeamlessTicker: React.FC<SeamlessTickerProps> = ({
  children,
  className = "",
  baseSpeed = 60,
  direction = 'left'
}) => {
  const outerRef     = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef   = useRef<HTMLDivElement>(null);

  const [contentWidth,   setContentWidth]   = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);

  const isReady = contentWidth > 0 && containerWidth > 0;

  // Animation state kept entirely in refs — no React state needed.
  const requestRef  = useRef<number | undefined>(undefined);
  const startTimeRef = useRef<number | null>(null); // set on first animation frame

  // ── Measurement ─────────────────────────────────────────────────────────────
  const measure = useCallback(() => {
    if (contentRef.current && outerRef.current) {
      const cw = contentRef.current.offsetWidth;
      const ow = outerRef.current.offsetWidth;
      setContentWidth(prev  => Math.abs(prev  - cw) > 1 ? cw : prev);
      setContainerWidth(prev => Math.abs(prev - ow) > 1 ? ow : prev);
    }
  }, []);

  useEffect(() => {
    measure();
    const ro = new ResizeObserver(measure);
    if (contentRef.current)  ro.observe(contentRef.current);
    if (outerRef.current)    ro.observe(outerRef.current);
    return () => ro.disconnect();
  }, [measure]);

  // ── Clone count: enough copies to fill the viewport seamlessly ───────────────
  const repeatCount = useMemo(() => {
    if (!contentWidth || !containerWidth) return 4;
    return Math.ceil(containerWidth / contentWidth) + 2;
  }, [contentWidth, containerWidth]);

  // ── Smooth animation loop ────────────────────────────────────────────────────
  // Uses wall-clock elapsed time to compute position on every frame, giving
  // perfectly smooth motion at any refresh rate (30 / 60 / 120 Hz) with zero
  // jitter. There is no FPS throttle, no integer pixel snapping, and no
  // delta-accumulation drift — position is always exactly where it should be.
  useEffect(() => {
    if (!isReady || contentWidth === 0) return;

    // Reset start time whenever content/speed changes so position always
    // begins at 0 (prevents a visual jump on re-mount).
    startTimeRef.current = null;

    const animate = (timestamp: number) => {
      requestRef.current = requestAnimationFrame(animate);

      // Capture the animation origin on the very first frame.
      if (startTimeRef.current === null) {
        startTimeRef.current = timestamp;
        return;
      }

      const elapsed = timestamp - startTimeRef.current;

      // Continuous time-based position — the modulus handles seamless looping.
      const rawPos  = (baseSpeed * elapsed / 1000) % contentWidth;
      const x       = direction === 'left' ? -rawPos : rawPos;

      if (containerRef.current) {
        containerRef.current.style.transform = `translate3d(${x}px, 0, 0)`;
      }
    };

    requestRef.current = requestAnimationFrame(animate);

    return () => {
      if (requestRef.current !== undefined) cancelAnimationFrame(requestRef.current);
    };
  }, [isReady, contentWidth, baseSpeed, direction]);

  return (
    <div
      ref={outerRef}
      className={`overflow-hidden whitespace-nowrap flex ${className}`}
      style={{
        // Soft fade at both edges for a polished entry/exit
        maskImage: 'linear-gradient(to right, transparent, black 2%, black 98%, transparent)',
      }}
    >
      <div
        ref={containerRef}
        className="flex items-center will-change-transform"
        style={{
          transform: 'translate3d(0,0,0)',
          // Force GPU compositing layer — eliminates sub-pixel rounding on
          // the CPU side that would otherwise cause 1px jitter each frame.
          backfaceVisibility: 'hidden',
          WebkitBackfaceVisibility: 'hidden',
        } as React.CSSProperties}
      >
        {/* Primary content — measured for width reference */}
        <div ref={contentRef} className="flex shrink-0">
          {children}
        </div>

        {/* Seamless clones — fills the viewport so the loop is invisible */}
        {Array.from({ length: Math.max(0, repeatCount - 1) }).map((_, i) => (
          <div key={i} className="flex shrink-0">
            {children}
          </div>
        ))}
      </div>
    </div>
  );
};
