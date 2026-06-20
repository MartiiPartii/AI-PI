'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

/**
 * Thin client-side wrapper that fades/slides its children in on first scroll
 * into view. The children themselves are rendered on the SERVER and passed in —
 * this wrapper adds only the motion, so the actual content is present in the
 * initial HTML (works without JS, crawlable).
 *
 * Progressive enhancement: the hidden starting state lives in CSS gated on the
 * `.js` class (see index.css), so the content is only ever hidden when JS is
 * present to reveal it again. `prefers-reduced-motion` disables the transition.
 */
export function Reveal({
  children,
  className,
  delayMs = 0,
}: {
  readonly children: React.ReactNode;
  readonly className?: string;
  /** Stagger reveals within a group, in milliseconds. */
  readonly delayMs?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisible(true);
            observer.disconnect();
          }
        }
      },
      { rootMargin: '0px 0px -10% 0px', threshold: 0.1 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{ transitionDelay: visible ? `${delayMs}ms` : '0ms' }}
      className={cn('reveal', visible && 'reveal--in', className)}
    >
      {children}
    </div>
  );
}
