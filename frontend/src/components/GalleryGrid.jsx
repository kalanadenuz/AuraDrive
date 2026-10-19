// frontend/src/components/GalleryGrid.jsx
import React from 'react';

export default function GalleryGrid({ items = [], onSelectMedia }) {
  if (!items || items.length === 0) {
    return (
      <div
        style={{
          textAlign: 'center',
          padding: '60px 20px',
          backgroundColor: 'rgba(30, 41, 59, 0.3)',
          border: '1px dashed #334155',
          borderRadius: '16px',
          color: '#64748b',
        }}
      >
        <p style={{ margin: 0, fontSize: '0.95rem' }}>
          No media found. Upload an image above to get started!
        </p>
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
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
              backgroundColor: '#1e293b',
              borderRadius: '12px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              overflow: 'hidden',
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)',
              display: 'flex',
              flexDirection: 'column',
              cursor: 'pointer',
              transition: 'transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.borderColor = '#3b82f6';
              e.currentTarget.style.boxShadow = '0 14px 20px -3px rgba(59, 130, 246, 0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
              e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.3)';
            }}
          >
            {/* Image Preview Container */}
            <div
              style={{
                width: '100%',
                aspectRatio: '1 / 1',
                backgroundColor: '#0f172a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                position: 'relative',
              }}
            >
              {itemUrl ? (
                <img
                  src={itemUrl}
                  alt={item.title || 'Thumbnail'}
                  loading="lazy"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  }}
                />
              ) : (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '8px',
                    color: '#64748b',
                    fontSize: '0.85rem',
                  }}
                >
                  <div
                    style={{
                      width: '24px',
                      height: '24px',
                      border: '2px solid #3b82f6',
                      borderTopColor: 'transparent',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite',
                    }}
                  />
                  <span>Generating WebP...</span>
                </div>
              )}

              {/* Hover overlay hint */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  backgroundColor: 'rgba(15, 23, 42, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: 0,
                  transition: 'opacity 0.2s ease',
                  color: '#fff',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  backdropFilter: 'blur(2px)',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = '0')}
              >
                🔍 Click to Inspect
              </div>
            </div>

            {/* Metadata Footer */}
            <div
              style={{
                padding: '14px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderTop: '1px solid rgba(255, 255, 255, 0.05)',
              }}
            >
              <div style={{ overflow: 'hidden', marginRight: '10px' }}>
                <p
                  style={{
                    margin: 0,
                    fontWeight: 600,
                    fontSize: '0.95rem',
                    color: '#f1f5f9',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                  title={item.title}
                >
                  {item.title || 'Untitled'}
                </p>
                {item.created_at && (
                  <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', color: '#64748b' }}>
                    {new Date(item.created_at).toLocaleDateString([], {
                      month: 'short',
                      day: 'numeric',
                    })}{' '}
                    •{' '}
                    {new Date(item.created_at).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                )}
              </div>

              {item.status && (
                <span
                  style={{
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    letterSpacing: '0.05em',
                    textTransform: 'uppercase',
                    padding: '4px 8px',
                    borderRadius: '6px',
                    backgroundColor: isDone
                      ? 'rgba(34, 197, 94, 0.15)'
                      : 'rgba(234, 179, 8, 0.15)',
                    color: isDone ? '#4ade80' : '#facc15',
                    border: `1px solid ${
                      isDone ? 'rgba(34, 197, 94, 0.3)' : 'rgba(234, 179, 8, 0.3)'
                    }`,
                  }}
                >
                  {item.status}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}