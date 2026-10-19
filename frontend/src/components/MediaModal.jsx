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
    { label: 'File ID', val: item.media_id || item.id },
    { label: 'Status', val: item.status?.toUpperCase() },
    { label: 'Dimensions', val: item.width && item.height ? `${item.width} × ${item.height} px` : null },
    { label: 'Aspect Ratio', val: item.aspect_ratio || null },
    { label: 'File Size', val: formatBytes(item.file_size_bytes) },
    { label: 'Format', val: item.media_format || item.format || 'WEBP' },
    { label: 'Cloud Storage Path', val: item.raw_s3_key },
    { label: 'Preview Thumbnail Path', val: item.thumbnail_s3_key },
    { label: 'Date Added', val: item.created_at ? new Date(item.created_at).toLocaleString() : null },
  ];

  return (
    <div className="aura-modal-overlay" onClick={onClose}>
      <div className="aura-modal-dialog" onClick={(e) => e.stopPropagation()}>
        {/* Modal Top Header */}
        <div className="aura-modal-header">
          <div>
            <h2 className="aura-modal-title">
              {item.title || 'Photo Details'}
            </h2>
            <p className="aura-modal-subtitle">
              Storage Account: <code>{item.user_id ? item.user_id.slice(0, 8) : 'Personal Space'}</code>
            </p>
          </div>

          <button onClick={onClose} className="aura-modal-dismiss">
            ✕ Close
          </button>
        </div>

        {/* Modal Body: Left Image / Right Inspector */}
        <div className="aura-modal-body">
          {/* High-res Image Preview */}
          <div className="aura-modal-image-col">
            {displayUrl ? (
              <img
                src={displayUrl}
                alt={item.title}
                className="aura-modal-img"
              />
            ) : (
              <p style={{ color: 'var(--text-dim)' }}>Loading photo preview...</p>
            )}
          </div>

          {/* Metadata Inspector Sidebar */}
          <div className="aura-modal-meta-col">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#f1f5f9', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                File Details
              </span>
              <span className={`aura-status-badge ${isDone ? 'done' : 'pending'}`} style={{ position: 'static' }}>
                {item.status}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {metadataList.map(
                (row, i) =>
                  row.val && (
                    <div key={i} className="aura-meta-chip">
                      <span className="aura-meta-chip-label">
                        {row.label}
                      </span>
                      <span className="aura-meta-chip-val">
                        {row.val}
                      </span>
                    </div>
                  )
              )}
            </div>

            {/* EXIF Information block if present */}
            {item.exif && Object.keys(item.exif).length > 0 && (
              <div style={{ marginTop: '10px' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Camera & Photo Info
                </span>
                <div className="aura-exif-grid">
                  {Object.entries(item.exif).slice(0, 6).map(([k, v], idx) => (
                    <div key={idx} className="aura-exif-item">
                      <div className="aura-exif-item-key">{k}</div>
                      <div className="aura-exif-item-val">{String(v)}</div>
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
                className="aura-btn-primary"
                style={{
                  marginTop: 'auto',
                  textAlign: 'center',
                  padding: '13px',
                }}
              >
                View Full Resolution ↗
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}