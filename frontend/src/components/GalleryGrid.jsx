// frontend/src/components/GalleryGrid.jsx
import React from 'react';

export default function GalleryGrid({ items = [], onSelectMedia }) {
  if (!items || items.length === 0) {
    return (
      <div
        style={{
          textAlign: 'center',
          padding: '80px 24px',
          background: 'var(--bg-card)',
          border: '1px dashed var(--border-subtle)',
          borderRadius: '20px',
          backdropFilter: 'blur(12px)',
        }}
      >
        <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>📂</div>
        <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#f1f5f9' }}>
          Your Isolated Space is Empty
        </h4>
        <p style={{ margin: '6px 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          Files uploaded to your account will automatically synchronize and populate here.
        </p>
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
        gap: '24px',
      }}
    >
      {items.map((item) => {
        const itemId = item.media_id || item.id;
        const itemUrl = item.thumbnail_url || item.url || item.full_image_url;
        const isDone = item.status === 'done';

        return (
          <div
            key={itemId}
            onClick={() => onSelectMedia && onSelectMedia(item)}
            style={{
              background: 'var(--bg-card)',
              borderRadius: '16px',
              border: '1px solid var(--border-subtle)',
              overflow: 'hidden',
              boxShadow: '0 12px 25px -5px rgba(0, 0, 0, 0.4)',
              display: 'flex',
              flexDirection: 'column',
              cursor: 'pointer',
              transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
              position: 'relative',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-6px)';
              e.currentTarget.style.borderColor = 'var(--border-bright)';
              e.currentTarget.style.boxShadow = '0 20px 35px -5px rgba(99, 102, 241, 0.25)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.borderColor = 'var(--border-subtle)';
              e.currentTarget.style.boxShadow = '0 12px 25px -5px rgba(0, 0, 0, 0.4)';
            }}
          >
            {/* Thumbnail Canvas */}
            <div
              style={{
                width: '100%',
                aspectRatio: '4 / 3',
                background: '#070b14',
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
              }}
            >
              {itemUrl ? (
                <img
                  src={itemUrl}
                  alt={item.title || 'Media thumbnail'}
                  loading="lazy"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    transition: 'transform 0.4s ease',
                  }}
                  onMouseEnter={(e) => (e.target.style.transform = 'scale(1.05)')}
                  onMouseLeave={(e) => (e.target.style.transform = 'scale(1)')}
                />
              ) : (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                  <div className="spinner" style={{ marginBottom: '8px' }} />
                  <div>Optimizing WebP...</div>
                </div>
              )}

              {/* Resolution Tag */}
              {item.width && item.height && (
                <span
                  style={{
                    position: 'absolute',
                    bottom: '8px',
                    left: '8px',
                    background: 'rgba(0,0,0,0.65)',
                    backdropFilter: 'blur(8px)',
                    color: '#e2e8f0',
                    fontSize: '0.68rem',
                    fontFamily: 'var(--font-mono)',
                    padding: '3px 7px',
                    borderRadius: '6px',
                  }}
                >
                  {item.width}×{item.height}
                </span>
              )}

              {/* Status Badge */}
              <span
                style={{
                  position: 'absolute',
                  top: '8px',
                  right: '8px',
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  padding: '3px 8px',
                  borderRadius: '6px',
                  background: isDone ? 'var(--badge-done-bg)' : 'var(--badge-proc-bg)',
                  border: `1px solid ${isDone ? 'var(--badge-done-border)' : 'var(--badge-proc-border)'}`,
                  color: isDone ? 'var(--badge-done-text)' : 'var(--badge-proc-text)',
                  backdropFilter: 'blur(8px)',
                }}
              >
                {item.status || 'queued'}
              </span>
            </div>

            {/* Card Content */}
            <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <h4
                style={{
                  margin: 0,
                  fontSize: '0.95rem',
                  fontWeight: 700,
                  color: '#f8fafc',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
                title={item.title}
              >
                {item.title || 'Untitled Asset'}
              </h4>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
                  {item.created_at ? new Date(item.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                </span>
                <span style={{ fontSize: '0.75rem', color: '#818cf8', fontWeight: 600 }}>
                  Inspect ↗
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}