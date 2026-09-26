import React from 'react';

export default function GalleryGrid({ items }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
        gap: '16px',
      }}
    >
      {items.map((item) => (
        <div key={item.id}>
          <img
            src={item.url}
            alt={item.title}
            style={{ width: '100%' }}
          />
          <p>{item.title}</p>
        </div>
      ))}
    </div>
  );
}