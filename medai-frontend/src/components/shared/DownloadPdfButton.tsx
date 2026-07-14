import React from 'react';

const ACCENT = '#00e5ff';

interface Props {
  label?: string;
  onDownload: () => void | Promise<void>;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
}

const DownloadPdfButton: React.FC<Props> = ({
  label = 'Download PDF',
  onDownload,
  disabled = false,
  loading = false,
  className = 'btn-outline',
}) => (
  <button
    type="button"
    className={className}
    onClick={() => void onDownload()}
    disabled={disabled || loading}
    style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
  >
    {loading ? (
      <span className="clinical-spinner" style={{ width: 14, height: 14 }} />
    ) : (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={ACCENT} strokeWidth="2">
        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </svg>
    )}
    {loading ? 'Generating PDF…' : label}
  </button>
);

export default DownloadPdfButton;
