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
          border: isDragOver ? '2px solid var(--ink)' : '2px dashed var(--ink)',
          backgroundColor: isDragOver ? 'var(--paper-2)' : 'var(--paper)',
          padding: '48px 24px',
          textAlign: 'center',
          cursor: isUploading ? 'wait' : 'pointer',
          outline: 'none',
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
            e.target.value = '';
          }}
          disabled={isUploading}
        />

        <div className="t-head" style={{ color: 'var(--ink)', marginBottom: '8px' }}>
          {isUploading ? 'Analyzing files...' : 'Drop your files here'}
        </div>
        <div style={{ fontSize: '15px', color: 'var(--ink-2)' }}>
          CSV, Excel, JSON or ZIP. Or paste data.
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
