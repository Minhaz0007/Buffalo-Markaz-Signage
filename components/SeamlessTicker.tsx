import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';

interface SeamlessTickerProps {
  children: React.ReactNode;
  className?: string;
  /**
   * Target speed in pixels per second.
   * The component will attempt to snap this to an integer number of pixels per frame
   * to ensure maximum sharpness and smoothness at the fixed 30fps rate.
   * Default: 60 (approx 2px per frame at 30Hz)
   */
  baseSpeed?: number;
  /**
   * Direction of scrolling.
   * Default: 'left' (Standard ticker: Right-to-Left movement)
   */
  direction?: 'left' | 'right';
}

export const SeamlessTicker: React.FC<SeamlessTickerProps> = ({
  children,
  className = "",
  baseSpeed = 60,
  direction = 'left'
}) => {
  const outerRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const [contentWidth, setContentWidth] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);

  // Use a ref for isReady to avoid re-triggering effects unnecessarily,
  // though we still need state to force re-render when ready.
  // Actually, contentWidth > 0 implies ready.
  const isReady = contentWidth > 0 && containerWidth > 0;

  const posRef = useRef(0);
  const requestRef = useRef<number>(undefined);

  // Measure content width and container width
  // Stable callback with no dependencies
  const measure = useCallback(() => {
    if (contentRef.current && outerRef.current) {
      const cWidth = contentRef.current.offsetWidth;
      const oWidth = outerRef.current.offsetWidth;

      setContentWidth(prev => Math.abs(prev - cWidth) > 1 ? cWidth : prev);
      setContainerWidth(prev => Math.abs(prev - oWidth) > 1 ? oWidth : prev);
    }
  }, []);

  // Initial measure and resize observer
  useEffect(() => {
    measure();

    // Use ResizeObserver to detect content size changes
    const ro = new ResizeObserver(() => {
        measure();
    });

    if (contentRef.current) {
        ro.observe(contentRef.current);
    }
    if (outerRef.current) {
        ro.observe(outerRef.current);
    }

    return () => ro.disconnect();
  }, [measure]); // measure is stable now

  // Calculate how many copies we need to fill the screen + buffer
  const repeatCount = useMemo(() => {
    if (!contentWidth || !containerWidth) return 4;
    return Math.ceil((containerWidth / contentWidth)) + 2;
  }, [contentWidth, containerWidth]);

  // Animation Loop - Locked to 30fps
  useEffect(() => {
    if (!isReady || contentWidth === 0) return;

    let lastTime = performance.now();
    const targetFps = 30;
    const interval = 1000 / targetFps;

    // Determine pixels per frame for 30fps target
    // We snap to integer to avoid sub-pixel jitter
    const step = Math.max(1, Math.round(baseSpeed / targetFps));

    const animate = (time: number) => {
        requestRef.current = requestAnimationFrame(animate);

        const delta = time - lastTime;

        if (delta > interval) {
            // Adjust lastTime to maintain cadence, but avoid spiraling if tab was backgrounded
            lastTime = time - (delta % interval);

            posRef.current += step;

            // Wrap around logic
            if (posRef.current >= contentWidth) {
                posRef.current -= contentWidth;
            }

            if (containerRef.current) {
                // Use translate3d for GPU acceleration
                const x = direction === 'left' ? -posRef.current : posRef.current;
                containerRef.current.style.transform = `translate3d(${x}px, 0, 0)`;
            }
        }
    };

    requestRef.current = requestAnimationFrame(animate);

    return () => {
        if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isReady, contentWidth, baseSpeed, direction]);

  return (
    <div
        ref={outerRef}
        className={`overflow-hidden whitespace-nowrap flex ${className}`}
        style={{ maskImage: 'linear-gradient(to right, transparent, black 2%, black 98%, transparent)' }}
    >
      <div
        ref={containerRef}
        className="flex items-center will-change-transform"
        style={{ transform: 'translate3d(0,0,0)' }}
      >
        {/* The first element is the reference for measurement */}
        <div ref={contentRef} className="flex shrink-0">
            {children}
        </div>

        {/* Clones */}
        {Array.from({ length: Math.max(0, repeatCount - 1) }).map((_, i) => (
             <div key={i} className="flex shrink-0">
                {children}
            </div>
        ))}
      </div>
    </div>
  );
};
