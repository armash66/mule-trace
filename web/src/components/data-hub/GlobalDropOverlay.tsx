import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../store/store';
import { UploadCloud } from 'lucide-react';

export const GlobalDropOverlay: React.FC = () => {
  const navigate = useNavigate();
  const { globalDragActive, setGlobalDragActive, setStagedFiles } = useStore();
  const [dragDepth, setDragDepth] = useState(0);

  useEffect(() => {
    const handleDragEnter = (e: DragEvent) => {
      e.preventDefault();
      if (e.dataTransfer && e.dataTransfer.types.includes('Files')) {
        setDragDepth((prev) => {
          const next = prev + 1;
          if (next === 1) setGlobalDragActive(true);
          return next;
        });
      }
    };

    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      setDragDepth((prev) => {
        const next = Math.max(0, prev - 1);
        if (next === 0) setGlobalDragActive(false);
        return next;
      });
    };

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = 'copy';
      }
    };

    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      setDragDepth(0);
      setGlobalDragActive(false);

      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        const files = Array.from(e.dataTransfer.files);
        setStagedFiles(files);
        navigate('/data?step=select');
      }
    };

    window.addEventListener('dragenter', handleDragEnter);
    window.addEventListener('dragleave', handleDragLeave);
    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('drop', handleDrop);

    return () => {
      window.removeEventListener('dragenter', handleDragEnter);
      window.removeEventListener('dragleave', handleDragLeave);
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('drop', handleDrop);
    };
  }, [navigate, setGlobalDragActive, setStagedFiles]);

  if (!globalDragActive) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(17, 17, 19, 0.72)',
        backdropFilter: 'blur(4px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          width: '560px',
          padding: '48px 36px',
          backgroundColor: 'var(--surface)',
          border: '2px dashed var(--accent)',
          textAlign: 'center',
          transform: 'scale(1.02)',
          transition: 'all 0.12s ease',
        }}
      >
        <div
          style={{
            width: '64px',
            height: '64px',
            backgroundColor: 'var(--accent-muted)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px auto',
          }}
        >
          <UploadCloud size={32} color="var(--accent)" />
        </div>
        <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--ink)', marginBottom: '8px' }}>
          Drop to add data
        </h2>
        <p style={{ fontSize: '13px', color: 'var(--ink-2)', lineHeight: 1.6, maxWidth: '420px', margin: '0 auto' }}>
          Release files anywhere to start data intake. Accepts <span className="mono">.csv</span>, <span className="mono">.tsv</span>, <span className="mono">.xlsx</span>, <span className="mono">.json</span>, or <span className="mono">.zip</span> archives up to 100 MB.
        </p>
      </div>
    </div>
  );
};
