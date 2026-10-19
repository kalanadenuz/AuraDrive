// frontend/src/components/GalleryGrid.jsx
import React from 'react';

export default function GalleryGrid({ items = [], onSelectMedia }) {
  if (!items || items.length === 0) {
    return (
      <div className="aura-gallery-empty">
        <div className="aura-gallery-empty-icon">📂</div>
        <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#f1f5f9' }}>
          Your Gallery is Empty
        </h4>
        <p style={{ margin: '6px 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          Photos and videos you upload will automatically appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="aura-gallery-grid">
      {items.map((item) => {
        const itemId = item.media_id || item.id;
        const itemUrl = item.thumbnail_url || item.url || item.full_image_url;
        const isDone = item.status === 'done';

        return (
          <div
            key={itemId}
            className="aura-gallery-card"
            onClick={() => onSelectMedia && onSelectMedia(item)}
          >
            {/* Thumbnail Canvas */}
            <div className="aura-card-canvas">
              {itemUrl ? (
                <img
                  src={itemUrl}
                  alt={item.title || 'Photo thumbnail'}
                  loading="lazy"
                  className="aura-card-img"
                />
              ) : (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                  <div className="spinner" style={{ marginBottom: '8px' }} />
                  <div>Generating preview...</div>
                </div>
              )}

              {/* Resolution Tag */}
              {item.width && item.height && (
                <span className="aura-res-badge">
                  {item.width}×{item.height}
                </span>
              )}

              {/* Status Badge */}
              <span className={`aura-status-badge ${isDone ? 'done' : 'pending'}`}>
                {item.status || 'queued'}
              </span>
            </div>

            {/* Card Content */}
            <div className="aura-card-body">
              <h4
                className="aura-card-title"
                title={item.title}
              >
                {item.title || 'Untitled Photo'}
              </h4>

              <div className="aura-card-footer">
                <span className="aura-card-date">
                  {item.created_at ? new Date(item.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                </span>
                <span className="aura-card-inspect">
                  View Details ↗
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}