import React, { useEffect, useRef } from 'react';
import { useStore } from '../store/store';
import { X, Undo2 } from 'lucide-react';

export const Toast: React.FC = () => {
  const { toast, clearToast } = useStore();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const remainingTimeRef = useRef<number>(5000);
  const startTimeRef = useRef<number>(Date.now());

  useEffect(() => {
    if (!toast) return;
    remainingTimeRef.current = 5000;
    startTimeRef.current = Date.now();

    timerRef.current = setTimeout(() => {
      clearToast();
    }, 5000);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [toast, clearToast]);

  const handleMouseEnter = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
      const elapsed = Date.now() - startTimeRef.current;
      remainingTimeRef.current = Math.max(1000, remainingTimeRef.current - elapsed);
    }
  };

  const handleMouseLeave = () => {
    if (!timerRef.current && toast) {
      startTimeRef.current = Date.now();
      timerRef.current = setTimeout(() => {
        clearToast();
      }, remainingTimeRef.current);
    }
  };

  if (!toast) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        position: 'fixed',
        bottom: '24px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        background: 'linear-gradient(180deg, #181C24, #12151B)',
        color: 'var(--text-0)',
        padding: '10px 18px',
        fontSize: '13px',
        border: '1px solid var(--line-strong)',
        borderRadius: 'var(--radius-6)',
        boxShadow: 'var(--shadow-md)',
        maxWidth: '90vw',
      }}
    >
      <span style={{ fontFamily: 'var(--font-body)', fontWeight: 500 }}>{toast.message}</span>
      {toast.undoAction && (
        <button
          type="button"
          onClick={() => {
            toast.undoAction?.();
            clearToast();
          }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            backgroundColor: 'transparent',
            border: 'none',
            color: 'var(--signal)',
            fontWeight: 600,
            cursor: 'pointer',
            padding: '2px 6px',
            fontFamily: 'var(--font-mono)',
            fontSize: '12px',
          }}
        >
          <Undo2 size={13} />
          Undo (5s)
        </button>
      )}
      <button
        type="button"
        aria-label="Close notification"
        onClick={clearToast}
        style={{
          background: 'transparent',
          border: 'none',
          color: 'var(--text-2)',
          cursor: 'pointer',
          padding: '2px',
          display: 'flex',
          alignItems: 'center',
          transition: 'color 150ms ease',
        }}
        onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = 'var(--text-0)')}
        onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = 'var(--text-2)')}
      >
        <X size={14} />
      </button>
    </div>
  );
};

