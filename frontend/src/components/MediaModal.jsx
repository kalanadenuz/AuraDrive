// frontend/src/components/MediaModal.jsx
import React from 'react';

export default function MediaModal({ item, onClose }) {
  if (!item) return null;

  const displayUrl = item.full_image_url || item.thumbnail_url || item.url;
  const isDone = item.status === 'done';

  // Format file size nicely
  const formatBytes = (bytes) => {
    if (!bytes || isNaN(bytes)) return null;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
  };

  const metadataRows = [
    { label: 'Media ID', value: item.media_id || item.id },
    { label: 'Original Name', value: item.original_filename || 'Unknown' },
    { label: 'Status', value: item.status?.toUpperCase() },
    { label: 'MIME Type', value: item.content_type || 'image/jpeg' },
    {
      label: 'Resolution',
      value: item.width && item.height ? `${item.width} × ${item.height} px` : null,
    },
    {
      label: 'Aspect Ratio',
      value:
        item.width && item.height
          ? `${(item.width / Math.gcd(item.width, item.height)).toFixed(0)}:${(
              item.height / Math.gcd(item.width, item.height)
            ).toFixed(0)}`
          : null,
    },
    { label: 'File Size', value: formatBytes(item.file_size_bytes) },
    { label: 'Format Output', value: item.format || 'WEBP (Lossless/Optimized)' },
    {
      label: 'Uploaded At',
      value: item.created_at ? new Date(item.created_at).toLocaleString() : null,
    },
    { label: 'Raw S3 Key', value: item.raw_s3_key },
    { label: 'Thumbnail S3 Key', value: item.thumbnail_s3_key || 'Pending generation' },
  ];

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(5, 8, 16, 0.85)',
        backdropFilter: 'blur(8px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        boxSizing: 'border-box',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '1050px',
          maxHeight: '90vh',
          backgroundColor: '#0f172a',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: '18px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 24px',
            borderBottom: '1px solid #1e293b',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#f8fafc', fontWeight: 600 }}>
              {item.title || 'Media Inspector'}
            </h2>
            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
              Isolated Workspace Node • High-Resolution View
            </span>
          </div>

          <button
            onClick={onClose}
            style={{
              background: '#1e293b',
              border: '1px solid #334155',
              color: '#94a3b8',
              borderRadius: '8px',
              padding: '6px 14px',
              cursor: 'pointer',
              fontSize: '0.9rem',
              fontWeight: 600,
            }}
          >
            ✕ Close
          </button>
        </div>

        {/* Content Body: Image Left, Metadata Right */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            flexWrap: 'wrap',
            overflowY: 'auto',
            maxHeight: 'calc(90vh - 75px)',
          }}
        >
          {/* Left Preview Pane */}
          <div
            style={{
              flex: '1 1 500px',
              backgroundColor: '#020617',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '24px',
              minHeight: '360px',
            }}
          >
            {displayUrl ? (
              <img
                src={displayUrl}
                alt={item.title}
                style={{
                  maxWidth: '100%',
                  maxHeight: '70vh',
                  objectFit: 'contain',
                  borderRadius: '10px',
                  boxShadow: '0 15px 30px rgba(0,0,0,0.5)',
                }}
              />
            ) : (
              <p style={{ color: '#64748b' }}>Processing full image...</p>
            )}
          </div>

          {/* Right Metadata Inspector Pane */}
          <div
            style={{
              flex: '1 1 350px',
              padding: '24px',
              backgroundColor: '#0f172a',
              borderLeft: '1px solid #1e293b',
              boxSizing: 'border-box',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 style={{ margin: 0, fontSize: '1rem', color: '#e2e8f0', letterSpacing: '0.03em' }}>
                Extracted Metadata
              </h3>
              <span
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  padding: '3px 8px',
                  borderRadius: '4px',
                  backgroundColor: isDone ? 'rgba(34, 197, 94, 0.15)' : 'rgba(234, 179, 8, 0.15)',
                  color: isDone ? '#4ade80' : '#facc15',
                  border: `1px solid ${isDone ? 'rgba(34, 197, 94, 0.3)' : 'rgba(234, 179, 8, 0.3)'}`,
                }}
              >
                {item.status}
              </span>
            </div>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                fontSize: '0.85rem',
              }}
            >
              {metadataRows.map(
                (row, idx) =>
                  row.value && (
                    <div
                      key={idx}
                      style={{
                        padding: '8px 10px',
                        backgroundColor: '#1e293b',
                        borderRadius: '6px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '2px',
                        wordBreak: 'break-all',
                      }}
                    >
                      <span style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase' }}>
                        {row.label}
                      </span>
                      <span style={{ color: '#cbd5e1', fontFamily: 'monospace', fontSize: '0.82rem' }}>
                        {row.value}
                      </span>
                    </div>
                  )
              )}
            </div>

            {/* Direct Link */}
            {displayUrl && (
              <a
                href={displayUrl}
                target="_blank"
                rel="noreferrer"
                style={{
                  marginTop: 'auto',
                  display: 'inline-block',
                  textAlign: 'center',
                  padding: '10px 14px',
                  backgroundColor: '#2563eb',
                  color: '#fff',
                  textDecoration: 'none',
                  borderRadius: '8px',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                }}
              >
                Open Original in New Tab ↗
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Math helper for aspect ratios
Math.gcd = function (a, b) {
  return b ? Math.gcd(b, a % b) : Math.abs(a);
};