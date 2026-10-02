import React, { useRef, useState } from 'react';
import { UploadCloud, FileSpreadsheet, AlertCircle } from 'lucide-react';

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
          border: `2px dashed ${isDragOver ? 'var(--accent)' : 'var(--line-strong)'}`,
          backgroundColor: isDragOver ? 'var(--accent-muted)' : 'var(--surface)',
          borderRadius: 'var(--radius)',
          padding: '40px 24px',
          textAlign: 'center',
          cursor: isUploading ? 'wait' : 'pointer',
          transition: 'border-color 120ms ease, background-color 120ms ease, transform 120ms ease',
          transform: isDragOver ? 'scale(1.005)' : 'none',
          outline: 'none',
          position: 'relative',
        }}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".csv,.tsv,.xlsx,.json,.ndjson,.zip"
          style={{ display: 'none' }}
          onChange={(e) => {
            if (e.target.files) validateAndPassFiles(e.target.files);
            // Reset input so re-selecting same file triggers event
            e.target.value = '';
          }}
          disabled={isUploading}
        />

        <div
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            backgroundColor: isDragOver ? 'var(--surface)' : 'var(--surface-raised)',
            border: '1px solid var(--line)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px auto',
          }}
        >
          {isUploading ? (
            <div className="skeleton" style={{ width: '20px', height: '20px', borderRadius: '50%' }} />
          ) : (
            <UploadCloud size={24} color={isDragOver ? 'var(--accent)' : 'var(--ink-2)'} />
          )}
        </div>

        <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--ink)', marginBottom: '4px' }}>
          {isUploading ? 'Analyzing files & detecting schema...' : 'Drag & drop bank files here'}
        </div>
        <p style={{ fontSize: '12px', color: 'var(--ink-2)', marginBottom: '14px', maxWidth: '440px', margin: '0 auto 14px auto' }}>
          Drop transactions and optional accounts records together. Supports <span className="mono">.csv</span>, <span className="mono">.tsv</span>, <span className="mono">.xlsx</span>, <span className="mono">.json</span>, or compressed <span className="mono">.zip</span> archives.
        </p>

        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              padding: '6px 14px',
              backgroundColor: 'var(--surface-raised)',
              border: '1px solid var(--line)',
              borderRadius: 'var(--radius-sm)',
              fontSize: '12px',
              fontWeight: 500,
              color: 'var(--ink)',
            }}
          >
            Browse files
          </span>
          <span style={{ fontSize: '11px', color: 'var(--ink-3)' }}>Max 100 MB per file</span>
        </div>
      </div>

      {errorMsg && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '12px',
            color: 'var(--risk-high)',
            padding: '8px 12px',
            backgroundColor: 'var(--surface-raised)',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--line)',
          }}
        >
          <AlertCircle size={14} />
          <span>{errorMsg}</span>
        </div>
      )}
    </div>
  );
};
