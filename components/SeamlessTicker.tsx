import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useRefreshRate } from '../utils/useRefreshRate';

interface SeamlessTickerProps {
  children: React.ReactNode;
  className?: string;
  /**
   * Target speed in pixels per second.
   * The component will attempt to snap this to an integer number of pixels per frame
   * to ensure maximum sharpness and smoothness at the detected refresh rate.
   * Default: 120 (approx 2px per frame at 60Hz)
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
  baseSpeed = 120,
  direction = 'left'
}) => {
  const outerRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const [contentWidth, setContentWidth] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);
  const [isReady, setIsReady] = useState(false);

  const posRef = useRef(0);
  const requestRef = useRef<number>();
  const refreshRate = useRefreshRate(); // Starts at 60, updates after 1s

  // Determine pixels per frame
  // We snap to the nearest integer to avoid sub-pixel rendering artifacts (blur/jitter)
  // At 60Hz, 120px/s => 2px/frame.
  // At 120Hz, 120px/s => 1px/frame.
  const pixelsPerFrame = Math.max(1, Math.round(baseSpeed / Math.max(30, refreshRate)));

  // Measure content width and container width
  const measure = useCallback(() => {
    if (contentRef.current && outerRef.current) {
      const cWidth = contentRef.current.offsetWidth;
      const oWidth = outerRef.current.offsetWidth;

      let changed = false;
      if (Math.abs(cWidth - contentWidth) > 1) {
        setContentWidth(cWidth);
        changed = true;
      }
      if (Math.abs(oWidth - containerWidth) > 1) {
        setContainerWidth(oWidth);
        changed = true;
      }

      if (changed) setIsReady(true);
    }
  }, [contentWidth, containerWidth]);

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
  }, [measure]);

  // Calculate how many copies we need to fill the screen + buffer
  // We need enough copies so that when we scroll by contentWidth, we still have content.
  // Generally: (ContainerWidth / ContentWidth) + 2 (one for current, one for incoming, plus margin)
  // We default to 4 if dimensions aren't ready to be safe.
  const repeatCount = useMemo(() => {
    if (!contentWidth || !containerWidth) return 4;
    return Math.ceil((containerWidth / contentWidth)) + 2;
  }, [contentWidth, containerWidth]);

  // Animation Loop
  useEffect(() => {
    if (!isReady || contentWidth === 0) return;

    // Reset position if we resized significantly?
    // Actually, just let it flow.

    const animate = () => {
        posRef.current += pixelsPerFrame;

        // Wrap around logic
        // Once we have scrolled past the first element (contentWidth), we reset to 0.
        // This gives the illusion of infinite scroll because the second element is exactly at 0.
        if (posRef.current >= contentWidth) {
            posRef.current -= contentWidth;
        }

        if (containerRef.current) {
            // Use translate3d for GPU acceleration
            const x = direction === 'left' ? -posRef.current : posRef.current;
            containerRef.current.style.transform = `translate3d(${x}px, 0, 0)`;
        }

        requestRef.current = requestAnimationFrame(animate);
    };

    requestRef.current = requestAnimationFrame(animate);

    return () => {
        if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isReady, contentWidth, pixelsPerFrame, direction]);

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
