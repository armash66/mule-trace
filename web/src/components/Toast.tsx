import React from 'react';
import { useStore } from '../store/store';
import { X, Undo2 } from 'lucide-react';

export const Toast: React.FC = () => {
  const { toast, clearToast } = useStore();

  if (!toast) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        backgroundColor: 'var(--ink)',
        color: 'var(--ink-inverted)',
        padding: '10px 16px',
        fontSize: '13px',
        border: '1px solid var(--line-strong)',
      }}
    >
      <span>{toast.message}</span>
      {toast.undoAction && (
        <button
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
            color: 'var(--accent)',
            fontWeight: 600,
            cursor: 'pointer',
            padding: '2px 6px',
            }}
        >
          <Undo2 size={13} />
          Undo (5s)
        </button>
      )}
      <button
        onClick={clearToast}
        style={{
          background: 'transparent',
          border: 'none',
          color: 'var(--ink-3)',
          cursor: 'pointer',
          padding: '2px',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <X size={14} />
      </button>
    </div>
  );
};
