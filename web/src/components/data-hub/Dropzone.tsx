import React, { useRef, useState } from 'react';

interface DropzoneProps {
  onFilesSelected: (files: File[]) => void;
  isUploading?: boolean;
}

export const Dropzone: React.FC<DropzoneProps> = ({ onFilesSelected, isUploading = false }) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateAndPassFiles = (fileList: FileList | File[]) => {
    setErrorMsg(null);
    const files = Array.from(fileList);
    if (files.length === 0) return;

    // Check size limit (100 MB per file)
    const MAX_SIZE = 100 * 1024 * 1024;
    const oversized = files.find((f) => f.size > MAX_SIZE);
    if (oversized) {
      setErrorMsg(`File ${oversized.name} exceeds 100 MB limit.`);
      return;
    }

    onFilesSelected(files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndPassFiles(e.dataTransfer.files);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      inputRef.current?.click();
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={handleKeyDown}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        style={{
          position: 'relative',
          border: isDragOver ? '1px solid var(--signal)' : '1px dashed var(--line-strong)',
          backgroundColor: isDragOver ? 'var(--bg-2)' : 'var(--bg-1)',
          boxShadow: isDragOver ? 'var(--glow-signal)' : 'inset 0 1px 0 rgba(255, 255, 255, 0.03)',
          borderRadius: 'var(--radius-6)',
          padding: '36px 20px',
          textAlign: 'center',
          cursor: isUploading ? 'wait' : 'pointer',
          outline: 'none',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '8px',
          transition: 'border-color 150ms ease, box-shadow 150ms ease, background 150ms ease',
        }}
      >
        {/* Corner Ticks */}
        <span style={{ position: 'absolute', top: -1, left: -1, width: 6, height: 6, borderTop: '2px solid rgba(255,159,28,0.6)', borderLeft: '2px solid rgba(255,159,28,0.6)', pointerEvents: 'none' }} />
        <span style={{ position: 'absolute', top: -1, right: -1, width: 6, height: 6, borderTop: '2px solid rgba(255,159,28,0.6)', borderRight: '2px solid rgba(255,159,28,0.6)', pointerEvents: 'none' }} />
        <span style={{ position: 'absolute', bottom: -1, left: -1, width: 6, height: 6, borderBottom: '2px solid rgba(255,159,28,0.6)', borderLeft: '2px solid rgba(255,159,28,0.6)', pointerEvents: 'none' }} />
        <span style={{ position: 'absolute', bottom: -1, right: -1, width: 6, height: 6, borderBottom: '2px solid rgba(255,159,28,0.6)', borderRight: '2px solid rgba(255,159,28,0.6)', pointerEvents: 'none' }} />

        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".csv,.tsv,.xlsx,.json,.ndjson,.zip"
          style={{ display: 'none' }}
          onChange={(e) => {
            if (e.target.files) validateAndPassFiles(e.target.files);
            e.target.value = '';
          }}
          disabled={isUploading}
        />

        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--signal)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" />
          <path d="M12 12v9" />
          <path d="m16 16-4-4-4 4" />
        </svg>

        <div style={{ fontFamily: 'var(--font-display)', fontSize: '15px', fontWeight: 600, color: 'var(--text-0)' }}>
          {isUploading ? 'Analyzing files…' : 'Drop your files here'}
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-2)', letterSpacing: '0.04em' }}>
          CSV · Excel · JSON · ZIP · or paste data
        </div>
      </div>

      {errorMsg && (
        <div className="mono" style={{ color: 'var(--signal)', fontSize: '12px', padding: '4px 0' }}>
          Fix: {errorMsg}
        </div>
      )}
    </div>
  );
};
