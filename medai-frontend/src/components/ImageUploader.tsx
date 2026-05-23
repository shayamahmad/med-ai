import React, { useCallback, useState, useRef } from 'react';

interface Props { onFile: (file: File) => void; accept?: string; label?: string; }

const UploadIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="rgba(0,229,255,0.5)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="16 16 12 12 8 16" />
    <line x1="12" y1="12" x2="12" y2="21" />
    <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
  </svg>
);

const ImageUploader: React.FC<Props> = ({ onFile, accept = 'image/*', label = 'Upload Medical Image' }) => {
  const [dragging, setDragging] = useState(false);
  const [preview, setPreview]   = useState<string | null>(null);
  const [fileName, setFileName] = useState('');
  const [fileSize, setFileSize] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((f: File) => {
    setPreview(URL.createObjectURL(f));
    setFileName(f.name);
    setFileSize((f.size / 1024).toFixed(1) + ' KB');
    onFile(f);
  }, [onFile]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const f = e.dataTransfer.files[0]; if (f) handleFile(f);
  }, [handleFile]);

  const handleClick = () => {
    // Reset input value so selecting the same file again still fires onChange
    if (inputRef.current) inputRef.current.value = '';
    inputRef.current?.click();
  };

  return (
    <div
      onClick={handleClick}
      onDragOver={e => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      style={{
        border: `1px dashed ${dragging ? '#00e5ff' : 'rgba(0,229,255,0.2)'}`,
        borderRadius: 12, padding: preview ? 16 : 36,
        textAlign: 'center', cursor: 'pointer',
        background: dragging ? 'rgba(0,229,255,0.04)' : 'rgba(0,8,20,0.6)',
        transition: 'all 0.2s',
        boxShadow: dragging ? '0 0 30px rgba(0,229,255,0.1), inset 0 0 30px rgba(0,229,255,0.03)' : 'none',
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        style={{ display: 'none' }}
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
      />

      {preview ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <img src={preview} alt="preview" style={{ height: 80, width: 80, borderRadius: 8, border: '1px solid rgba(0,229,255,0.15)', objectFit: 'cover' }} />
          <div style={{ textAlign: 'left', flex: 1 }}>
            <p style={{ fontSize: 14, fontWeight: 500, color: '#d0e4f0', marginBottom: 4 }}>{fileName}</p>
            <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: 'rgba(0,229,255,0.6)', marginBottom: 6 }}>{fileSize}</p>
            <p style={{ fontSize: 12, color: 'rgba(100,140,170,0.5)' }}>Click to replace</p>
          </div>
          <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(0,230,118,0.1)', border: '1px solid rgba(0,230,118,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00e676" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 56, height: 56, borderRadius: 14, background: 'rgba(0,229,255,0.05)', border: '1px solid rgba(0,229,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <UploadIcon />
          </div>
          <div>
            <p style={{ fontSize: 15, fontWeight: 600, color: '#d0e4f0', marginBottom: 6 }}>{label}</p>
            <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: 'rgba(100,160,200,0.45)', letterSpacing: '0.05em' }}>
              PNG · JPG · JPEG · Drag & Drop
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageUploader;