import React, { useEffect, useState, useCallback } from 'react';
import GalleryGrid from './components/GalleryGrid.jsx';
import UploadForm from './components/UploadForm.jsx';
import { fetchGalleryWithUrls } from './api_client.js';

export default function App() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadMedia = useCallback(async () => {
    try {
      const hydratedItems = await fetchGalleryWithUrls();
      setItems(hydratedItems);
    } catch (err) {
      console.error('Failed to load gallery items:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMedia();
    const timer = setInterval(loadMedia, 4000);
    return () => clearInterval(timer);
  }, [loadMedia]);

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#0b0f19',
        color: '#f8fafc',
        fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
        padding: '40px 20px',
      }}
    >
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
        {/* Header */}
        <header style={{ textAlign: 'center', marginBottom: '40px' }}>
          <h1
            style={{
              fontSize: '2.5rem',
              fontWeight: 800,
              letterSpacing: '-0.03em',
              margin: '0 0 8px 0',
              background: 'linear-gradient(135deg, #60a5fa 0%, #a855f7 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            AuraDrive
          </h1>
          <p style={{ margin: 0, color: '#94a3b8', fontSize: '1rem', fontWeight: 400 }}>
            Event-driven cloud media storage & automated thumbnail processing
          </p>
        </header>

        {/* Upload Container */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '50px' }}>
          <UploadForm onUploadSuccess={loadMedia} />
        </div>

        {/* Gallery Section */}
        <section>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '20px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              paddingBottom: '12px',
            }}
          >
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#e2e8f0', margin: 0 }}>
              Media Library
            </h2>
            <span
              style={{
                fontSize: '0.85rem',
                color: '#94a3b8',
                background: 'rgba(255, 255, 255, 0.06)',
                padding: '4px 10px',
                borderRadius: '20px',
              }}
            >
              {items.length} {items.length === 1 ? 'item' : 'items'}
            </span>
          </div>

          {loading && items.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: '#64748b' }}>
              Loading media files...
            </div>
          ) : (
            <GalleryGrid items={items} />
          )}
        </section>
      </div>
    </div>
  );
}