// frontend/src/components/MediaModal.jsx
import React from 'react';

export default function MediaModal({ item, onClose }) {
  if (!item) return null;

  const displayUrl = item.full_image_url || item.thumbnail_url || item.url;
  const isDone = item.status === 'done';

  const formatBytes = (bytes) => {
    if (!bytes || isNaN(bytes)) return '—';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
  };

  const metadataList = [
    { label: 'Media Identifier', val: item.media_id || item.id },
    { label: 'Storage Status', val: item.status?.toUpperCase() },
    { label: 'True Dimensions', val: item.width && item.height ? `${item.width} × ${item.height} px` : null },
    { label: 'Aspect Ratio', val: item.aspect_ratio || null },
    { label: 'Original Size', val: formatBytes(item.file_size_bytes) },
    { label: 'Processed Format', val: item.media_format || item.format || 'WEBP' },
    { label: 'Raw S3 Location', val: item.raw_s3_key },
    { label: 'Processed S3 Key', val: item.thumbnail_s3_key },
    { label: 'Sync Timestamp', val: item.created_at ? new Date(item.created_at).toLocaleString() : null },
  ];

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(3, 7, 18, 0.88)',
        backdropFilter: 'blur(12px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '1100px',
          maxHeight: '92vh',
          background: 'rgba(15, 23, 42, 0.95)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '24px',
          boxShadow: '0 30px 70px -15px rgba(0, 0, 0, 0.8)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Modal Top Header */}
        <div
          style={{
            padding: '18px 28px',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#f8fafc' }}>
              {item.title || 'Media Asset Details'}
            </h2>
            <p style={{ margin: '3px 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Tenant Partition Key: <code style={{ color: '#818cf8', fontFamily: 'var(--font-mono)' }}>USER#{item.user_id || 'isolated'}</code>
            </p>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid var(--border-subtle)',
              color: '#94a3b8',
              borderRadius: '10px',
              padding: '8px 14px',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.85rem',
            }}
          >
            ✕ Dismiss
          </button>
        </div>

        {/* Modal Body: Left Image / Right Inspector */}
        <div style={{ display: 'flex', flexWrap: 'wrap', overflowY: 'auto' }}>
          {/* High-res Image Preview */}
          <div
            style={{
              flex: '1 1 520px',
              minHeight: '400px',
              background: '#040711',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '24px',
            }}
          >
            {displayUrl ? (
              <img
                src={displayUrl}
                alt={item.title}
                style={{
                  maxWidth: '100%',
                  maxHeight: '68vh',
                  objectFit: 'contain',
                  borderRadius: '12px',
                  boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
                }}
              />
            ) : (
              <p style={{ color: 'var(--text-dim)' }}>Generating media preview...</p>
            )}
          </div>

          {/* Metadata Inspector Sidebar */}
          <div
            style={{
              flex: '1 1 360px',
              padding: '28px',
              background: 'rgba(15, 23, 42, 0.6)',
              borderLeft: '1px solid var(--border-subtle)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#f1f5f9', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                Pipeline Metadata
              </span>
              <span
                style={{
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  padding: '3px 8px',
                  borderRadius: '6px',
                  background: isDone ? 'var(--badge-done-bg)' : 'var(--badge-proc-bg)',
                  border: `1px solid ${isDone ? 'var(--badge-done-border)' : 'var(--badge-proc-border)'}`,
                  color: isDone ? 'var(--badge-done-text)' : 'var(--badge-proc-text)',
                }}
              >
                {item.status}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {metadataList.map(
                (row, i) =>
                  row.val && (
                    <div
                      key={i}
                      style={{
                        padding: '10px 12px',
                        background: 'rgba(255, 255, 255, 0.02)',
                        border: '1px solid rgba(255, 255, 255, 0.04)',
                        borderRadius: '8px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '2px',
                      }}
                    >
                      <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {row.label}
                      </span>
                      <span style={{ color: '#cbd5e1', fontSize: '0.82rem', fontFamily: 'var(--font-mono)', wordBreak: 'break-all' }}>
                        {row.val}
                      </span>
                    </div>
                  )
              )}
            </div>

            {/* EXIF Information block if present */}
            {item.exif && Object.keys(item.exif).length > 0 && (
              <div style={{ marginTop: '10px' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#818cf8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Camera & Exposure EXIF
                </span>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginTop: '8px' }}>
                  {Object.entries(item.exif).slice(0, 6).map(([k, v], idx) => (
                    <div key={idx} style={{ padding: '6px 8px', background: 'rgba(255,255,255,0.02)', borderRadius: '6px' }}>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)' }}>{k}</div>
                      <div style={{ fontSize: '0.78rem', color: '#e2e8f0', fontFamily: 'var(--font-mono)' }}>{String(v)}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {displayUrl && (
              <a
                href={displayUrl}
                target="_blank"
                rel="noreferrer"
                style={{
                  marginTop: 'auto',
                  textAlign: 'center',
                  padding: '12px',
                  background: 'var(--accent-gradient)',
                  color: '#fff',
                  borderRadius: '10px',
                  fontWeight: 600,
                  fontSize: '0.88rem',
                  textDecoration: 'none',
                }}
              >
                Inspect Raw Asset ↗
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}