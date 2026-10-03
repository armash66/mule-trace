import { useRef, useState, useEffect } from 'react';
import { useInView } from 'framer-motion';
import { useReducedMotion } from '../hooks/useReducedMotion';

export function useScrollReveal(options?: { amount?: number | 'some' | 'all'; once?: boolean }) {
  const ref = useRef<any>(null);
  const prefersReduced = useReducedMotion();
  const inView = useInView(ref, {
    amount: options?.amount ?? 0.1,
    once: options?.once ?? true,
    margin: '-40px 0px',
  });

  return {
    ref,
    isInView: prefersReduced ? true : inView,
  };
}

export function usePageVisibility(): boolean {
  const [isVisible, setIsVisible] = useState<boolean>(() =>
    typeof document !== 'undefined' ? document.visibilityState !== 'hidden' : true
  );

  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsVisible(document.visibilityState !== 'hidden');
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  return isVisible;
}
