import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';

// ── CSS Keyframes ─────────────────────────────────────────────────────────────
// Injected once into <head>. The end-position uses a CSS custom property set
// per-element so a single keyframe definition covers all speeds and widths.
// Running on the GPU compositor thread means React re-renders, Supabase
// realtime events, and the prayer clock cannot cause any jitter.
const STYLE_ID = 'seamless-ticker-kf';
const ensureKeyframes = () => {
  if (typeof document === 'undefined' || document.getElementById(STYLE_ID)) return;
  const el = document.createElement('style');
  el.id = STYLE_ID;
  // One keyframe rule; --_to is set inline per container element.
  el.textContent = `
    @keyframes _sticker {
      from { transform: translateX(0); }
      to   { transform: translateX(var(--_to)); }
    }
  `;
  document.head.appendChild(el);
};

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
  const outerRef     = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef   = useRef<HTMLDivElement>(null);

  const [contentWidth,   setContentWidth]   = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);

  // Inject keyframes on first mount (idempotent).
  useEffect(() => { ensureKeyframes(); }, []);

  // ── Measurement ─────────────────────────────────────────────────────────────
  // getBoundingClientRect returns sub-pixel widths (e.g. 1438.75px).
  // offsetWidth rounds to integers and would cause a 1-pixel seam at the
  // loop point every ~24 s — the faint "jump" that was visible before.
  const measure = useCallback(() => {
    if (!contentRef.current || !outerRef.current) return;
    const cw = contentRef.current.getBoundingClientRect().width;
    const ow = outerRef.current.getBoundingClientRect().width;
    // Only update if the change is meaningful (> 0.5 px) to avoid
    // ResizeObserver micro-fluctuations restarting the animation for nothing.
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

  // ── CSS animation properties ────────────────────────────────────────────────
  // duration (s) = contentWidth (px) / speed (px/s)
  // The animation shifts the container exactly one content-width, at which
  // point the first clone seamlessly replaces the original — infinite loop.
  const isReady  = contentWidth > 0;
  const duration = isReady ? contentWidth / baseSpeed : 0;
  const offset   = direction === 'left' ? `-${contentWidth}px` : `${contentWidth}px`;

  // The animation style is set directly on the element; changing duration or
  // offset causes the browser to smoothly restart from position 0.
  const animStyle: React.CSSProperties = isReady
    ? ({
        '--_to': offset,
        animation: `_sticker ${duration}s linear infinite`,
        // willChange tells the browser to keep this element on its own GPU
        // compositing layer, so the animation never triggers a repaint.
        willChange: 'transform',
      } as React.CSSProperties)
    : { visibility: 'hidden' }; // hide until measured to prevent flash

  return (
    <div
      ref={outerRef}
      className={`overflow-hidden whitespace-nowrap flex ${className}`}
    >
      <div
        ref={containerRef}
        className="flex items-center"
        style={animStyle}
      >
        {/* Original — measured for width */}
        <div ref={contentRef} className="flex shrink-0">
          {children}
        </div>

        {/* Clones — fill viewport so the loop is always off-screen */}
        {Array.from({ length: Math.max(0, repeatCount - 1) }).map((_, i) => (
          <div key={i} className="flex shrink-0">
            {children}
          </div>
        ))}
      </div>
    </div>
  );
};
